import { useRouter } from 'expo-router';
import { useMemo, useRef, useState } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import type { QueuedStatus, QueuedUpload, UploadFile, UploadMeta } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { config, isAllowedMimetype, maxUploadBytes } from '@/lib/config';
import { mapApiError } from '@/lib/errors';
import { formatBytes } from '@/lib/format/bytes';
import { uploadMetaSchema } from '@/lib/schemas';
import { getToken } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import type { Visibility } from '@/lib/types';

import { ProgressBar } from '../components/progress-bar';
import { UploadButton } from '../components/upload-button';
import { UploadDropzone } from '../components/upload-dropzone';
import {
  cancelUpload,
  enqueueUpload,
  removeUpload,
  retryUpload,
  useUploadQueue,
} from '../hooks/use-upload-media';

interface DraftItem {
  id: string;
  file: UploadFile;
  name: string;
  size: number;
  mimeType: string;
  meta: UploadMeta;
  enqueued: boolean;
}

const VISIBILITIES: Visibility[] = ['private', 'unlisted', 'public'];

function fileMeta(file: UploadFile): { name: string; size: number; mimeType: string } {
  if (typeof File !== 'undefined' && file instanceof File) {
    return { name: file.name, size: file.size, mimeType: file.type || 'application/octet-stream' };
  }
  if (typeof Blob !== 'undefined' && file instanceof Blob) {
    return {
      name: 'blob',
      size: (file as Blob).size ?? 0,
      mimeType: file.type || 'application/octet-stream',
    };
  }
  const native = file as { uri: string; name: string; mimeType: string; size?: number };
  return { name: native.name, size: native.size ?? 0, mimeType: native.mimeType };
}

function makeDraftId(): string {
  return `dr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function shouldPreflightRejectMimetype(mime: string): boolean {
  return Boolean(mime) && mime !== 'application/octet-stream' && !isAllowedMimetype(mime);
}

function statusLabel(status: QueuedStatus): string {
  switch (status) {
    case 'pending':
      return 'Queued';
    case 'uploading':
      return 'Uploading…';
    case 'success':
      return 'Uploaded';
    case 'error':
      return 'Failed';
    case 'cancelled':
      return 'Cancelled';
  }
}

export function UploadScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const { apiKey } = useAuth();
  const toast = useToast();
  const [drafts, setDrafts] = useState<DraftItem[]>([]);
  const flushingRef = useRef(false);
  const queueItems = useUploadQueue();

  const cardBg = getToken(scheme, 'bgCard');
  const pageBg = getToken(scheme, 'bgPage');
  const border = getToken(scheme, 'border');
  const accentDanger = getToken(scheme, 'accentDanger');
  const accent = getToken(scheme, 'accentUpload');
  const tertiary = getToken(scheme, 'textTertiary');

  const myQueueItems = useMemo<QueuedUpload[]>(() => queueItems, [queueItems]);

  if (!apiKey) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: pageBg }]}>
        <SafeAreaView style={styles.center}>
          <ThemedText type="title">Sign in first</ThemedText>
          <ThemedText style={styles.center}>
            Add your API key in Settings before uploading.
          </ThemedText>
          <Pressable
            onPress={() => router.replace('/settings')}
            style={[styles.cta, { backgroundColor: accent }]}>
            <ThemedText type="defaultSemiBold" lightColor="#ffffff" darkColor="#ffffff">
              Open Settings
            </ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const onSelected = (files: UploadFile[]) => {
    const next: DraftItem[] = [];
    for (const f of files) {
      const meta = fileMeta(f);
      if (meta.size > maxUploadBytes()) {
        toast.show({
          level: 'warning',
          title: 'File too big',
          message: `${meta.name} is ${formatBytes(meta.size)}. Max is ${config.MEDIA_MAX_SIZE_MB} MB.`,
        });
        continue;
      }
      if (shouldPreflightRejectMimetype(meta.mimeType)) {
        toast.show({
          level: 'warning',
          title: 'Unsupported file',
          message: `${meta.name} (${meta.mimeType || 'unknown'}) is not in the allowlist.`,
        });
        continue;
      }
      next.push({
        id: makeDraftId(),
        file: f,
        name: meta.name,
        size: meta.size,
        mimeType: meta.mimeType,
        meta: { title: meta.name.replace(/\.[^.]+$/, ''), description: '', visibility: 'private' },
        enqueued: false,
      });
    }
    if (next.length > 0) {
      setDrafts((cur) => [...cur, ...next]);
    }
  };

  const updateDraft = (id: string, patch: Partial<DraftItem['meta']>) => {
    setDrafts((cur) =>
      cur.map((d) => (d.id === id ? { ...d, meta: { ...d.meta, ...patch } } : d)),
    );
  };

  const removeDraft = (id: string) => {
    setDrafts((cur) => cur.filter((d) => d.id !== id));
  };

  const startUpload = () => {
    if (flushingRef.current) return;
    const pending = drafts.filter((d) => !d.enqueued);
    if (pending.length === 0) {
      toast.show({ level: 'info', title: 'Nothing to upload', message: 'Pick a file first.' });
      return;
    }
    const valid: DraftItem[] = [];
    for (const draft of pending) {
      const parsed = uploadMetaSchema.safeParse(draft.meta);
      if (!parsed.success) {
        toast.show({
          level: 'warning',
          title: `Check ${draft.name}`,
          message: parsed.error.issues[0]?.message ?? 'Metadata is invalid.',
        });
        continue;
      }
      valid.push({ ...draft, meta: parsed.data });
    }
    if (valid.length === 0) return;
    flushingRef.current = true;
    setDrafts((cur) =>
      cur.map((d) => (valid.some((v) => v.id === d.id) ? { ...d, enqueued: true } : d)),
    );
    valid.forEach((d) => enqueueUpload(d.file, d.meta));
    setTimeout(() => {
      flushingRef.current = false;
    }, 0);
    toast.show({
      level: 'info',
      title: `Queued ${valid.length} file${valid.length === 1 ? '' : 's'}`,
      message: 'Uploads run sequentially under the rate limit.',
    });
  };

  const close = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/profile/me');
  };

  const hasPendingDrafts = drafts.some((d) => !d.enqueued);

  return (
    <ThemedView style={[styles.container, { backgroundColor: pageBg }]}>
      <SafeAreaView edges={Platform.OS === 'ios' ? ['top'] : ['top']} style={styles.safe}>
        <View style={styles.header}>
          <Pressable
            onPress={close}
            accessibilityLabel="Close upload"
            accessibilityRole="button"
            style={[styles.iconButton, { backgroundColor: cardBg }]}>
            <IconSymbol name="xmark" size={20} color={getToken(scheme, 'textPrimary')} />
          </Pressable>
          <ThemedText type="defaultSemiBold">New upload</ThemedText>
          <Pressable
            onPress={startUpload}
            accessibilityRole="button"
            disabled={!hasPendingDrafts}
            style={[
              styles.saveButton,
              { backgroundColor: accentDanger, opacity: hasPendingDrafts ? 1 : 0.5 },
            ]}>
            <ThemedText type="defaultSemiBold" lightColor="#ffffff" darkColor="#ffffff">
              Save
            </ThemedText>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <ThemedText style={styles.sectionLabel}>Choose files</ThemedText>
          {Platform.OS === 'web' ? (
            <UploadDropzone onSelected={onSelected} />
          ) : (
            <UploadButton onSelected={onSelected} />
          )}

          {drafts.length > 0 ? (
            <>
              <ThemedText style={styles.sectionLabel}>Per-file metadata</ThemedText>
              {drafts.map((d) => (
                <View key={d.id} style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
                  <View style={styles.fileHeader}>
                    <View style={styles.fileTitleCol}>
                      <ThemedText type="defaultSemiBold" numberOfLines={1}>
                        {d.name}
                      </ThemedText>
                      <ThemedText style={[styles.fileMeta, { color: tertiary }]}>
                        {d.mimeType} · {formatBytes(d.size)}
                      </ThemedText>
                    </View>
                    <Pressable
                      onPress={() => removeDraft(d.id)}
                      accessibilityRole="button"
                      accessibilityLabel={`Remove ${d.name}`}
                      style={[styles.iconButton, { backgroundColor: pageBg }]}>
                      <IconSymbol name="trash" size={18} color={accentDanger} />
                    </Pressable>
                  </View>

                  <ThemedText style={styles.fieldLabel}>Title</ThemedText>
                  <TextInput
                    value={d.meta.title ?? ''}
                    onChangeText={(title) => updateDraft(d.id, { title })}
                    editable={!d.enqueued}
                    placeholder={d.name.replace(/\.[^.]+$/, '')}
                    placeholderTextColor={tertiary}
                    style={[
                      styles.input,
                      { borderColor: border, color: getToken(scheme, 'textPrimary') },
                    ]}
                  />

                  <ThemedText style={styles.fieldLabel}>Description</ThemedText>
                  <TextInput
                    value={d.meta.description ?? ''}
                    onChangeText={(description) => updateDraft(d.id, { description })}
                    editable={!d.enqueued}
                    placeholder="Optional"
                    placeholderTextColor={tertiary}
                    multiline
                    style={[
                      styles.input,
                      styles.multiline,
                      { borderColor: border, color: getToken(scheme, 'textPrimary') },
                    ]}
                  />

                  <ThemedText style={styles.fieldLabel}>Visibility</ThemedText>
                  <View style={styles.visibilityRow}>
                    {VISIBILITIES.map((v) => {
                      const active = d.meta.visibility === v;
                      return (
                        <Pressable
                          key={v}
                          onPress={() => updateDraft(d.id, { visibility: v })}
                          disabled={d.enqueued}
                          accessibilityRole="radio"
                          accessibilityState={{ selected: active }}
                          style={[
                            styles.visibilityOption,
                            {
                              borderColor: active ? accent : border,
                              backgroundColor: active ? accent : 'transparent',
                            },
                          ]}>
                          <ThemedText
                            type="defaultSemiBold"
                            style={{ color: active ? '#ffffff' : getToken(scheme, 'textPrimary') }}>
                            {v[0].toUpperCase() + v.slice(1)}
                          </ThemedText>
                        </Pressable>
                      );
                    })}
                  </View>
                  {d.enqueued ? (
                    <ThemedText style={[styles.fieldValueHint, { color: tertiary }]}>
                      Already queued — edit the metadata of subsequent uploads in Settings → My
                      uploads.
                    </ThemedText>
                  ) : null}
                </View>
              ))}
            </>
          ) : null}

          {myQueueItems.length > 0 ? (
            <>
              <ThemedText style={styles.sectionLabel}>Queue</ThemedText>
              {myQueueItems.map((it) => (
                <QueueRow
                  key={it.id}
                  item={it}
                  cardBg={cardBg}
                  border={border}
                  tertiary={tertiary}
                  onCancel={() => cancelUpload(it.id)}
                  onRetry={() => retryUpload(it.id)}
                  onRemove={() => removeUpload(it.id)}
                />
              ))}
            </>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

interface QueueRowProps {
  item: QueuedUpload;
  cardBg: string;
  border: string;
  tertiary: string;
  onCancel: () => void;
  onRetry: () => void;
  onRemove: () => void;
}

function QueueRow({ item, cardBg, border, tertiary, onCancel, onRetry, onRemove }: QueueRowProps) {
  const meta = fileMeta(item.file);
  const errorUx = item.error ? mapApiError(item.error) : null;
  const isActive = item.status === 'pending' || item.status === 'uploading';
  const isFailed = item.status === 'error' || item.status === 'cancelled';
  const retrySeconds =
    item.retryAt && item.retryAt > Date.now() ? Math.ceil((item.retryAt - Date.now()) / 1000) : 0;

  return (
    <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
      <View style={styles.fileHeader}>
        <View style={styles.fileTitleCol}>
          <ThemedText type="defaultSemiBold" numberOfLines={1}>
            {meta.name}
          </ThemedText>
          <ThemedText style={[styles.fileMeta, { color: tertiary }]}>
            {item.result?.mimetype ?? statusLabel(item.status)} · {Math.round(item.percent)}%
          </ThemedText>
        </View>
        {isActive ? (
          <Pressable onPress={onCancel} accessibilityRole="button" accessibilityLabel="Cancel upload">
            <ThemedText type="defaultSemiBold" style={{ color: tertiary }}>Cancel</ThemedText>
          </Pressable>
        ) : isFailed ? (
          <View style={styles.queueActions}>
            <Pressable onPress={onRetry} accessibilityRole="button" accessibilityLabel="Retry upload">
              <ThemedText type="defaultSemiBold">Retry</ThemedText>
            </Pressable>
            <Pressable onPress={onRemove} accessibilityRole="button" accessibilityLabel="Remove from queue">
              <ThemedText type="defaultSemiBold" style={{ color: tertiary }}>Dismiss</ThemedText>
            </Pressable>
          </View>
        ) : (
          <Pressable onPress={onRemove} accessibilityRole="button" accessibilityLabel="Clear">
            <ThemedText type="defaultSemiBold" style={{ color: tertiary }}>Clear</ThemedText>
          </Pressable>
        )}
      </View>
      <ProgressBar
        percent={item.percent}
        variant={item.status === 'error' ? 'danger' : 'default'}
      />
      {errorUx ? (
        <ThemedText style={[styles.fieldValueHint, { color: tertiary }]}>
          {retrySeconds > 0
            ? `Rate limited: retrying in ${retrySeconds}s.`
            : `${errorUx.title}: ${errorUx.message}`}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
  },
  body: { padding: 16, gap: 16, paddingBottom: 64 },
  sectionLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    opacity: 0.7,
  },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 8,
  },
  fileHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  fileTitleCol: { flex: 1, gap: 2 },
  fileMeta: { fontSize: 12 },
  fieldLabel: { fontSize: 11, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 6 },
  fieldValueHint: { fontSize: 13, opacity: 0.85 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  multiline: { minHeight: 72, textAlignVertical: 'top' },
  visibilityRow: { flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap' },
  visibilityOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1,
  },
  cta: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 30 },
  queueActions: { flexDirection: 'row', gap: 12, alignItems: 'center' },
});
