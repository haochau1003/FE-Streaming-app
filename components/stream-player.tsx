import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Image,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent } from 'expo';
import { Stream, likeStream } from '@/lib/streams';

const { width, height } = Dimensions.get('window');

interface StreamPlayerProps {
  stream: Stream;
  isActive: boolean;
}

export default function StreamPlayer({ stream, isActive }: StreamPlayerProps) {
  const [likeCount, setLikeCount] = useState(stream.like_count);
  const [liking, setLiking] = useState(false);

  const player = useVideoPlayer(stream.playback_url ?? '', (p) => {
    p.loop = false;
    p.muted = false;
  });

  // Play only the visible stream; pause the rest so audio doesn't bleed
  useEvent(player, 'statusChange', { status: 'idle' });
  if (isActive) {
    player.play();
  } else {
    player.pause();
  }

  const handleLike = async () => {
    if (liking) return;
    setLiking(true);
    // Optimistic update
    setLikeCount((c) => c + 1);
    try {
      const result = await likeStream(stream.id);
      setLikeCount(result.like_count);
    } catch (err) {
      // Revert on error
      setLikeCount((c) => c - 1);
      console.error('Like failed:', err);
    } finally {
      setLiking(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Video fills the entire background */}
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
      />

      {/* Top bar: streamer info + viewer count + follow */}
      <View style={styles.topBar}>
        <View style={styles.streamerPill}>
          <View style={styles.avatarPlaceholder} />
          <Text style={styles.username} numberOfLines={1}>
            {stream.title || 'Untitled'}
          </Text>
        </View>

        <View style={styles.viewerCount}>
          <Text style={styles.eyeIcon}>👁</Text>
          <Text style={styles.viewerNum}>—</Text>
        </View>

        <TouchableOpacity style={styles.followBtn} disabled>
          <Text style={styles.followText}>Follow</Text>
        </TouchableOpacity>
      </View>

      {/* Chat placeholder — teammate's component will go here */}
      <View style={styles.chatPlaceholder}>
        <Text style={styles.chatPlaceholderText}>💬 Chat coming soon</Text>
      </View>

      {/* Bottom row: chat input placeholder + like button */}
      <View style={styles.bottomRow}>
        <View style={styles.inputPlaceholder}>
          <Text style={styles.inputText}>Type ...</Text>
        </View>
        <TouchableOpacity
          style={styles.likeBtn}
          onPress={handleLike}
          disabled={liking}
          activeOpacity={0.7}>
          <Text style={styles.heartIcon}>❤️</Text>
        </TouchableOpacity>
      </View>

      {/* Like count overlay (small, positioned near heart) */}
      {likeCount > 0 && (
        <View style={styles.likeCountBadge}>
          <Text style={styles.likeCountText}>{likeCount}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width,
    height,
    backgroundColor: '#000',
  },
  video: {
    ...StyleSheet.absoluteFillObject,
  },
  topBar: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  streamerPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 6,
    gap: 8,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#888',
  },
  username: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  viewerCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
  },
  eyeIcon: { fontSize: 16 },
  viewerNum: { color: '#fff', fontSize: 14 },
  followBtn: {
    backgroundColor: '#FF4458',
    paddingVertical: 8,
    paddingHorizontal: 20,
    borderRadius: 999,
    opacity: 0.6, // disabled-looking
  },
  followText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  chatPlaceholder: {
    position: 'absolute',
    left: 16,
    bottom: 90,
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  chatPlaceholderText: { color: '#aaa', fontSize: 13 },
  bottomRow: {
    position: 'absolute',
    bottom: 30,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputPlaceholder: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 999,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  inputText: { color: '#888', fontSize: 14 },
  likeBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF4458',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartIcon: { fontSize: 24 },
  likeCountBadge: {
    position: 'absolute',
    bottom: 84,
    right: 28,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  likeCountText: { color: '#fff', fontSize: 12, fontWeight: '600' },
});