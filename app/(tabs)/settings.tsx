import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useAuth } from '@/lib/auth';
import { getToken } from '@/lib/theme';
import { useToast } from '@/lib/toast';

const UUID_SHAPE_RE =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const schema = z.object({
  apiKey: z.string().trim().min(8, 'Paste your full API key (at least 8 characters).'),
  ownerId: z
    .string()
    .trim()
    .regex(UUID_SHAPE_RE, 'Owner id should be a UUID (printed by `python seed.py`).')
    .optional()
    .or(z.literal('')),
});

type FormValues = z.infer<typeof schema>;

export default function SettingsScreen() {
  const scheme = useColorScheme() ?? 'light';
  const { apiKey, currentUserId, setApiKey, clearApiKey, setCurrentUserId } = useAuth();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const { control, handleSubmit, formState, reset } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { apiKey: apiKey ?? '', ownerId: currentUserId ?? '' },
  });

  const onSubmit = handleSubmit(async (values) => {
    setBusy(true);
    try {
      await setApiKey(values.apiKey);
      await setCurrentUserId(values.ownerId && values.ownerId.length > 0 ? values.ownerId : null);
      toast.show({
        level: 'success',
        title: 'Saved',
        message: 'Your API key is stored securely on this device.',
      });
    } catch (e) {
      toast.show({
        level: 'error',
        title: 'Could not save',
        message: e instanceof Error ? e.message : 'Unknown error',
      });
    } finally {
      setBusy(false);
    }
  });

  const onClear = async () => {
    setBusy(true);
    try {
      await clearApiKey();
      reset({ apiKey: '', ownerId: '' });
      toast.show({ level: 'info', title: 'Cleared', message: 'Your key was removed.' });
    } finally {
      setBusy(false);
    }
  };

  const inputBg = getToken(scheme, 'bgCard');
  const inputBorder = getToken(scheme, 'border');
  const inputColor = getToken(scheme, 'textPrimary');
  const placeholderColor = getToken(scheme, 'textTertiary');
  const accent = getToken(scheme, 'accentDanger');
  const pageBg = getToken(scheme, 'bgPage');

  return (
    <ThemedView style={[styles.container, { backgroundColor: pageBg }]}>
      <SafeAreaView edges={['top']} style={styles.safe}>
        <View style={styles.body}>
          <ThemedText type="title">Settings</ThemedText>
          <ThemedText style={styles.intro}>
            Phase 1 uses paste-the-key auth. Run `python seed.py` on the backend, copy a key from
            the log, and paste it below.
          </ThemedText>

          <View style={[styles.card, { backgroundColor: inputBg, borderColor: inputBorder }]}>
            <ThemedText style={styles.label}>API key</ThemedText>
            <Controller
              control={control}
              name="apiKey"
              render={({ field, fieldState }) => (
                <>
                  <TextInput
                    value={field.value ?? ''}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="sk_live_..."
                    placeholderTextColor={placeholderColor}
                    autoCapitalize="none"
                    autoCorrect={false}
                    secureTextEntry
                    style={[styles.input, { color: inputColor, borderColor: inputBorder }]}
                  />
                  {fieldState.error ? (
                    <ThemedText style={styles.error}>{fieldState.error.message}</ThemedText>
                  ) : null}
                </>
              )}
            />

            <ThemedText style={styles.label}>Your owner id (optional)</ThemedText>
            <Controller
              control={control}
              name="ownerId"
              render={({ field, fieldState }) => (
                <>
                  <TextInput
                    value={field.value ?? ''}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="00000000-0000-0000-0000-..."
                    placeholderTextColor={placeholderColor}
                    autoCapitalize="none"
                    autoCorrect={false}
                    style={[styles.input, { color: inputColor, borderColor: inputBorder }]}
                  />
                  {fieldState.error ? (
                    <ThemedText style={styles.error}>{fieldState.error.message}</ThemedText>
                  ) : null}
                </>
              )}
            />
            <ThemedText style={styles.hint}>
              Used to filter real-time `media_uploaded` events to your own uploads.
            </ThemedText>
          </View>

          <View style={styles.actions}>
            <Pressable
              onPress={onSubmit}
              disabled={busy || formState.isSubmitting}
              style={[styles.button, { backgroundColor: accent, opacity: busy ? 0.6 : 1 }]}
              accessibilityRole="button">
              <ThemedText type="defaultSemiBold" style={styles.buttonLabel}>
                {busy ? 'Saving…' : 'Save'}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={onClear}
              disabled={busy || (!apiKey && !currentUserId)}
              style={[styles.buttonSecondary, { borderColor: accent }]}
              accessibilityRole="button">
              <ThemedText type="defaultSemiBold" style={[styles.buttonLabel, { color: accent }]}>
                Clear
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  body: { padding: 24, gap: 16 },
  intro: { opacity: 0.75, lineHeight: 22 },
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 8 },
  label: { fontSize: 13, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 0.4 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  hint: { opacity: 0.6, fontSize: 12 },
  error: { color: '#f54040', fontSize: 12 },
  actions: { flexDirection: 'row', gap: 12 },
  button: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  buttonLabel: { color: '#ffffff' },
});
