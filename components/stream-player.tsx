import { useEffect, useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEvent } from 'expo';
import { Ionicons } from '@expo/vector-icons';

import { Stream } from '@/lib/streams';
import { CommentPanel } from '@/features/social/components/comment-panel';
import { FloatingHearts } from '@/features/social/components/floating-hearts';
import { FollowButton } from '@/features/social/components/follow-button';
import { useComments } from '@/features/social/hooks/use-comments';
import { ConfettiEffect } from '@/features/gesture/components/confetti-effect';
import { HeartBurstEffect } from '@/features/gesture/components/heart-burst-effect';
import { LikeEffect } from '@/features/gesture/components/like-effect';
import { MuteIndicator } from '@/features/gesture/components/mute-indicator';
import { mapCoverCoords } from '@/features/gesture/lib/cover-coords';
import { useSocket } from '@/lib/api/realtime';

const WEBCAM_ASPECT = 16 / 9;

interface EffectState {
  trigger: number;
  anchor?: { x: number; y: number };
}

const { width } = Dimensions.get('window');

interface StreamPlayerProps {
  stream: Stream;
  isActive: boolean;
  playerHeight: number;
}

export default function StreamPlayer({ stream, isActive, playerHeight }: StreamPlayerProps) {
  const [heartTrigger, setHeartTrigger] = useState(0);
  const [heartBurstState, setHeartBurstState] = useState<EffectState>({ trigger: 0 });
  const [confettiState, setConfettiState] = useState<EffectState>({ trigger: 0 });
  const [likeState, setLikeState] = useState<EffectState>({ trigger: 0 });
  const [muted, setMuted] = useState(false);
  const [inputText, setInputText] = useState('');

  const { socket } = useSocket();
  const { comments, sendComment, sendEmote } = useComments(stream.id);

  // Join the stream's Socket.IO room and listen for gesture-triggered updates
  useEffect(() => {
    if (!socket || !isActive) return;

    const handler = (data: {
      stream_id: string;
      effect?: string;
      anchor?: { x: number; y: number };
    }) => {
      console.log('[stream-player] stream_state_update', data);
      if (data.stream_id !== stream.id) return;

      // Map normalized webcam coords through the VideoView's cover crop.
      const anchorPx = data.anchor
        ? mapCoverCoords(data.anchor.x, data.anchor.y, WEBCAM_ASPECT, width, playerHeight)
        : undefined;

      switch (data.effect) {
        case 'heart_burst':
          setHeartBurstState((s) => ({ trigger: s.trigger + 1, anchor: anchorPx }));
          break;
        case 'heart_flood':
          // Heart flood = the "like_stream" legacy fallback — keep the existing
          // bottom-right floating hearts behavior (no anchor support).
          setHeartTrigger((t) => t + 1);
          break;
        case 'like':
          setLikeState((s) => ({ trigger: s.trigger + 1, anchor: anchorPx }));
          break;
        case 'confetti':
        case 'fireworks':
          setConfettiState((s) => ({ trigger: s.trigger + 1, anchor: anchorPx }));
          break;
        case 'mute':
          setMuted((m) => !m);
          break;
      }
    };

    socket.on('stream_state_update', handler);

    return () => {
      socket.emit('leave_room', { stream_id: stream.id });
      socket.off('stream_state_update', handler);
    };
  }, [socket, isActive, stream.id]);

  const player = useVideoPlayer(stream.playback_url ?? '', (p) => {
    p.loop = false;
    p.muted = false;
  });

  useEvent(player, 'statusChange', { status: 'idle' });
  if (isActive) {
    player.play();
  } else {
    player.pause();
  }

  // Apply gesture-triggered mute to the actual audio output
  useEffect(() => {
    player.muted = muted;
  }, [player, muted]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendComment(inputText.trim());
    setInputText('');
  };

  const handleHeart = () => {
    sendEmote('heart');
    setHeartTrigger((t) => t + 1);
  };

  return (
    <View style={[styles.container, { height: playerHeight }]}>
      <VideoView
        player={player}
        style={styles.video}
        contentFit="cover"
        nativeControls={false}
      />

      {/* Top bar: avatar pill + viewer count + follow */}
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
        {/* userId will be wired once Member 2 exposes stream.user_id in the API */}
        <FollowButton userId={null} />
      </View>

      {/* Live comment overlay */}
      <CommentPanel comments={comments} />

      {/* Hearts float up from the heart button or a gesture */}
      <FloatingHearts trigger={heartTrigger} />

      {/* Gesture effects */}
      <ConfettiEffect trigger={confettiState.trigger} anchor={confettiState.anchor} />
      <HeartBurstEffect trigger={heartBurstState.trigger} anchor={heartBurstState.anchor} />
      <LikeEffect trigger={likeState.trigger} anchor={likeState.anchor} />
      <MuteIndicator visible={muted} />

      {/* Bottom row: text input + heart button */}
      <View style={styles.bottomRow}>
        <View style={styles.inputWrap}>
          <TextInput
            style={styles.input}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Type ..."
            placeholderTextColor="#888"
            onSubmitEditing={handleSend}
            returnKeyType="send"
            maxLength={500}
          />
          <TouchableOpacity onPress={handleSend} hitSlop={8} style={styles.sendBtn}>
            <Ionicons name="send" size={16} color={inputText.trim() ? '#fff' : '#555'} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={styles.heartBtn} onPress={handleHeart} activeOpacity={0.7}>
          <Text style={styles.heartIcon}>❤️</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width, backgroundColor: '#000' },
  video: { ...StyleSheet.absoluteFillObject },
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
  avatarPlaceholder: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#888' },
  username: { color: '#fff', fontSize: 14, fontWeight: '500', flex: 1 },
  viewerCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
  },
  eyeIcon: { fontSize: 16 },
  viewerNum: { color: '#fff', fontSize: 14 },
  bottomRow: {
    position: 'absolute',
    bottom: 30,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 999,
    paddingVertical: 8,
    paddingLeft: 16,
    paddingRight: 8,
    gap: 8,
  },
  input: { flex: 1, color: '#fff', fontSize: 14 },
  sendBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FF4458',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heartIcon: { fontSize: 24 },
});
