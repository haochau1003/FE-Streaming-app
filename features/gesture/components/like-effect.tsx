import { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

interface LikeEffectProps {
  trigger: number;
  anchor?: { x: number; y: number };
}

export function LikeEffect({ trigger, anchor }: LikeEffectProps) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (trigger === 0) return;
    anim.setValue(0);
    Animated.sequence([
      Animated.spring(anim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 4,
        tension: 80,
      }),
      Animated.delay(600),
      Animated.timing(anim, {
        toValue: 2,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [trigger, anim]);

  if (trigger === 0) return null;

  const scale = anim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, 1, 1.4],
  });
  const opacity = anim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, 1, 0],
  });
  const translateY = anim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [40, 0, -80],
  });

  // BADGE_W/H are matched to the styles below. We anchor by centering on (x,y).
  const BADGE_W = 160;
  const BADGE_H = 140;
  const left = anchor ? anchor.x - BADGE_W / 2 : SCREEN_W / 2 - BADGE_W / 2;
  const top = anchor ? anchor.y - BADGE_H / 2 : SCREEN_H * 0.4;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Animated.View
        style={[
          styles.badge,
          {
            left,
            top,
            opacity,
            transform: [{ translateY }, { scale }],
          },
        ]}
      >
        <Text style={styles.icon}>👍</Text>
        <Text style={styles.label}>LIKE!</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    width: 160,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 200, 0, 0.95)',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  icon: { fontSize: 64 },
  label: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '800',
    marginTop: 4,
    letterSpacing: 2,
  },
});
