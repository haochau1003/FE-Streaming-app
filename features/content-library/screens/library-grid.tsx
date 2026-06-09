import { onlineManager } from '@tanstack/react-query';
import { Link, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
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
import { fetchMe, fetchUser, updateMe, type UserProfile } from '@/lib/api/users';
import { uploadWithProgress, type NativeFileSource } from '@/lib/api/upload';

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
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [settingsSaving, setSettingsSaving] = useState(false);
  const deleteMutation = useDeleteMedia();

  useEffect(() => {
    if (!isReady) return;
    const load = async () => {
      try {
        if (isMe && apiKey) setProfile(await fetchMe());
        else if (ownerId) setProfile(await fetchUser(ownerId));
      } catch {}
    };
    load();
  }, [isReady, isMe, apiKey, ownerId]);

  const handleAvatarPress = async () => {
    if (!isOwner) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      toast.show({ level: 'warning', title: 'Permission denied', message: 'Allow photo access to set a profile picture.' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setAvatarUploading(true);
    try {
      const file: NativeFileSource = {
        uri: asset.uri,
        name: asset.fileName ?? 'avatar.jpg',
        mimeType: asset.mimeType ?? 'image/jpeg',
        size: asset.fileSize,
      };
      const uploaded = await uploadWithProgress(file, { meta: { title: 'Profile picture', visibility: 'public' } });
      const updated = await updateMe({ avatar_media_id: uploaded.id });
      setProfile(updated);
      toast.show({ level: 'success', title: 'Profile picture updated' });
    } catch (e) {
      const ux = mapApiError(e);
      toast.show({ level: ux.level, title: ux.title, message: ux.message });
    } finally {
      setAvatarUploading(false);
    }
  };

  const openSettings = () => {
    setNewDisplayName(profile?.display_name ?? '');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setSettingsOpen(true);
  };

  const handleSaveDisplayName = async () => {
    const trimmed = newDisplayName.trim();
    setSettingsSaving(true);
    try {
      const updated = await updateMe({ display_name: trimmed || null });
      setProfile(updated);
      toast.show({ level: 'success', title: 'Display name updated' });
    } catch (e) {
      const ux = mapApiError(e);
      toast.show({ level: ux.level, title: ux.title, message: ux.message });
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) {
      toast.show({ level: 'warning', title: 'Password too short', message: 'At least 8 characters required.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.show({ level: 'warning', title: 'Passwords do not match' });
      return;
    }
    setSettingsSaving(true);
    try {
      await updateMe({ current_password: currentPassword, new_password: newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toast.show({ level: 'success', title: 'Password changed' });
    } catch (e) {
      const ux = mapApiError(e);
      toast.show({ level: ux.level, title: ux.title, message: ux.message });
    } finally {
      setSettingsSaving(false);
    }
  };

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
                <Pressable
                  onPress={handleAvatarPress}
                  disabled={!isOwner || avatarUploading}
                  style={styles.avatarWrap}>
                  {profile?.avatar_url ? (
                    <Image source={{ uri: profile.avatar_url }} style={styles.avatar} />
                  ) : (
                    <View style={[styles.avatar, { backgroundColor: avatarBg, alignItems: 'center', justifyContent: 'center' }]}>
                      <IconSymbol name="person.crop.circle" size={56} color={avatarFg} />
                    </View>
                  )}
                  {isOwner && (
                    <View style={styles.avatarEditBadge}>
                      {avatarUploading
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <IconSymbol name="camera.fill" size={12} color="#fff" />}
                    </View>
                  )}
                </Pressable>
                <View style={styles.headerText}>
                  <ThemedText type="title">
                    {profile?.display_name ?? profile?.username ?? (isMe ? 'You' : 'Profile')}
                  </ThemedText>
                  <ThemedText style={[styles.subtitle, { color: textTertiary }]}>
                    {profile?.username ? `@${profile.username}` : (ownerId ? `id: ${ownerId.slice(0, 8)}…` : 'Anonymous')}
                  </ThemedText>
                </View>
                {isOwner ? (
                  <View style={styles.headerActions}>
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
                    <Pressable
                      onPress={openSettings}
                      accessibilityLabel="Settings"
                      accessibilityRole="button"
                      style={styles.settingsBtn}>
                      <IconSymbol name="gearshape.fill" size={20} color={textTertiary} />
                    </Pressable>
                  </View>
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

        <Modal
          visible={settingsOpen}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setSettingsOpen(false)}>
          <View style={[styles.modalContainer, { backgroundColor: pageBg }]}>
            <View style={styles.modalHeader}>
              <ThemedText type="title" style={styles.modalTitle}>Settings</ThemedText>
              <Pressable onPress={() => setSettingsOpen(false)} style={styles.modalClose}>
                <IconSymbol name="xmark" size={20} color={textTertiary} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={styles.modalBody}>
              {/* ── Change display name ── */}
              <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>Display name</ThemedText>
              <TextInput
                style={[styles.textField, { color: getToken(scheme, 'textPrimary'), borderColor: getToken(scheme, 'border') }]}
                value={newDisplayName}
                onChangeText={setNewDisplayName}
                placeholder="Display name"
                placeholderTextColor={textTertiary}
                maxLength={128}
                autoCapitalize="words"
              />
              <Pressable
                onPress={handleSaveDisplayName}
                disabled={settingsSaving}
                style={[styles.saveBtn, { backgroundColor: accentUpload }]}>
                <ThemedText type="defaultSemiBold" lightColor="#fff" darkColor="#fff">
                  {settingsSaving ? 'Saving…' : 'Save name'}
                </ThemedText>
              </Pressable>

              <View style={[styles.divider, { backgroundColor: getToken(scheme, 'border') }]} />

              {/* ── Change password ── */}
              <ThemedText type="defaultSemiBold" style={styles.sectionLabel}>Change password</ThemedText>
              <TextInput
                style={[styles.textField, { color: getToken(scheme, 'textPrimary'), borderColor: getToken(scheme, 'border') }]}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                placeholder="Current password"
                placeholderTextColor={textTertiary}
                secureTextEntry
                autoCapitalize="none"
              />
              <TextInput
                style={[styles.textField, { color: getToken(scheme, 'textPrimary'), borderColor: getToken(scheme, 'border') }]}
                value={newPassword}
                onChangeText={setNewPassword}
                placeholder="New password (min 8 chars)"
                placeholderTextColor={textTertiary}
                secureTextEntry
                autoCapitalize="none"
              />
              <TextInput
                style={[styles.textField, { color: getToken(scheme, 'textPrimary'), borderColor: getToken(scheme, 'border') }]}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                placeholder="Confirm new password"
                placeholderTextColor={textTertiary}
                secureTextEntry
                autoCapitalize="none"
              />
              <Pressable
                onPress={handleChangePassword}
                disabled={settingsSaving}
                style={[styles.saveBtn, { backgroundColor: accentUpload }]}>
                <ThemedText type="defaultSemiBold" lightColor="#fff" darkColor="#fff">
                  {settingsSaving ? 'Saving…' : 'Change password'}
                </ThemedText>
              </Pressable>
            </ScrollView>
          </View>
        </Modal>
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
  avatarWrap: {
    position: 'relative',
    width: 64,
    height: 64,
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 100,
    overflow: 'hidden',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#555',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#fff',
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingsBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  modalTitle: {
    flex: 1,
  },
  modalClose: {
    padding: 8,
  },
  modalBody: {
    padding: 20,
    gap: 12,
  },
  sectionLabel: {
    marginBottom: 4,
  },
  textField: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  saveBtn: {
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  divider: {
    height: 1,
    marginVertical: 8,
  },
});
