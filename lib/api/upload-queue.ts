import { config } from '../config';
import { readApiKeyFromMemory } from '../auth/auth-provider';
import { ApiError, type MediaItem } from '../types';
import { log } from '../log';
import { uploadWithProgress, type UploadFile, type UploadMeta } from './upload';

export type QueuedStatus = 'pending' | 'uploading' | 'success' | 'error' | 'cancelled';

export interface QueuedUpload {
  id: string;
  file: UploadFile;
  meta: UploadMeta;
  apiKey?: string;
  status: QueuedStatus;
  percent: number;
  error?: ApiError;
  result?: MediaItem;
  retryAt?: number;
}

type Listener = (items: QueuedUpload[]) => void;

const WINDOW_MS = 60_000;

class UploadQueue {
  private items: QueuedUpload[] = [];
  private listeners = new Set<Listener>();
  private completedAt: number[] = [];
  private running = false;
  private aborts = new Map<string, AbortController>();

  enqueue(file: UploadFile, meta: UploadMeta = {}): QueuedUpload {
    const item: QueuedUpload = {
      id: this.generateId(),
      file,
      meta,
      apiKey: readApiKeyFromMemory() ?? undefined,
      status: 'pending',
      percent: 0,
    };
    this.items = [...this.items, item];
    this.emit();
    void this.run();
    return item;
  }

  cancel(id: string) {
    const ctrl = this.aborts.get(id);
    if (ctrl) ctrl.abort();
    const found = this.items.find((it) => it.id === id);
    if (!found) return;
    if (found.status === 'pending' || found.status === 'uploading') {
      this.update(id, { status: 'cancelled' });
    }
  }

  retry(id: string) {
    const found = this.items.find((it) => it.id === id);
    if (!found) return;
    if (found.status !== 'error' && found.status !== 'cancelled') return;
    this.update(id, { status: 'pending', percent: 0, error: undefined, retryAt: undefined });
    void this.run();
  }

  remove(id: string) {
    this.items = this.items.filter((it) => it.id !== id);
    this.emit();
  }

  clearCompleted() {
    this.items = this.items.filter((it) => it.status !== 'success');
    this.emit();
  }

  list(): QueuedUpload[] {
    return this.items;
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    listener(this.items);
    return () => this.listeners.delete(listener);
  }

  private emit() {
    const snapshot = this.items;
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (e) {
        log.error('upload-queue listener', e);
      }
    });
  }

  private update(id: string, patch: Partial<QueuedUpload>) {
    let changed = false;
    this.items = this.items.map((it) => {
      if (it.id !== id) return it;
      changed = true;
      return { ...it, ...patch };
    });
    if (changed) this.emit();
  }

  private generateId(): string {
    return `up_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  }

  private waitForToken(): Promise<void> {
    const limit = config.MEDIA_UPLOAD_LIMIT_PER_MINUTE;
    const now = Date.now();
    this.completedAt = this.completedAt.filter((t) => now - t < WINDOW_MS);
    if (this.completedAt.length < limit) return Promise.resolve();
    const oldest = this.completedAt[0];
    const wait = WINDOW_MS - (now - oldest) + 50;
    return new Promise((resolve) => setTimeout(resolve, wait));
  }

  private waitUntil(timestamp: number): Promise<void> {
    const wait = Math.max(0, timestamp - Date.now());
    if (wait === 0) return Promise.resolve();
    return new Promise((resolve) => setTimeout(resolve, wait));
  }

  private nextPending(): QueuedUpload | undefined {
    const now = Date.now();
    return this.items.find((it) => it.status === 'pending' && (!it.retryAt || it.retryAt <= now));
  }

  private nextRetryAt(): number | undefined {
    const pendingRetryTimes = this.items
      .filter((it) => it.status === 'pending' && it.retryAt && it.retryAt > Date.now())
      .map((it) => it.retryAt as number);
    return pendingRetryTimes.length > 0 ? Math.min(...pendingRetryTimes) : undefined;
  }

  private async run() {
    if (this.running) return;
    this.running = true;
    try {
      while (true) {
        let next = this.nextPending();
        if (!next) {
          const retryAt = this.nextRetryAt();
          if (!retryAt) break;
          await this.waitUntil(retryAt);
          next = this.nextPending();
        }
        if (!next) break;
        await this.waitForToken();

        const current = this.items.find((it) => it.id === next.id);
        if (!current || current.status !== 'pending') continue;

        this.update(next.id, { status: 'uploading' });
        const ctrl = new AbortController();
        this.aborts.set(next.id, ctrl);
        try {
          const result = await uploadWithProgress(next.file, {
            meta: next.meta,
            apiKey: next.apiKey,
            signal: ctrl.signal,
            onProgress: (p) => {
              this.update(next.id, { percent: p.percent });
            },
          });
          this.completedAt.push(Date.now());
          this.update(next.id, { status: 'success', percent: 100, result });
        } catch (err) {
          if (err instanceof ApiError) {
            const retryAt =
              err.code === 'RATE_LIMITED' && err.retry_after_seconds
                ? Date.now() + err.retry_after_seconds * 1000
                : undefined;
            this.update(next.id, {
              status:
                err.code === 'RATE_LIMITED' && retryAt
                  ? 'pending'
                  : err.code === 'NETWORK_ERROR' && ctrl.signal.aborted
                    ? 'cancelled'
                    : 'error',
              error: err,
              retryAt,
            });
          } else {
            log.error('upload-queue unexpected error', err);
            this.update(next.id, { status: 'error' });
          }
        } finally {
          this.aborts.delete(next.id);
        }
      }
    } finally {
      this.running = false;
    }
  }
}

export const uploadQueue = new UploadQueue();
