import { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, Text, View } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const NUM_HEARTS = 8;

interface Heart {
  id: number;
  dx: number;
  size: number;
  anim: Animated.Value;
}

function makeHearts(): Heart[] {
  return Array.from({ length: NUM_HEARTS }, (_, i) => ({
    id: i,
    dx: (Math.random() - 0.5) * 80,
    size: 28 + Math.floor(Math.random() * 22),
    anim: new Animated.Value(0),
  }));
}

interface HeartBurstEffectProps {
  trigger: number;
  anchor?: { x: number; y: number };
}

export function HeartBurstEffect({ trigger, anchor }: HeartBurstEffectProps) {
  const heartsRef = useRef<Heart[]>(makeHearts());

  useEffect(() => {
    if (trigger === 0) return;
    heartsRef.current.forEach((h) => {
      h.dx = (Math.random() - 0.5) * 80;
      h.anim.setValue(0);
    });
    Animated.stagger(
      80,
      heartsRef.current.map((h) =>
        Animated.timing(h.anim, {
          toValue: 1,
          duration: 1600 + Math.random() * 400,
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, [trigger]);

  if (trigger === 0) return null;

  const baseX = anchor?.x ?? SCREEN_W / 2;
  const baseY = anchor?.y ?? SCREEN_H * 0.5;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {heartsRef.current.map((h) => (
        <Animated.Text
          key={h.id}
          style={[
            styles.heart,
            {
              left: baseX - h.size / 2,
              top: baseY - h.size / 2,
              fontSize: h.size,
              opacity: h.anim.interpolate({
                inputRange: [0, 0.15, 0.85, 1],
                outputRange: [0, 1, 1, 0],
              }),
              transform: [
                {
                  translateX: h.anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, h.dx],
                  }),
                },
                {
                  translateY: h.anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -180 - Math.random() * 60],
                  }),
                },
                {
                  scale: h.anim.interpolate({
                    inputRange: [0, 0.3, 1],
                    outputRange: [0.4, 1.0, 0.7],
                  }),
                },
              ],
            },
          ]}
        >
          ❤️
        </Animated.Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  heart: { position: 'absolute' },
});
