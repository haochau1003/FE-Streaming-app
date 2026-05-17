import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { Stream, listStreams } from '@/lib/streams';

/**
 * Go-Live screen — substantially simplified after the Mux → LiveKit swap.
 *
 * Why: in the new architecture the broadcaster is a laptop-side Python
 * process (Streaming-App/broadcaster/__main__.py — see decision-003).
 * It opens the camera, runs MediaPipe + Skia compositing, publishes
 * audio + video to LiveKit, and POSTs `/api/v1/streams` itself.
 *
 * There is nothing useful for a phone-only viewer app to "Go Live" with
 * here: no RTMP key to copy into OBS, no camera capture in RN. So this
 * tab becomes an at-a-glance status panel:
 *   - "Run `./start.sh` on the broadcaster laptop to begin a stream."
 *   - When a stream is detected as active, link the user back to the
 *     Streams tab so they can watch.
 */
export default function GoLiveScreen() {
  const router = useRouter();
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await listStreams();
      setStreams(res.streams);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} />}
    >
      <Text style={styles.heading}>Go Live</Text>
      <Text style={styles.body}>
        Streaming is started from the broadcaster laptop, not from this app.
        Run <Text style={styles.code}>./start.sh</Text> on the laptop that has
        the camera and microphone, then come back here to watch.
      </Text>

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>Backend unreachable: {error}</Text>
        </View>
      ) : null}

      <Text style={styles.sectionHeading}>Currently live</Text>
      {loading && streams.length === 0 ? (
        <ActivityIndicator color="#fff" style={{ marginTop: 16 }} />
      ) : streams.length === 0 ? (
        <Text style={styles.muted}>No active streams yet.</Text>
      ) : (
        streams.map((s) => (
          <TouchableOpacity
            key={s.id}
            style={styles.streamRow}
            onPress={() => router.push('/(tabs)')}
          >
            <View style={styles.statusDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.streamTitle} numberOfLines={1}>
                {s.title || 'Untitled'}
              </Text>
              <Text style={styles.streamMeta}>
                Started {s.started_at ? new Date(s.started_at).toLocaleTimeString() : 'pending…'}
                {'  •  '}❤ {s.like_count}
              </Text>
            </View>
            <Text style={styles.chevron}>›</Text>
          </TouchableOpacity>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  content: { padding: 24, paddingTop: 80 },
  heading: { color: '#fff', fontSize: 28, fontWeight: '700' },
  body: { color: '#bbb', fontSize: 14, lineHeight: 22, marginTop: 12 },
  code: {
    fontFamily: 'monospace',
    color: '#fff',
    backgroundColor: '#1a1a1a',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  errorBox: {
    backgroundColor: '#3a1a1a',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  errorText: { color: '#ffb3b3', fontSize: 13 },

  sectionHeading: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 28,
    marginBottom: 12,
  },
  muted: { color: '#666', fontSize: 14 },

  streamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    gap: 12,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF4458',
  },
  streamTitle: { color: '#fff', fontSize: 15, fontWeight: '500' },
  streamMeta: { color: '#888', fontSize: 12, marginTop: 2 },
  chevron: { color: '#666', fontSize: 24 },
});
