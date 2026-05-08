import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getToken } from '@/lib/theme';
import type { Visibility } from '@/lib/types';

const labels: Record<Visibility, string> = {
  public: 'Public',
  unlisted: 'Unlisted',
  private: 'Private',
};

export function VisibilityChip({
  visibility,
  size = 'md',
}: {
  visibility: Visibility;
  size?: 'sm' | 'md';
}) {
  const scheme = useColorScheme() ?? 'light';
  const bg =
    visibility === 'public'
      ? getToken(scheme, 'chipPublic')
      : visibility === 'unlisted'
        ? getToken(scheme, 'chipUnlisted')
        : getToken(scheme, 'chipPrivate');
  const padding = size === 'sm' ? styles.padSm : styles.padMd;
  return (
    <View
      style={[styles.chip, padding, { backgroundColor: bg }]}
      accessibilityLabel={`Visibility ${labels[visibility]}`}>
      <ThemedText
        style={[styles.label, size === 'sm' ? styles.labelSm : styles.labelMd]}
        lightColor="#ffffff"
        darkColor="#0c0c0c">
        {labels[visibility]}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 30,
    alignSelf: 'flex-start',
  },
  padMd: { paddingHorizontal: 10, paddingVertical: 4 },
  padSm: { paddingHorizontal: 8, paddingVertical: 2 },
  label: { fontWeight: '600' },
  labelMd: { fontSize: 12, lineHeight: 16 },
  labelSm: { fontSize: 10, lineHeight: 14 },
});
