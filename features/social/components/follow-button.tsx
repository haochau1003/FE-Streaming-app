import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { useFollow } from '../hooks/use-follow';

interface FollowButtonProps {
  userId: string | null;
}

export function FollowButton({ userId }: FollowButtonProps) {
  const { following, busy, toggle } = useFollow(userId);

  return (
    <TouchableOpacity
      style={[styles.btn, following && styles.following]}
      onPress={toggle}
      disabled={!userId || busy}
      activeOpacity={0.8}>
      <Text style={styles.label}>{following ? 'Following' : 'Follow'}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: '#FF4458',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 999,
  },
  following: {
    backgroundColor: '#888',
  },
  label: { color: '#fff', fontSize: 14, fontWeight: '600' },
});
