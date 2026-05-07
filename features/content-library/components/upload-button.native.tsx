import { Pressable, StyleSheet } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { pickMedia } from '@/lib/media';
import { getToken } from '@/lib/theme';
import { useToast } from '@/lib/toast';

import type { UploadFile } from '@/lib/api';

interface UploadButtonProps {
  onSelected: (files: UploadFile[]) => void;
}

export function UploadButton({ onSelected }: UploadButtonProps) {
  const scheme = useColorScheme() ?? 'light';
  const accent = getToken(scheme, 'accentUpload');
  const toast = useToast();

  const onPress = async () => {
    try {
      const res = await pickMedia();
      if (res.cancelled) return;
      onSelected(res.files);
    } catch (e) {
      toast.show({
        level: 'error',
        title: 'Could not open picker',
        message: e instanceof Error ? e.message : 'Unknown error',
      });
    }
  };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Choose files to upload"
      style={[styles.button, { backgroundColor: accent }]}>
      <IconSymbol name="plus.circle.fill" size={24} color="#ffffff" />
      <ThemedText
        type="defaultSemiBold"
        lightColor="#ffffff"
        darkColor="#ffffff"
        style={styles.label}>
        Choose files
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    minHeight: 56,
  },
  label: { fontSize: 15 },
});
