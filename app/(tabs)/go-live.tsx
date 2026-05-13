import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import {
  createStream,
  getStream,
  endStream,
  CreatedStream,
  Stream,
  StreamStatus,
} from '@/lib/streams';
import { CommentPanel } from '@/features/social/components/comment-panel';
import { useComments } from '@/features/social/hooks/use-comments';

type Phase = 'form' | 'waiting' | 'connecting' | 'live';

const STATUS_DISPLAY: Record<StreamStatus, { label: string; color: string }> = {
  idle: { label: 'Waiting for broadcaster...', color: '#FFB800' },
  connected: { label: 'Broadcaster connected, starting...', color: '#34C759' },
  active: { label: 'LIVE', color: '#FF4458' },
  disconnected: { label: 'Reconnecting...', color: '#FF9500' },
  ended: { label: 'Ended', color: '#666' },
};

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function GoLiveScreen() {
  const [title, setTitle] = useState('');
  const [creating, setCreating] = useState(false);
  const [stream, setStream] = useState<CreatedStream | null>(null);
  const [currentStream, setCurrentStream] = useState<Stream | null>(null);
  const [phase, setPhase] = useState<Phase>('form');
  const [duration, setDuration] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [chatInput, setChatInput] = useState('');
  const { comments, sendComment } = useComments(stream?.id ?? '');

  // Pulse animation for the LIVE dot
  useEffect(() => {
    if (phase === 'live') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.4,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [phase, pulseAnim]);

  const player = useVideoPlayer(stream?.playback_url ?? '', (p) => {
    p.loop = false;
    p.muted = true;
  });

  // Polling: track stream status changes
  useEffect(() => {
    if (phase === 'form' || !stream) return;

    const poll = async () => {
      try {
        const result = await getStream(stream.id);
        const status = result.stream.status;
        setCurrentStream(result.stream);

        if (status === 'active') {
          setPhase('live');
          if (!startedAtRef.current && result.stream.started_at) {
            startedAtRef.current = new Date(result.stream.started_at).getTime();
          }
        } else if (status === 'disconnected') {
          setPhase('connecting');
        } else if (status === 'ended') {
          setPhase('form');
          setStream(null);
          setCurrentStream(null);
          setDuration(0);
          startedAtRef.current = null;
          Alert.alert('Stream ended', 'Your broadcast has ended.');
        }
      } catch (err) {
        console.error('Poll failed:', err);
      }
    };

    poll(); // immediate poll on phase change
    pollRef.current = setInterval(poll, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [phase, stream]);

  // Duration timer (only ticks while live)
  useEffect(() => {
    if (phase === 'live' && startedAtRef.current) {
      durationRef.current = setInterval(() => {
        const elapsed = (Date.now() - (startedAtRef.current ?? Date.now())) / 1000;
        setDuration(elapsed);
      }, 1000);
      return () => {
        if (durationRef.current) clearInterval(durationRef.current);
      };
    }
  }, [phase]);

  // Player play/pause
  useEffect(() => {
    if (phase === 'live') player.play();
    else player.pause();
  }, [phase, player]);

  const handleGoLive = async () => {
    if (!title.trim()) {
      Alert.alert('Title required', 'Please enter a title for your stream.');
      return;
    }
    setCreating(true);
    try {
      const result = await createStream({ title: title.trim() });
      setStream(result.stream);
      setCurrentStream(result.stream);
      setPhase('waiting');
    } catch (err) {
      Alert.alert('Failed to create stream', String(err));
    } finally {
      setCreating(false);
    }
  };

  const handleEnd = () => {
    if (!stream) return;
    Alert.alert('End stream?', 'This will disconnect your broadcast.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End',
        style: 'destructive',
        onPress: async () => {
          try {
            await endStream(stream.id);
          } catch (err) {
            console.error('End failed:', err);
          }
          setStream(null);
          setCurrentStream(null);
          setPhase('form');
          setTitle('');
          setDuration(0);
          startedAtRef.current = null;
        },
      },
    ]);
  };

  // ===== Live phase =====
  if (phase === 'live' && stream && currentStream) {
    const isReconnecting = currentStream.status === 'disconnected';
    const handleSendChat = () => {
      if (!chatInput.trim()) return;
      sendComment(chatInput.trim());
      setChatInput('');
    };
    return (
      <View style={styles.liveContainer}>
        <VideoView
          player={player}
          style={styles.livePreview}
          contentFit="cover"
          nativeControls={false}
        />

        {/* Top overlay: status badges + end button */}
        <View style={styles.topOverlay}>
          <View style={styles.statusRow}>
            {isReconnecting ? (
              <View style={[styles.statusBadge, { backgroundColor: '#FFB800' }]}>
                <ActivityIndicator color="#fff" size="small" style={{ marginRight: 6 }} />
                <Text style={styles.statusBadgeText}>RECONNECTING</Text>
              </View>
            ) : (
              <View style={styles.statusBadge}>
                <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
                <Text style={styles.statusBadgeText}>LIVE</Text>
              </View>
            )}

            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>{formatDuration(duration)}</Text>
            </View>

            <View style={styles.likeBadge}>
              <Text style={styles.likeIcon}>❤️</Text>
              <Text style={styles.likeText}>{currentStream.like_count}</Text>
            </View>

            <TouchableOpacity style={styles.endBtnTop} onPress={handleEnd}>
              <Text style={styles.endBtnTopText}>End</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.liveTitle}>{stream.title}</Text>
        </View>

        {/* Floating comments */}
        <CommentPanel comments={comments} />

        {/* Chat input */}
        <View style={styles.chatRow}>
          <View style={styles.chatInputWrap}>
            <TextInput
              style={styles.chatInput}
              value={chatInput}
              onChangeText={setChatInput}
              placeholder="Say something..."
              placeholderTextColor="#888"
              onSubmitEditing={handleSendChat}
              returnKeyType="send"
              maxLength={500}
            />
            <TouchableOpacity onPress={handleSendChat} hitSlop={8} style={styles.sendBtn}>
              <Ionicons name="send" size={16} color={chatInput.trim() ? '#fff' : '#555'} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  // ===== Waiting / Connecting phases =====
  if ((phase === 'waiting' || phase === 'connecting') && stream && currentStream) {
    const statusInfo = STATUS_DISPLAY[currentStream.status] ?? STATUS_DISPLAY.idle;
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.statusHeader}>
          <View style={[styles.statusDot, { backgroundColor: statusInfo.color }]} />
          <Text style={[styles.statusText, { color: statusInfo.color }]}>
            {statusInfo.label}
          </Text>
          {phase === 'connecting' && (
            <ActivityIndicator color={statusInfo.color} size="small" />
          )}
        </View>
        <Text style={styles.subheading}>{stream.title}</Text>

        <Text style={styles.hint}>
          Find your RTMP URL and combined URL in Settings → Broadcasting Guide.
        </Text>

        <TouchableOpacity style={styles.cancelBtn} onPress={handleEnd}>
          <Text style={styles.cancelBtnText}>Cancel Stream</Text>
        </TouchableOpacity>
      </ScrollView>
    );
  }

  // ===== Form phase =====
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.heading}>Start a Live Stream</Text>
        <Text style={styles.subheading}>Give your stream a title to begin.</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Stream title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="What are you streaming?"
            placeholderTextColor="#666"
            style={styles.input}
            maxLength={100}
          />
        </View>

        <TouchableOpacity
          style={[styles.primaryBtn, creating && styles.btnDisabled]}
          onPress={handleGoLive}
          disabled={creating}>
          {creating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>Go Live</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { padding: 24, paddingTop: 80 },
  heading: { color: '#fff', fontSize: 28, fontWeight: '700' },
  subheading: { color: '#aaa', fontSize: 14, marginTop: 8, marginBottom: 32 },

  // Status indicators in waiting/connecting phases
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  statusText: { fontSize: 16, fontWeight: '600' },

  field: { marginBottom: 20 },
  label: { color: '#aaa', fontSize: 13, marginBottom: 8 },
  input: {
    backgroundColor: '#1a1a1a',
    color: '#fff',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    fontSize: 16,
  },
  copyBox: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  copyText: { color: '#fff', fontSize: 14, fontFamily: 'monospace' },
  copyHint: { color: '#666', fontSize: 11, marginTop: 4 },

  primaryBtn: {
    backgroundColor: '#FF4458',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: {
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 16,
  },
  cancelBtnText: { color: '#aaa', fontSize: 14 },
  hint: { color: '#555', fontSize: 13, textAlign: 'center', marginVertical: 16 },
  btnDisabled: { opacity: 0.5 },

  // Live phase
  liveContainer: { flex: 1, backgroundColor: '#000' },
  livePreview: { ...StyleSheet.absoluteFillObject },
  topOverlay: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF4458',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    gap: 6,
  },
  statusBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#fff',
  },
  durationBadge: {
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  durationText: { color: '#fff', fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },
  likeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    gap: 4,
  },
  likeIcon: { fontSize: 12 },
  likeText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  liveTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 4,
  },
  endBtn: {
    position: 'absolute',
    bottom: 40,
    alignSelf: 'center',
    backgroundColor: '#FF4458',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 999,
  },
  endBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  endBtnTop: {
    marginLeft: 'auto',
    backgroundColor: '#FF4458',
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  endBtnTopText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  chatRow: {
    position: 'absolute',
    bottom: 30,
    left: 16,
    right: 16,
  },
  chatInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 999,
    paddingVertical: 8,
    paddingLeft: 16,
    paddingRight: 8,
    gap: 8,
  },
  chatInput: { flex: 1, color: '#fff', fontSize: 14 },
  sendBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});