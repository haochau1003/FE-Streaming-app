import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import type { Comment } from '@/lib/social';

interface CommentPanelProps {
  comments: Comment[];
}

interface CommentRowProps {
  item: Comment;
  opacity: number;
}

function CommentRow({ item, opacity }: CommentRowProps) {
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.timing(translateY, {
      toValue: 0,
      duration: 280,
      useNativeDriver: true,
    }).start();
  }, [translateY]);

  return (
    <Animated.View style={[styles.row, { opacity, transform: [{ translateY }] }]}>
      <View style={styles.avatar}>
        <Text style={styles.avatarLetter}>
          {(item.display_name || item.username || 'U')[0].toUpperCase()}
        </Text>
      </View>
      <View style={styles.bubble}>
        <Text style={styles.name} numberOfLines={1}>
          {item.display_name || item.username || 'User'}
        </Text>
        <Text style={styles.message}>{item.content}</Text>
      </View>
    </Animated.View>
  );
}

const MAX_VISIBLE = 6;

export function CommentPanel({ comments }: CommentPanelProps) {
  const visible = comments.slice(-MAX_VISIBLE);
  const count = visible.length;

  if (count === 0) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      {visible.map((item, index) => {
        const opacity = count === 1 ? 1 : 0.25 + 0.75 * (index / (count - 1));
        return <CommentRow key={String(item.id)} item={item} opacity={opacity} />;
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 72,
    bottom: 90,
    gap: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#555',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    marginTop: 2,
  },
  avatarLetter: { color: '#fff', fontSize: 12, fontWeight: '700' },
  bubble: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  name: { color: '#fff', fontWeight: '700', fontSize: 12 },
  message: { color: '#fff', fontSize: 13, marginTop: 1 },
});
