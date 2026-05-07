import { StyleSheet, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getToken } from '@/lib/theme';

export type EmptyStateVariant = 'empty' | 'error' | 'loading' | 'offline';

interface EmptyStateProps {
  variant: EmptyStateVariant;
  title?: string;
  message?: string;
}

export function EmptyState({ variant, title, message }: EmptyStateProps) {
  const scheme = useColorScheme() ?? 'light';
  const fg = getToken(scheme, 'textSecondary');

  const iconName =
    variant === 'error'
      ? 'wifi.slash'
      : variant === 'offline'
        ? 'wifi.slash'
        : variant === 'loading'
          ? 'arrow.clockwise'
          : 'photo.on.rectangle.angled';

  const headline =
    title ??
    (variant === 'error'
      ? 'Could not load media'
      : variant === 'offline'
        ? 'You are offline'
        : variant === 'loading'
          ? 'Loading…'
          : 'Nothing here yet');

  const body =
    message ??
    (variant === 'error'
      ? 'Pull to refresh, or check your connection.'
      : variant === 'offline'
        ? 'We will refresh the grid as soon as you are back online.'
        : variant === 'loading'
          ? ''
          : 'Tap the upload button to add your first item.');

  return (
    <View style={styles.container}>
      <IconSymbol name={iconName} size={48} color={fg} />
      <ThemedText type="defaultSemiBold">{headline}</ThemedText>
      {body ? <ThemedText style={styles.body}>{body}</ThemedText> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 8,
  },
  body: {
    textAlign: 'center',
    opacity: 0.7,
  },
});
