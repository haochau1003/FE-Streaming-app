import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { mapApiError } from '@/lib/errors';
import { updateMetaSchema, type UpdateMetaInput } from '@/lib/schemas';
import { getToken } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import type { MediaItem, Visibility } from '@/lib/types';

import { useUpdateMedia } from '../hooks/use-update-media';

interface EditMetadataModalProps {
  item: MediaItem;
  visible: boolean;
  onClose: () => void;
}

const VISIBILITIES: Visibility[] = ['public', 'unlisted', 'private'];

export function EditMetadataModal({ item, visible, onClose }: EditMetadataModalProps) {
  const scheme = useColorScheme() ?? 'light';
  const update = useUpdateMedia();
  const toast = useToast();
  const lastResetItemId = useRef<string | null>(null);

  const { control, handleSubmit, reset, formState } = useForm<UpdateMetaInput>({
    resolver: zodResolver(updateMetaSchema),
    defaultValues: {
      title: item.title,
      description: item.description,
      visibility: item.visibility,
    },
  });

  useEffect(() => {
    if (!visible) {
      lastResetItemId.current = null;
      return;
    }
    if (lastResetItemId.current === item.id) return;
    reset({
      title: item.title,
      description: item.description,
      visibility: item.visibility,
    });
    lastResetItemId.current = item.id;
  }, [visible, item, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      await update.mutateAsync({ id: item.id, ...values });
      toast.show({ level: 'success', title: 'Saved', message: 'Metadata updated.' });
      onClose();
    } catch (e) {
      const ux = mapApiError(e);
      toast.show({
        level: ux.level,
        title: ux.title,
        message: ux.message,
        recoveryHint: ux.recoveryHint,
      });
    }
  });

  const cardBg = getToken(scheme, 'bgCard');
  const pageBg = getToken(scheme, 'bgPage');
  const border = getToken(scheme, 'border');
  const accent = getToken(scheme, 'accentDanger');
  const placeholder = getToken(scheme, 'textTertiary');
  const inputColor = getToken(scheme, 'textPrimary');

  return (
    <Modal
      animationType="slide"
      presentationStyle="pageSheet"
      visible={visible}
      onRequestClose={onClose}>
      <ThemedView style={[styles.container, { backgroundColor: pageBg }]}>
        <View style={styles.headerRow}>
          <Pressable onPress={onClose} accessibilityRole="button">
            <ThemedText type="defaultSemiBold">Cancel</ThemedText>
          </Pressable>
          <ThemedText type="defaultSemiBold">Edit</ThemedText>
          <Pressable
            onPress={onSubmit}
            disabled={update.isPending || formState.isSubmitting}
            accessibilityRole="button">
            <ThemedText type="defaultSemiBold" style={{ color: accent }}>
              {update.isPending ? 'Saving…' : 'Save'}
            </ThemedText>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <View style={[styles.card, { backgroundColor: cardBg, borderColor: border }]}>
            <ThemedText style={styles.label}>Title</ThemedText>
            <Controller
              control={control}
              name="title"
              render={({ field, fieldState }) => (
                <>
                  <TextInput
                    value={field.value ?? ''}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    placeholder={item.original_filename}
                    placeholderTextColor={placeholder}
                    style={[styles.input, { color: inputColor, borderColor: border }]}
                  />
                  {fieldState.error ? (
                    <ThemedText style={styles.error}>{fieldState.error.message}</ThemedText>
                  ) : null}
                </>
              )}
            />

            <ThemedText style={styles.label}>Description</ThemedText>
            <Controller
              control={control}
              name="description"
              render={({ field, fieldState }) => (
                <>
                  <TextInput
                    value={field.value ?? ''}
                    onChangeText={field.onChange}
                    onBlur={field.onBlur}
                    placeholder="Optional"
                    placeholderTextColor={placeholder}
                    multiline
                    numberOfLines={4}
                    style={[
                      styles.input,
                      styles.multiline,
                      { color: inputColor, borderColor: border },
                    ]}
                  />
                  {fieldState.error ? (
                    <ThemedText style={styles.error}>{fieldState.error.message}</ThemedText>
                  ) : null}
                </>
              )}
            />

            <ThemedText style={styles.label}>Visibility</ThemedText>
            <Controller
              control={control}
              name="visibility"
              render={({ field }) => (
                <View style={styles.visibilityRow}>
                  {VISIBILITIES.map((v) => {
                    const active = field.value === v;
                    return (
                      <Pressable
                        key={v}
                        onPress={() => field.onChange(v)}
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
                          style={{ color: active ? '#fff' : inputColor }}>
                          {v[0].toUpperCase() + v.slice(1)}
                        </ThemedText>
                      </Pressable>
                    );
                  })}
                </View>
              )}
            />
          </View>
        </ScrollView>
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  body: { padding: 16, gap: 16 },
  card: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 8 },
  label: { fontSize: 12, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 4 },
  input: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  visibilityRow: { flexDirection: 'row', gap: 8, marginTop: 4 },
  visibilityOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
  },
  error: { color: '#f54040', fontSize: 12 },
});
