import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

interface Heart {
  id: number;
  anim: Animated.Value;
  x: number;
}

interface FloatingHeartsProps {
  trigger: number;
}

export function FloatingHearts({ trigger }: FloatingHeartsProps) {
  const [hearts, setHearts] = useState<Heart[]>([]);
  const counter = useRef(0);

  useEffect(() => {
    if (trigger === 0) return;
    const id = ++counter.current;
    const anim = new Animated.Value(0);
    const x = (Math.random() - 0.5) * 50;

    setHearts((prev) => [...prev, { id, anim, x }]);

    Animated.timing(anim, {
      toValue: 1,
      duration: 1300,
      useNativeDriver: true,
    }).start(() => {
      setHearts((prev) => prev.filter((h) => h.id !== id));
    });
  }, [trigger]);

  return (
    <View style={styles.container} pointerEvents="none">
      {hearts.map((heart) => (
        <Animated.Text
          key={heart.id}
          style={[
            styles.heart,
            {
              opacity: heart.anim.interpolate({
                inputRange: [0, 0.65, 1],
                outputRange: [1, 1, 0],
              }),
              transform: [
                {
                  translateY: heart.anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, -160],
                  }),
                },
                {
                  translateX: heart.anim.interpolate({
                    inputRange: [0, 0.5, 1],
                    outputRange: [0, heart.x, heart.x * 1.6],
                  }),
                },
                {
                  scale: heart.anim.interpolate({
                    inputRange: [0, 0.15, 0.75, 1],
                    outputRange: [0.4, 1.3, 1, 0.6],
                  }),
                },
              ],
            },
          ]}>
          ❤️
        </Animated.Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 78,
    right: 16,
    width: 56,
    height: 200,
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  heart: {
    fontSize: 26,
    position: 'absolute',
    bottom: 0,
  },
});
