import { useEffect, useRef } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import type { Comment } from '@/lib/social';

interface CommentPanelProps {
  comments: Comment[];
}

const MAX_VISIBLE = 30;

export function CommentPanel({ comments }: CommentPanelProps) {
  const listRef = useRef<FlatList>(null);
  const visible = comments.slice(-MAX_VISIBLE);

  useEffect(() => {
    if (visible.length > 0) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
    }
  }, [visible.length]);

  if (visible.length === 0) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <FlatList
        ref={listRef}
        data={visible}
        keyExtractor={(item) => String(item.id)}
        contentContainerStyle={styles.content}
        renderItem={({ item }) => (
          <View style={styles.row}>
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
          </View>
        )}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 72,
    bottom: 90,
    maxHeight: 200,
  },
  content: { gap: 6 },
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
    flex: 1,
  },
  name: { color: '#fff', fontWeight: '700', fontSize: 12 },
  message: { color: '#fff', fontSize: 13, marginTop: 1 },
});
