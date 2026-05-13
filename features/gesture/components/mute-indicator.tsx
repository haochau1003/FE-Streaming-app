import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';

interface MuteIndicatorProps {
  visible: boolean;
}

export function MuteIndicator({ visible }: MuteIndicatorProps) {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(opacity, {
      toValue: visible ? 1 : 0,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [visible, opacity]);

  return (
    <Animated.View style={[styles.badge, { opacity }]} pointerEvents="none">
      <Text style={styles.icon}>🔇</Text>
      <Text style={styles.label}>MUTED</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 110,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(220, 30, 30, 0.85)',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  icon: { fontSize: 16 },
  label: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
