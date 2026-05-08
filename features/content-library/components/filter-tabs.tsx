import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getToken } from '@/lib/theme';

export type MediaFilter = 'all' | 'video' | 'image' | 'audio';

interface FilterTabsProps {
  value: MediaFilter;
  onChange: (next: MediaFilter) => void;
}

const tabs: { key: MediaFilter; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'video', label: 'Video' },
  { key: 'image', label: 'Image' },
  { key: 'audio', label: 'Audio' },
];

export function mimetypePrefixFor(filter: MediaFilter): string | undefined {
  switch (filter) {
    case 'video':
      return 'video/';
    case 'image':
      return 'image/';
    case 'audio':
      return 'audio/';
    default:
      return undefined;
  }
}

export function FilterTabs({ value, onChange }: FilterTabsProps) {
  const scheme = useColorScheme() ?? 'light';
  const active = getToken(scheme, 'textPrimary');
  const inactive = getToken(scheme, 'textTertiary');
  const underline = getToken(scheme, 'accentDanger');

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}>
      {tabs.map((tab) => {
        const isActive = tab.key === value;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            style={styles.tab}>
            <ThemedText
              type="defaultSemiBold"
              style={{ color: isActive ? active : inactive }}>
              {tab.label}
            </ThemedText>
            <View
              style={[
                styles.indicator,
                isActive ? { backgroundColor: underline } : styles.indicatorHidden,
              ]}
            />
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
    gap: 24,
    paddingVertical: 4,
  },
  tab: {
    alignItems: 'center',
    paddingVertical: 8,
    gap: 6,
  },
  indicator: {
    height: 3,
    width: 24,
    borderRadius: 2,
  },
  indicatorHidden: {
    backgroundColor: 'transparent',
  },
});
