import { useState, useEffect, useRef, useCallback } from 'react';
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
import * as Clipboard from 'expo-clipboard';
import { useVideoPlayer, VideoView } from 'expo-video';
import {
  createStream,
  getStream,
  endStream,
  CreatedStream,
  Stream,
  StreamStatus,
} from '@/lib/api';

type Phase = 'form' | 'waiting' | 'connecting' | 'live';

const STATUS_DISPLAY: Record<StreamStatus, { label: string; color: string }> = {
  idle: { label: 'Waiting for broadcaster...', color: '#FFB800' },
  connected: { label: 'Connecting...', color: '#FF9500' },
  active: { label: 'LIVE', color: '#FF4458' },
  disconnected: { label: 'Reconnecting...', color: '#FFB800' },
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

        if (status === 'connected') {
          setPhase('connecting');
        } else if (status === 'active') {
          setPhase('live');
          if (!startedAtRef.current && result.stream.started_at) {
            startedAtRef.current = new Date(result.stream.started_at).getTime();
          }
        } else if (status === 'disconnected') {
          // Stay in 'live' or 'connecting' phase but show reconnecting status
          // (don't drop to waiting — Mux may resume)
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

  const copy = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Copied', `${label} copied to clipboard.`);
  };

  // ===== Live phase =====
  if (phase === 'live' && stream && currentStream) {
    const isReconnecting = currentStream.status === 'disconnected';
    return (
      <View style={styles.liveContainer}>
        <VideoView
          player={player}
          style={styles.livePreview}
          contentFit="cover"
          nativeControls={false}
        />

        {/* Top overlay: LIVE badge + duration + likes */}
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
          </View>
          <Text style={styles.liveTitle}>{stream.title}</Text>
        </View>

        <TouchableOpacity style={styles.endBtn} onPress={handleEnd}>
          <Text style={styles.endBtnText}>End Stream</Text>
        </TouchableOpacity>
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

        <Text style={styles.instructionsTitle}>To start broadcasting:</Text>
        <Text style={styles.instructions}>
          1. Open OBS Studio (or Larix Broadcaster on mobile){'\n'}
          2. Configure stream settings:{'\n'}
          {'   '}• Service: Custom{'\n'}
          {'   '}• Server: paste the RTMP URL below{'\n'}
          {'   '}• Stream Key: paste the key below{'\n'}
          3. Click Start Streaming{'\n'}
          4. This screen will switch to your live preview automatically.
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>RTMP Server URL</Text>
          <TouchableOpacity
            style={styles.copyBox}
            onPress={() => copy(stream.broadcast.rtmp_url, 'RTMP URL')}>
            <Text style={styles.copyText} numberOfLines={1}>
              {stream.broadcast.rtmp_url}
            </Text>
            <Text style={styles.copyHint}>Tap to copy</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Stream Key (keep this secret)</Text>
          <TouchableOpacity
            style={styles.copyBox}
            onPress={() => copy(stream.broadcast.stream_key, 'Stream key')}>
            <Text style={styles.copyText} numberOfLines={1}>
              {stream.broadcast.stream_key}
            </Text>
            <Text style={styles.copyHint}>Tap to copy</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Combined URL (for Larix Broadcaster)</Text>
          <TouchableOpacity
            style={styles.copyBox}
            onPress={() =>
              copy(
                `${stream.broadcast.rtmp_url}/${stream.broadcast.stream_key}`,
                'Combined URL',
              )
            }>
            <Text style={styles.copyText} numberOfLines={1}>
              {stream.broadcast.rtmp_url}/{stream.broadcast.stream_key}
            </Text>
            <Text style={styles.copyHint}>Tap to copy (use this in Larix)</Text>
          </TouchableOpacity>
        </View>

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

  instructionsTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginTop: 16 },
  instructions: { color: '#ccc', fontSize: 14, lineHeight: 22, marginTop: 8, marginBottom: 24 },

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
});