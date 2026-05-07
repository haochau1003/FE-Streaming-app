import { StyleSheet, View } from 'react-native';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { getToken } from '@/lib/theme';

interface ProgressBarProps {
  percent: number;
  variant?: 'default' | 'danger';
}

export function ProgressBar({ percent, variant = 'default' }: ProgressBarProps) {
  const scheme = useColorScheme() ?? 'light';
  const trackColor = getToken(scheme, 'tilePlaceholder');
  const fillColor =
    variant === 'danger' ? getToken(scheme, 'accentDanger') : getToken(scheme, 'accentUpload');
  const clamped = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));

  return (
    <View
      style={[styles.track, { backgroundColor: trackColor }]}
      accessibilityRole="progressbar"
      accessibilityValue={{ now: clamped, min: 0, max: 100 }}>
      <View style={[styles.fill, { width: `${clamped}%`, backgroundColor: fillColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});
