import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/lib/auth';
import { mapApiError } from '@/lib/errors';
import { formatBytes } from '@/lib/format/bytes';
import { formatDateTime } from '@/lib/format/date';
import { getToken } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import { ApiError } from '@/lib/types';

import { EditMetadataModal } from '../components/edit-metadata-modal';
import { EmptyState } from '../components/empty-state';
import { MediaRenderer } from '../components/media-renderer';
import { ShareButton } from '../components/share-button';
import { VisibilityChip } from '../components/visibility-chip';
import { useDeleteMedia } from '../hooks/use-delete-media';
import { useMediaItem } from '../hooks/use-media-item';

interface SingleItemViewProps {
  id: string;
}

export function SingleItemView({ id }: SingleItemViewProps) {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const { currentUserId } = useAuth();
  const { data, error, isPending, refetch } = useMediaItem(id);
  const deleteMutation = useDeleteMedia();
  const toast = useToast();
  const [editing, setEditing] = useState(false);

  const pageBg = getToken(scheme, 'bgPage');
  const cardBg = getToken(scheme, 'bgCard');
  const textTertiary = getToken(scheme, 'textTertiary');
  const accentDanger = getToken(scheme, 'accentDanger');
  const cardBorder = getToken(scheme, 'border');

  if (isPending) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: pageBg }]}>
        <SafeAreaView edges={['top']} style={styles.center}>
          <EmptyState variant="loading" />
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (error || !data) {
    const ux = mapApiError(error);
    const code = error instanceof ApiError ? error.code : undefined;
    const title =
      code === 'UNAUTHORIZED'
        ? 'Sign in to view this item'
        : code === 'FORBIDDEN'
          ? 'Private item'
          : code === 'NOT_FOUND'
            ? 'Item not found'
            : ux.title;
    const message =
      code === 'UNAUTHORIZED'
        ? 'Add your API key in Settings, then try again.'
        : code === 'FORBIDDEN'
          ? 'This item is private and belongs to another user.'
          : code === 'NOT_FOUND'
            ? 'This media item is gone or the link is wrong.'
            : ux.message;
    return (
      <ThemedView style={[styles.container, { backgroundColor: pageBg }]}>
        <SafeAreaView edges={['top']} style={styles.center}>
          <EmptyState variant="error" title={title} message={message} />
          <Pressable
            onPress={() => refetch()}
            style={[styles.retry, { backgroundColor: accentDanger }]}>
            <ThemedText type="defaultSemiBold" lightColor="#ffffff" darkColor="#ffffff">
              Retry
            </ThemedText>
          </Pressable>
        </SafeAreaView>
      </ThemedView>
    );
  }

  const isOwner = Boolean(currentUserId && currentUserId === data.owner_id);

  const onDelete = () => {
    const proceed = async () => {
      try {
        await deleteMutation.mutateAsync(data.id);
        toast.show({ level: 'success', title: 'Deleted', message: 'The item is gone.' });
        if (router.canGoBack()) router.back();
        else router.replace('/profile/me');
      } catch (e) {
        const ux = mapApiError(e);
        toast.show({ level: ux.level, title: ux.title, message: ux.message });
      }
    };

    if (Platform.OS === 'web') {
      if (typeof globalThis !== 'undefined' && typeof (globalThis as { confirm?: (m: string) => boolean }).confirm === 'function') {
        const ok = (globalThis as { confirm: (m: string) => boolean }).confirm(
          'Delete this item? This cannot be undone.',
        );
        if (ok) void proceed();
        return;
      }
      toast.show({
        level: 'warning',
        title: 'Confirmation unavailable',
        message: 'Delete was cancelled because this runtime cannot show a confirmation dialog.',
      });
      return;
    }

    Alert.alert(
      'Delete this item?',
      'This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => void proceed() },
      ],
      { cancelable: true },
    );
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: pageBg }]}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.toolbar}>
          <Pressable
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            accessibilityRole="button"
            accessibilityLabel="Go back"
            style={[styles.iconButton, { backgroundColor: cardBg }]}>
            <IconSymbol name="chevron.right" size={20} color={getToken(scheme, 'textPrimary')} />
          </Pressable>
          <View style={styles.toolbarRight}>
            <ShareButton item={data} />
            {isOwner ? (
              <>
                <Pressable
                  onPress={() => setEditing(true)}
                  accessibilityRole="button"
                  accessibilityLabel="Edit metadata"
                  style={[styles.iconButton, { backgroundColor: cardBg }]}>
                  <IconSymbol name="pencil" size={20} color={getToken(scheme, 'textPrimary')} />
                </Pressable>
                <Pressable
                  onPress={onDelete}
                  accessibilityRole="button"
                  accessibilityLabel="Delete item"
                  disabled={deleteMutation.isPending}
                  style={[styles.iconButton, { backgroundColor: cardBg, opacity: deleteMutation.isPending ? 0.5 : 1 }]}>
                  <IconSymbol name="trash" size={20} color={accentDanger} />
                </Pressable>
              </>
            ) : null}
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.scrollBody}>
          <View style={styles.media}>
            <MediaRenderer item={data} />
          </View>

          <View style={[styles.card, { backgroundColor: cardBg, borderColor: cardBorder }]}>
            <View style={styles.titleRow}>
              <ThemedText type="title" style={styles.title}>
                {data.title || data.original_filename}
              </ThemedText>
              <VisibilityChip visibility={data.visibility} />
            </View>

            {data.description ? (
              <ThemedText style={styles.description}>{data.description}</ThemedText>
            ) : null}

            <View style={styles.metaGrid}>
              <MetaRow label="Type" value={data.mimetype} textTertiary={textTertiary} />
              <MetaRow label="Size" value={formatBytes(data.file_size)} textTertiary={textTertiary} />
              <MetaRow
                label="Uploaded"
                value={formatDateTime(data.created_at)}
                textTertiary={textTertiary}
              />
              {data.created_at !== data.updated_at ? (
                <MetaRow
                  label="Updated"
                  value={formatDateTime(data.updated_at)}
                  textTertiary={textTertiary}
                />
              ) : null}
              <View style={styles.metaRow}>
                <ThemedText style={[styles.metaLabel, { color: textTertiary }]}>Owner</ThemedText>
                <Link href={{ pathname: '/profile/[username]', params: { username: data.owner_id } }} asChild>
                  <Pressable accessibilityRole="link" style={styles.metaLink}>
                    <ThemedText style={styles.metaValue} numberOfLines={1}>
                      {data.owner_id}
                    </ThemedText>
                  </Pressable>
                </Link>
              </View>
              <MetaRow
                label="Filename"
                value={data.original_filename}
                textTertiary={textTertiary}
                multiline
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>

      {isOwner ? (
        <EditMetadataModal item={data} visible={editing} onClose={() => setEditing(false)} />
      ) : null}
    </ThemedView>
  );
}

function MetaRow({
  label,
  value,
  textTertiary,
  multiline,
}: {
  label: string;
  value: string;
  textTertiary: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.metaRow}>
      <ThemedText style={[styles.metaLabel, { color: textTertiary }]}>{label}</ThemedText>
      <ThemedText
        style={styles.metaValue}
        numberOfLines={multiline ? undefined : 1}
        selectable>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12 },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
  },
  toolbarRight: { flexDirection: 'row', gap: 8 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: { paddingBottom: 48, gap: 16 },
  media: { width: '100%' },
  card: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 12,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  title: { flex: 1, fontSize: 24, lineHeight: 28 },
  description: { lineHeight: 22, opacity: 0.85 },
  metaGrid: { gap: 6 },
  metaRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  metaLink: { flex: 1 },
  metaLabel: { fontSize: 12, width: 88, marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.4 },
  metaValue: { flex: 1, fontSize: 14 },
  retry: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 30 },
});
