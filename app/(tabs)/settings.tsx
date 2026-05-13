import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  Clipboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';

import { useAuth } from '@/lib/auth';
import { getMe, logout, updateProfile, changePassword, type AuthUser } from '@/lib/api/auth';
import { uploadWithProgress } from '@/lib/api/upload';
import { config } from '@/lib/config';
import { useToast } from '@/lib/toast';

export default function SettingsScreen() {
  const { clearApiKey, apiKey } = useAuth();
  const toast = useToast();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Stream key section
  const [streamKeyVisible, setStreamKeyVisible] = useState(false);

  // Save VODs toggle
  const [saveVods, setSaveVods] = useState(false);

  // Change password section
  const [pwExpanded, setPwExpanded] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [pwBusy, setPwBusy] = useState(false);

  // Broadcasting guide section
  const [guideExpanded, setGuideExpanded] = useState(false);

  // Edit profile section
  const [profileExpanded, setProfileExpanded] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [email, setEmail] = useState('');
  const [profileBusy, setProfileBusy] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    getMe()
      .then(({ user: u }) => {
        setUser(u);
        setDisplayName(u.display_name ?? '');
        setBio(u.bio ?? '');
        setEmail(u.email ?? '');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
          } catch {}
          await clearApiKey();
        },
      },
    ]);
  };

  const handleCopyStreamKey = () => {
    if (!user?.stream_key) return;
    Clipboard.setString(user.stream_key);
    toast.show({ level: 'success', title: 'Copied', message: 'Stream key copied to clipboard.' });
  };

  const handleChangePassword = async () => {
    if (!currentPw || !newPw) return;
    setPwBusy(true);
    try {
      await changePassword({ current_password: currentPw, new_password: newPw });
      toast.show({ level: 'success', title: 'Done', message: 'Password changed successfully.' });
      setCurrentPw('');
      setNewPw('');
      setPwExpanded(false);
    } catch (e: any) {
      toast.show({ level: 'error', title: 'Error', message: e?.message ?? 'Failed to change password.' });
    } finally {
      setPwBusy(false);
    }
  };

  const handleSaveProfile = async () => {
    setProfileBusy(true);
    try {
      const { user: u } = await updateProfile({ display_name: displayName, bio, email });
      setUser(u);
      toast.show({ level: 'success', title: 'Saved', message: 'Profile updated.' });
      setProfileExpanded(false);
    } catch (e: any) {
      toast.show({ level: 'error', title: 'Error', message: e?.message ?? 'Failed to update profile.' });
    } finally {
      setProfileBusy(false);
    }
  };

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      toast.show({ level: 'error', title: 'Permission denied', message: 'Camera roll access is required.' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled) return;
    const asset = result.assets[0];
    const ext = asset.uri.split('.').pop() ?? 'jpg';
    const mimeType = asset.mimeType ?? `image/${ext}`;
    setAvatarUploading(true);
    try {
      const media = await uploadWithProgress(
        { uri: asset.uri, name: `avatar.${ext}`, mimeType },
        { meta: { title: 'Profile picture', visibility: 'private' } },
      );
      const { user: u } = await updateProfile({ avatar_media_id: media.id });
      setUser(u);
      toast.show({ level: 'success', title: 'Updated', message: 'Profile picture updated.' });
    } catch (e: any) {
      toast.show({ level: 'error', title: 'Error', message: e?.message ?? 'Failed to upload avatar.' });
    } finally {
      setAvatarUploading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#fff" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Settings</Text>

        {/* ── Stream Key ── */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Stream Key</Text>
          {user?.stream_key ? (
            <>
              <Text style={styles.label}>
                {streamKeyVisible ? user.stream_key : '••••••••••••••••••••••••'}
              </Text>
              <View style={styles.row}>
                <Pressable style={styles.pill} onPress={() => setStreamKeyVisible(v => !v)}>
                  <Text style={styles.pillText}>{streamKeyVisible ? 'Hide' : 'Reveal'}</Text>
                </Pressable>
                <Pressable style={styles.pill} onPress={handleCopyStreamKey}>
                  <Text style={styles.pillText}>Copy</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <Text style={styles.muted}>No stream key yet — create your first stream to generate one.</Text>
          )}
        </View>

        {/* ── Save VODs ── */}
        <View style={[styles.card, styles.rowBetween]}>
          <View>
            <Text style={styles.cardTitle}>Save VODs</Text>
            <Text style={styles.muted}>Keep recordings after stream ends</Text>
          </View>
          <Switch value={saveVods} onValueChange={setSaveVods} thumbColor="#fff" trackColor={{ true: '#FF4458', false: '#444' }} />
        </View>

        {/* ── Change Password ── */}
        <Pressable style={styles.card} onPress={() => setPwExpanded(v => !v)}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Change Password</Text>
            <Text style={styles.chevron}>{pwExpanded ? '▲' : '▼'}</Text>
          </View>
        </Pressable>
        {pwExpanded && (
          <View style={styles.expandedCard}>
            <TextInput
              style={styles.input}
              placeholder="Current password"
              placeholderTextColor="#666"
              secureTextEntry
              value={currentPw}
              onChangeText={setCurrentPw}
            />
            <TextInput
              style={styles.input}
              placeholder="New password (min 8 chars)"
              placeholderTextColor="#666"
              secureTextEntry
              value={newPw}
              onChangeText={setNewPw}
            />
            <Pressable
              style={[styles.actionBtn, pwBusy && styles.disabled]}
              onPress={handleChangePassword}
              disabled={pwBusy}>
              <Text style={styles.actionBtnText}>{pwBusy ? 'Saving…' : 'Update Password'}</Text>
            </Pressable>
          </View>
        )}

        {/* ── Edit Profile ── */}
        <Pressable style={styles.card} onPress={() => setProfileExpanded(v => !v)}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Edit Profile</Text>
            <Text style={styles.chevron}>{profileExpanded ? '▲' : '▼'}</Text>
          </View>
        </Pressable>
        {profileExpanded && (
          <View style={styles.expandedCard}>
            {/* Avatar picker */}
            <Pressable style={styles.avatarWrap} onPress={handlePickAvatar} disabled={avatarUploading}>
              {user?.avatar_media_id ? (
                <Image
                  source={{
                    uri: `${config.API_BASE}/api/v1/media/${user.avatar_media_id}/stream`,
                    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
                  }}
                  style={styles.avatar}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Text style={styles.avatarPlaceholderText}>Add{'\n'}Photo</Text>
                </View>
              )}
              {avatarUploading && (
                <View style={styles.avatarOverlay}>
                  <ActivityIndicator color="#fff" />
                </View>
              )}
              <View style={styles.avatarBadge}>
                <Text style={styles.avatarBadgeText}>✎</Text>
              </View>
            </Pressable>

            <TextInput
              style={styles.input}
              placeholder="Display name"
              placeholderTextColor="#666"
              value={displayName}
              onChangeText={setDisplayName}
            />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#666"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <TextInput
              style={[styles.input, styles.bioInput]}
              placeholder="Bio"
              placeholderTextColor="#666"
              multiline
              value={bio}
              onChangeText={setBio}
            />
            <Pressable
              style={[styles.actionBtn, profileBusy && styles.disabled]}
              onPress={handleSaveProfile}
              disabled={profileBusy}>
              <Text style={styles.actionBtnText}>{profileBusy ? 'Saving…' : 'Save Profile'}</Text>
            </Pressable>
          </View>
        )}

        {/* ── Broadcasting Guide ── */}
        <Pressable style={styles.card} onPress={() => setGuideExpanded(v => !v)}>
          <View style={styles.rowBetween}>
            <Text style={styles.cardTitle}>Broadcasting Guide</Text>
            <Text style={styles.chevron}>{guideExpanded ? '▲' : '▼'}</Text>
          </View>
        </Pressable>
        {guideExpanded && (
          <View style={styles.expandedCard}>
            <Text style={styles.guideStep}>To start broadcasting:</Text>
            <Text style={styles.guideBody}>
              {'1. Open OBS Studio or Larix Broadcaster on mobile.\n'}
              {'2. Set Service to Custom, then paste the URLs below.\n'}
              {'3. For the Stream Key use the value from the card above.\n'}
              {'4. Click Start Streaming — the Live tab updates automatically.'}
            </Text>

            {/* RTMP Server URL */}
            <Text style={styles.guideLabel}>RTMP Server URL</Text>
            <Pressable
              style={styles.guideRow}
              onPress={() => {
                Clipboard.setString('rtmp://global-live.mux.com:5222/app');
                toast.show({ level: 'success', title: 'Copied', message: 'RTMP URL copied.' });
              }}>
              <Text style={styles.guideCode} numberOfLines={1}>
                rtmp://global-live.mux.com:5222/app
              </Text>
              <Text style={styles.guideCopyHint}>Tap to copy</Text>
            </Pressable>

            {/* Combined URL for Larix */}
            <Text style={styles.guideLabel}>Combined URL (Larix Broadcaster)</Text>
            {user?.stream_key ? (
              <Pressable
                style={styles.guideRow}
                onPress={() => {
                  Clipboard.setString(`rtmp://global-live.mux.com:5222/app/${user.stream_key}`);
                  toast.show({ level: 'success', title: 'Copied', message: 'Combined URL copied.' });
                }}>
                <Text style={styles.guideCode} numberOfLines={1}>
                  {`rtmp://global-live.mux.com:5222/app/${user.stream_key}`}
                </Text>
                <Text style={styles.guideCopyHint}>Tap to copy</Text>
              </Pressable>
            ) : (
              <Text style={styles.muted}>Go live once to generate your stream key.</Text>
            )}
          </View>
        )}

        {/* ── Logout ── */}
        <Pressable style={[styles.card, styles.logoutCard]} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#111' },
  scroll: { flex: 1 },
  content: { padding: 20, gap: 12, paddingBottom: 40 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111' },
  heading: { color: '#fff', fontSize: 26, fontWeight: '700', marginBottom: 4 },
  card: {
    backgroundColor: '#1e1e1e',
    borderRadius: 14,
    padding: 16,
    gap: 8,
  },
  expandedCard: {
    backgroundColor: '#1a1a1a',
    borderRadius: 14,
    padding: 16,
    gap: 10,
    marginTop: -6,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  label: { color: '#aaa', fontSize: 13, fontFamily: 'monospace' },
  muted: { color: '#666', fontSize: 13 },
  row: { flexDirection: 'row', gap: 8 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pill: {
    backgroundColor: '#2a2a2a',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  pillText: { color: '#ccc', fontSize: 13 },
  chevron: { color: '#666', fontSize: 14 },
  input: {
    backgroundColor: '#2a2a2a',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#fff',
    fontSize: 15,
  },
  bioInput: { minHeight: 80, textAlignVertical: 'top' },
  actionBtn: {
    backgroundColor: '#FF4458',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  actionBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  disabled: { opacity: 0.5 },
  logoutCard: { backgroundColor: '#2a1212' },
  logoutText: { color: '#FF4458', fontWeight: '600', fontSize: 16, textAlign: 'center' },
  avatarWrap: {
    alignSelf: 'center',
    width: 88,
    height: 88,
    marginBottom: 4,
  },
  avatar: { width: 88, height: 88, borderRadius: 44 },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#2a2a2a',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: { color: '#666', fontSize: 12, textAlign: 'center' },
  avatarOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 44,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#FF4458',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarBadgeText: { color: '#fff', fontSize: 13 },
  guideStep: { color: '#fff', fontSize: 14, fontWeight: '600', marginBottom: 8 },
  guideBody: { color: '#aaa', fontSize: 13, lineHeight: 21, marginBottom: 4 },
  guideLabel: { color: '#888', fontSize: 11, fontWeight: '600', letterSpacing: 0.5, marginTop: 8 },
  guideRow: {
    backgroundColor: '#222',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 4,
  },
  guideCode: { color: '#fff', fontSize: 12, fontFamily: 'monospace' },
  guideCopyHint: { color: '#555', fontSize: 10, marginTop: 3 },
});
