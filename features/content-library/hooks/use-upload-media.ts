import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { mediaKeys, uploadQueue, type QueuedUpload, type UploadFile, type UploadMeta } from '@/lib/api';
import { mapApiError } from '@/lib/errors';
import { log } from '@/lib/log';
import { useToast } from '@/lib/toast';

export function useUploadQueue(): QueuedUpload[] {
  const [items, setItems] = useState<QueuedUpload[]>(() => uploadQueue.list());
  const queryClient = useQueryClient();
  const toast = useToast();
  const errorToastIds = useRef(new Set<string>());

  useEffect(() => {
    let lastSeenSuccess = new Set(
      uploadQueue.list().filter((it) => it.status === 'success').map((it) => it.id),
    );
    return uploadQueue.subscribe((next) => {
      setItems(next);
      next.forEach((it) => {
        if (it.status === 'pending' || it.status === 'uploading') {
          errorToastIds.current.delete(it.id);
        }
      });
      const newSuccesses = next.filter(
        (it) => it.status === 'success' && !lastSeenSuccess.has(it.id),
      );
      if (newSuccesses.length > 0) {
        try {
          void queryClient.invalidateQueries({ queryKey: mediaKeys.lists() });
          newSuccesses.forEach((it) => {
            toast.show({
              level: 'success',
              title: 'Upload complete',
              message: it.result?.title || it.result?.original_filename || 'Your media is ready.',
            });
          });
        } catch (e) {
          log.error('upload invalidation', e);
        }
      }
      const newErrors = next.filter((it) => {
        if (it.status !== 'error' || !it.error || errorToastIds.current.has(it.id)) return false;
        errorToastIds.current.add(it.id);
        return true;
      });
      newErrors.forEach((it) => {
        const ux = mapApiError(it.error);
        toast.show({ level: ux.level, title: ux.title, message: ux.message });
      });
      lastSeenSuccess = new Set(next.filter((it) => it.status === 'success').map((it) => it.id));
    });
  }, [queryClient, toast]);

  return items;
}

export function enqueueUpload(file: UploadFile, meta: UploadMeta = {}): QueuedUpload {
  return uploadQueue.enqueue(file, meta);
}

export function cancelUpload(id: string) {
  uploadQueue.cancel(id);
}

export function retryUpload(id: string) {
  uploadQueue.retry(id);
}

export function removeUpload(id: string) {
  uploadQueue.remove(id);
}

export function clearCompletedUploads() {
  uploadQueue.clearCompleted();
}
