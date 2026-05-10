import { onlineManager } from '@tanstack/react-query';
import { Link, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { mapApiError } from '@/lib/errors';
import { getToken } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import { useAuth } from '@/lib/auth';
import type { MediaItem, Visibility } from '@/lib/types';

import { FollowButton } from '@/features/social/components/follow-button';
import { EditMetadataModal } from '../components/edit-metadata-modal';
import { useMediaList } from '../hooks/use-media-list';
import { EmptyState } from '../components/empty-state';
import { FilterTabs, mimetypePrefixFor, type MediaFilter } from '../components/filter-tabs';
import { MediaTile } from '../components/media-tile';
import { useDeleteMedia } from '../hooks/use-delete-media';

interface LibraryGridProps {
  username: string;
}

const GAP = 2;

function columnsForWidth(width: number): number {
  if (width >= 1280) return 5;
  if (width >= 1024) return 4;
  if (width >= 768) return 3;
  if (width >= 480) return 3;
  return 3;
}

export function LibraryGrid({ username }: LibraryGridProps) {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const { currentUserId, apiKey, isReady } = useAuth();
  const toast = useToast();
  const { width } = useWindowDimensions();

  const isMe = username === 'me';
  const ownerId = isMe ? (currentUserId ?? undefined) : username;
  const isOwner = isMe || (!!currentUserId && currentUserId === ownerId);

  const [filter, setFilter] = useState<MediaFilter>('all');
  const [visibilityFilter, setVisibilityFilter] = useState<Visibility | undefined>();
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const deleteMutation = useDeleteMedia();

  const cols = columnsForWidth(width);
  const tileWidth = Math.floor((width - GAP * (cols - 1)) / cols);

  const [isOnline, setIsOnline] = useState(() => onlineManager.isOnline());

  useEffect(() => onlineManager.subscribe(setIsOnline), []);

  const canQuery = isReady && (!isMe || Boolean(apiKey && currentUserId));
  const list = useMediaList({
    ownerId,
    visibility: isOwner ? visibilityFilter : undefined,
    mimetypePrefix: mimetypePrefixFor(filter),
    perPage: isMe ? 12 : 24,
    enabled: canQuery,
  });

  const flatItems = useMemo<MediaItem[]>(() => {
    if (!list.data) return [];
    return list.data.pages.flatMap((p) => p.items);
  }, [list.data]);

  const onTilePress = (id: string) => {
    router.push({ pathname: '/library/[id]', params: { id } });
  };

  const onDelete = (item: MediaItem) => {
    const proceed = async () => {
      try {
        await deleteMutation.mutateAsync(item.id);
        toast.show({ level: 'success', title: 'Deleted', message: 'The item is gone.' });
      } catch (e) {
        const ux = mapApiError(e);
        toast.show({ level: ux.level, title: ux.title, message: ux.message });
      }
    };

    if (Platform.OS === 'web') {
      const confirm = typeof globalThis !== 'undefined'
        ? (globalThis as { confirm?: (message: string) => boolean }).confirm
        : undefined;
      if (!confirm) {
        toast.show({
          level: 'warning',
          title: 'Confirmation unavailable',
          message: 'Open the item to delete it safely.',
        });
        return;
      }
      if (confirm('Delete this item? This cannot be undone.')) void proceed();
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

  const pageBg = getToken(scheme, 'bgPage');
  const cardBg = getToken(scheme, 'bgCard');
  const textTertiary = getToken(scheme, 'textTertiary');
  const accentUpload = getToken(scheme, 'accentUpload');
  const avatarBg = getToken(scheme, 'avatarBg');
  const avatarFg = getToken(scheme, 'avatarFg');

  const ctaStyle = StyleSheet.flatten([styles.cta, { backgroundColor: accentUpload }]);

  if (isMe && !isReady) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: pageBg }]}>
        <SafeAreaView edges={['top']} style={styles.safe}>
          <View style={styles.body}>
            <EmptyState variant="loading" />
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (isMe && !apiKey) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: pageBg }]}>
        <SafeAreaView edges={['top']} style={styles.safe}>
          <View style={styles.body}>
            <EmptyState
              variant="empty"
              title="Add your API key first"
              message="Go to Settings and paste a key from `python seed.py`. Anonymous browsing of public/unlisted media works without one."
            />
            <Link href="/settings" asChild>
              <Pressable style={ctaStyle}>
                <ThemedText type="defaultSemiBold" lightColor="#ffffff" darkColor="#ffffff">
                  Open Settings
                </ThemedText>
              </Pressable>
            </Link>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (isMe && apiKey && !currentUserId) {
    return (
      <ThemedView style={[styles.container, { backgroundColor: pageBg }]}>
        <SafeAreaView edges={['top']} style={styles.safe}>
          <View style={styles.body}>
            <EmptyState
              variant="empty"
              title="Add your owner id"
              message="My library needs your backend owner UUID so private items can be requested with owner_id."
            />
            <Link href="/settings" asChild>
              <Pressable style={ctaStyle}>
                <ThemedText type="defaultSemiBold" lightColor="#ffffff" darkColor="#ffffff">
                  Open Settings
                </ThemedText>
              </Pressable>
            </Link>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  if (list.isError) {
    const ux = mapApiError(list.error);
    return (
      <ThemedView style={[styles.container, { backgroundColor: pageBg }]}>
        <SafeAreaView edges={['top']} style={styles.safe}>
          <View style={styles.body}>
            <EmptyState variant="error" title={ux.title} message={ux.message} />
            <Pressable
              onPress={() => list.refetch()}
              style={[styles.cta, { backgroundColor: accentUpload }]}>
              <ThemedText type="defaultSemiBold" lightColor="#ffffff" darkColor="#ffffff">
                Retry
              </ThemedText>
            </Pressable>
          </View>
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={[styles.container, { backgroundColor: pageBg }]}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <FlatList<MediaItem>
          data={flatItems}
          keyExtractor={(it) => it.id}
          numColumns={cols}
          key={`cols-${cols}`}
          columnWrapperStyle={cols > 1 ? { gap: GAP } : undefined}
          contentContainerStyle={{ paddingBottom: 64, gap: GAP }}
          refreshControl={
            <RefreshControl
              refreshing={list.isRefetching && !list.isFetchingNextPage}
              onRefresh={() => list.refetch()}
            />
          }
          ListHeaderComponent={
            <View>
              <View style={styles.header}>
                <View
                  style={[styles.avatar, { backgroundColor: avatarBg }]}
                  accessibilityElementsHidden>
                  <IconSymbol name="person.crop.circle" size={56} color={avatarFg} />
                </View>
                <View style={styles.headerText}>
                  <ThemedText type="title">{isMe ? 'You' : 'Profile'}</ThemedText>
                  <ThemedText style={[styles.subtitle, { color: textTertiary }]}>
                    {ownerId ? `id: ${ownerId.slice(0, 8)}…` : 'Anonymous'}
                  </ThemedText>
                </View>
                {isOwner ? (
                  <Pressable
                    onPress={() => router.push('/upload')}
                    accessibilityLabel="Upload media"
                    accessibilityRole="button"
                    style={[styles.uploadPill, { backgroundColor: accentUpload }]}>
                    <IconSymbol name="plus" size={18} color="#ffffff" />
                    <ThemedText
                      type="defaultSemiBold"
                      lightColor="#ffffff"
                      darkColor="#ffffff"
                      style={styles.uploadLabel}>
                      Upload
                    </ThemedText>
                  </Pressable>
                ) : (
                  <FollowButton userId={ownerId ?? null} />
                )}
              </View>
              {!isOnline ? (
                <View style={[styles.offlineBanner, { backgroundColor: cardBg }]}>
                  <IconSymbol name="wifi.slash" size={16} color={textTertiary} />
                  <ThemedText style={styles.offlineText}>You are offline.</ThemedText>
                </View>
              ) : null}
              <FilterTabs value={filter} onChange={setFilter} />
              {isOwner ? (
                <View style={styles.visibilityFilterRow}>
                  {(['all', 'public', 'unlisted', 'private'] as const).map((v) => {
                    const active = v === 'all' ? !visibilityFilter : visibilityFilter === v;
                    return (
                      <Pressable
                        key={v}
                        onPress={() => setVisibilityFilter(v === 'all' ? undefined : v)}
                        accessibilityRole="button"
                        accessibilityState={{ selected: active }}
                        style={[
                          styles.visibilityPill,
                          {
                            borderColor: active ? accentUpload : getToken(scheme, 'border'),
                            backgroundColor: active ? accentUpload : 'transparent',
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
              ) : null}
            </View>
          }
          ListEmptyComponent={
            list.isPending ? (
              <EmptyState variant="loading" />
            ) : (
              <EmptyState variant="empty" />
            )
          }
          renderItem={({ item }) => (
            <MediaTile
              item={item}
              width={tileWidth}
              isOwner={isOwner}
              onPress={onTilePress}
              onEdit={setEditingItem}
              onDelete={onDelete}
            />
          )}
          onEndReachedThreshold={0.5}
          onEndReached={() => {
            if (list.hasNextPage && !list.isFetchingNextPage) {
              list.fetchNextPage().catch((err) => {
                const ux = mapApiError(err);
                toast.show({ level: ux.level, title: ux.title, message: ux.message });
              });
            }
          }}
          ListFooterComponent={
            list.isFetchingNextPage ? (
              <View style={styles.footer}>
                <ActivityIndicator />
              </View>
            ) : null
          }
        />
        {editingItem ? (
          <EditMetadataModal
            item={editingItem}
            visible={Boolean(editingItem)}
            onClose={() => setEditingItem(null)}
          />
        ) : null}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  body: { padding: 24, gap: 16, alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 16,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  headerText: { flex: 1 },
  subtitle: { fontSize: 13, marginTop: 2 },
  uploadPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 30,
    gap: 6,
  },
  uploadLabel: { fontSize: 13 },
  offlineBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 16,
    borderRadius: 8,
  },
  offlineText: { opacity: 0.7, fontSize: 12 },
  visibilityFilterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexWrap: 'wrap',
  },
  visibilityPill: {
    borderWidth: 1,
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  cta: {
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 30,
  },
  footer: {
    paddingVertical: 24,
    alignItems: 'center',
  },
});
