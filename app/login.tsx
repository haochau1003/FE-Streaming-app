import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/lib/auth';
import { login, register } from '@/lib/api';
import { getToken } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import { ApiError } from '@/lib/types';

type Mode = 'login' | 'register';

export default function LoginScreen() {
  const router = useRouter();
  const scheme = useColorScheme() ?? 'light';
  const { setApiKey, setCurrentUserId } = useAuth();
  const toast = useToast();

  const [mode, setMode] = useState<Mode>('login');
  const [busy, setBusy] = useState(false);

  const [loginId, setLoginId] = useState('');
  const [password, setPassword] = useState('');

  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const inputBg = getToken(scheme, 'bgCard');
  const inputBorder = getToken(scheme, 'border');
  const inputColor = getToken(scheme, 'textPrimary');
  const placeholderColor = getToken(scheme, 'textTertiary');
  const accent = getToken(scheme, 'accentUpload');
  const pageBg = getToken(scheme, 'bgPage');
  const textSecondary = getToken(scheme, 'textSecondary');
  const textTertiary = getToken(scheme, 'textTertiary');

  async function handleLogin() {
    if (!loginId.trim() || !password) {
      toast.show({ level: 'error', title: 'Required', message: 'Enter your username/email and password.' });
      return;
    }
    setBusy(true);
    try {
      const res = await login(loginId.trim(), password);
      await setApiKey(res.api_key);
      await setCurrentUserId(res.user.id);
      router.replace('/(tabs)');
    } catch (e) {
      toast.show({
        level: 'error',
        title: 'Login failed',
        message: e instanceof ApiError ? e.message : 'Invalid credentials.',
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleRegister() {
    if (!username.trim() || !email.trim() || !regPassword) {
      toast.show({ level: 'error', title: 'Required', message: 'Username, email and password are required.' });
      return;
    }
    setBusy(true);
    try {
      const res = await register(
        username.trim(),
        email.trim(),
        regPassword,
        displayName.trim() || undefined,
      );
      await setApiKey(res.api_key);
      await setCurrentUserId(res.user.id);
      router.replace('/(tabs)');
    } catch (e) {
      toast.show({
        level: 'error',
        title: 'Registration failed',
        message: e instanceof ApiError ? e.message : 'Could not create account.',
      });
    } finally {
      setBusy(false);
    }
  }

  const inputStyle = [styles.input, { color: inputColor, borderColor: inputBorder, backgroundColor: pageBg }];

  return (
    <ThemedView style={[styles.container, { backgroundColor: pageBg }]}>
      <SafeAreaView edges={['top', 'bottom']} style={styles.safe}>
        <View style={styles.body}>
          <View style={styles.header}>
            <ThemedText type="title" style={styles.title}>Streaming App</ThemedText>
            <ThemedText style={[styles.subtitle, { color: textSecondary }]}>
              {mode === 'login' ? 'Sign in to your account' : 'Create a new account'}
            </ThemedText>
          </View>

          <View style={[styles.card, { backgroundColor: inputBg, borderColor: inputBorder }]}>
            {mode === 'login' ? (
              <>
                <ThemedText style={[styles.label, { color: textTertiary }]}>Username or email</ThemedText>
                <TextInput
                  value={loginId}
                  onChangeText={setLoginId}
                  placeholder="alice or alice@example.com"
                  placeholderTextColor={placeholderColor}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  style={inputStyle}
                />
                <ThemedText style={[styles.label, { color: textTertiary }]}>Password</ThemedText>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={placeholderColor}
                  secureTextEntry
                  style={inputStyle}
                />
              </>
            ) : (
              <>
                <ThemedText style={[styles.label, { color: textTertiary }]}>Username</ThemedText>
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  placeholder="alice"
                  placeholderTextColor={placeholderColor}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={inputStyle}
                />
                <ThemedText style={[styles.label, { color: textTertiary }]}>Email</ThemedText>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="alice@example.com"
                  placeholderTextColor={placeholderColor}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="email-address"
                  style={inputStyle}
                />
                <ThemedText style={[styles.label, { color: textTertiary }]}>
                  Display name{' '}
                  <ThemedText style={{ color: textTertiary, fontSize: 12 }}>(optional)</ThemedText>
                </ThemedText>
                <TextInput
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Alice Smith"
                  placeholderTextColor={placeholderColor}
                  style={inputStyle}
                />
                <ThemedText style={[styles.label, { color: textTertiary }]}>Password</ThemedText>
                <TextInput
                  value={regPassword}
                  onChangeText={setRegPassword}
                  placeholder="At least 8 characters"
                  placeholderTextColor={placeholderColor}
                  secureTextEntry
                  style={inputStyle}
                />
              </>
            )}
          </View>

          <Pressable
            onPress={mode === 'login' ? handleLogin : handleRegister}
            disabled={busy}
            style={[styles.button, { backgroundColor: accent, opacity: busy ? 0.6 : 1 }]}
            accessibilityRole="button">
            <ThemedText type="defaultSemiBold" style={styles.buttonLabel}>
              {busy
                ? mode === 'login' ? 'Signing in…' : 'Creating account…'
                : mode === 'login' ? 'Sign In' : 'Create Account'}
            </ThemedText>
          </Pressable>

          <Pressable
            onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
            disabled={busy}
            style={styles.toggle}
            accessibilityRole="button">
            <ThemedText style={[styles.toggleText, { color: accent }]}>
              {mode === 'login' ? "Don't have an account? Register" : 'Already have an account? Sign in'}
            </ThemedText>
          </Pressable>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, justifyContent: 'center' },
  body: { padding: 24, gap: 20 },
  header: { gap: 8 },
  title: { textAlign: 'center' },
  subtitle: { textAlign: 'center', fontSize: 14, lineHeight: 20 },
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    gap: 8,
  },
  label: { fontSize: 13, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  button: {
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: { color: '#ffffff', fontSize: 16 },
  toggle: { alignItems: 'center', paddingVertical: 4 },
  toggleText: { fontSize: 14 },
});
