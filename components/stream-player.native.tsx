import { useEffect, useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  LiveKitRoom,
  useTracks,
  VideoTrack,
  registerGlobals,
} from '@livekit/react-native';
import { Track } from 'livekit-client';

import { Stream, fetchViewerToken } from '@/lib/streams';
import { CommentPanel } from '@/features/social/components/comment-panel';
import { FloatingHearts } from '@/features/social/components/floating-hearts';
import { FollowButton } from '@/features/social/components/follow-button';
import { useComments } from '@/features/social/hooks/use-comments';
import { useSocket } from '@/lib/api/realtime';

// @livekit/react-native needs to install WebRTC's global types into the JS
// runtime. Calling registerGlobals once at module load is idempotent.
registerGlobals();

const { width } = Dimensions.get('window');

interface StreamPlayerProps {
  stream: Stream;
  isActive: boolean;
  playerHeight: number;
  viewerVolume: number; // 0.0 – 1.0; reserved for native volume control
}

/**
 * Inner component rendered inside <LiveKitRoom>. Uses LiveKit hooks to
 * pick the broadcaster's camera track. Kept separate so the hooks have
 * the room context available.
 */
function PublishedVideo({ playerHeight }: { playerHeight: number }) {
  const tracks = useTracks([Track.Source.Camera], { onlySubscribed: true });
  const cameraTrack = tracks[0];

  if (!cameraTrack) {
    return (
      <View style={[styles.video, styles.placeholder, { height: playerHeight }]}>
        <Text style={styles.placeholderText}>Connecting…</Text>
      </View>
    );
  }
  return (
    <VideoTrack
      trackRef={cameraTrack}
      style={StyleSheet.flatten([styles.video, { height: playerHeight }])}
      objectFit="cover"
    />
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function StreamPlayer({ stream, isActive, playerHeight, viewerVolume }: StreamPlayerProps) {
  const [heartTrigger, setHeartTrigger] = useState(0);
  const [inputText, setInputText] = useState('');
  const [viewerToken, setViewerToken] = useState<string | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  const { socket } = useSocket();
  const { comments, sendComment, sendEmote } = useComments(stream.id);

  // Fetch the viewer token on mount — do not wait for isActive. Every stream
  // in the list connects immediately so the video is ready when scrolled to.
  useEffect(() => {
    if (viewerToken) return;
    let cancelled = false;
    fetchViewerToken(stream.id)
      .then((res) => {
        if (!cancelled) setViewerToken(res.viewer_token);
      })
      .catch((err) => {
        if (!cancelled) setTokenError(String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [stream.id, viewerToken]);

  // Join the Socket.IO room for chat + control events (mute/end_stream).
  useEffect(() => {
    if (!socket || !isActive) return;
    socket.emit('join_room', { stream_id: stream.id });
    return () => {
      socket.emit('leave_room', { stream_id: stream.id });
    };
  }, [socket, isActive, stream.id]);

  const handleSend = () => {
    if (!inputText.trim()) return;
    sendComment(inputText.trim());
    setInputText('');
  };

  const handleHeart = () => {
    sendEmote('heart');
    setHeartTrigger((t) => t + 1);
  };

  const serverUrl = stream.livekit_url;
  const connect = Boolean(viewerToken && serverUrl);

  return (
    <View style={[styles.container, { height: playerHeight }]}>
      {connect && viewerToken ? (
        <LiveKitRoom
          serverUrl={serverUrl}
          token={viewerToken}
          connect
          audio={false}
          video={false}
        >
          <PublishedVideo playerHeight={playerHeight} />
        </LiveKitRoom>
      ) : (
        <View style={[styles.video, styles.placeholder, { height: playerHeight }]}>
          <Text style={styles.placeholderText}>
            {tokenError ?? (isActive ? 'Loading…' : 'Paused')}
          </Text>
        </View>
      )}

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
        <FollowButton userId={null} />
      </View>

      <CommentPanel comments={comments} />
      <FloatingHearts trigger={heartTrigger} />

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
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111',
  },
  placeholderText: { color: '#888', fontSize: 14 },
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
