import { useEffect, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, View } from 'react-native';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const NUM_PARTICLES = 50;

const COLORS = ['#FF5252', '#40C4FF', '#69F0AE', '#FFD740', '#E040FB', '#FF6D00'];

interface Particle {
  id: number;
  x: number;
  color: string;
  size: number;
  anim: Animated.Value;
}

function makeParticles(): Particle[] {
  return Array.from({ length: NUM_PARTICLES }, (_, i) => ({
    id: i,
    x: Math.random() * SCREEN_W,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    size: 6 + Math.floor(Math.random() * 10),
    anim: new Animated.Value(0),
  }));
}

interface ConfettiEffectProps {
  trigger: number;
}

export function ConfettiEffect({ trigger }: ConfettiEffectProps) {
  const particlesRef = useRef<Particle[]>(makeParticles());

  useEffect(() => {
    if (trigger === 0) return;
    // Re-seed positions on each trigger
    particlesRef.current.forEach((p) => {
      p.x = Math.random() * SCREEN_W;
      p.anim.setValue(0);
    });

    Animated.stagger(
      20,
      particlesRef.current.map((p) =>
        Animated.timing(p.anim, {
          toValue: 1,
          duration: 1800 + Math.random() * 600,
          useNativeDriver: true,
        }),
      ),
    ).start();
  }, [trigger]);

  if (trigger === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particlesRef.current.map((p) => (
        <Animated.View
          key={p.id}
          style={[
            styles.particle,
            {
              left: p.x,
              width: p.size,
              height: p.size,
              borderRadius: p.size / 4,
              backgroundColor: p.color,
              opacity: p.anim.interpolate({
                inputRange: [0, 0.7, 1],
                outputRange: [1, 0.9, 0],
              }),
              transform: [
                {
                  translateY: p.anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-20, SCREEN_H + 40],
                  }),
                },
                {
                  rotate: p.anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', `${(Math.random() > 0.5 ? 1 : -1) * 720}deg`],
                  }),
                },
              ],
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: 'absolute',
    top: 0,
  },
});
