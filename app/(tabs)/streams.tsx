import { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  ViewToken,
} from 'react-native';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { listStreams, Stream } from '@/lib/streams';
import StreamPlayer from '@/components/stream-player';

const SLIDER_WIDTH = 150;
const SLIDER_PADDING = 14;
const TRACK_WIDTH = SLIDER_WIDTH - SLIDER_PADDING * 2; // 122 — usable drag area

function volumeIcon(v: number) {
  if (v === 0) return '🔇';
  if (v < 0.35) return '🔈';
  if (v < 0.7) return '🔉';
  return '🔊';
}

const { height: windowHeight } = Dimensions.get('window');

export default function StreamsScreen() {
  const tabBarHeight = useBottomTabBarHeight();
  const playerHeight = windowHeight - tabBarHeight;

  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeStreamId, setActiveStreamId] = useState<string | null>(null);
  const [viewerVolume, setViewerVolume] = useState(1.0);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);

  const flatListRef = useRef<FlatList<Stream>>(null);

  const fetchStreams = useCallback(async () => {
    try {
      const result = await listStreams();
      setStreams(result.streams);
      // Keep watching the same stream after refresh. Only fall back to the
      // first stream if the current one is gone from the list.
      setActiveStreamId((prev) => {
        const stillInList = result.streams.some((s) => s.id === prev);
        if (stillInList) return prev;
        return result.streams.length > 0 ? result.streams[0].id : null;
      });
    } catch (err) {
      console.error('Failed to load streams:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchStreams();
  }, [fetchStreams]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchStreams();
  }, [fetchStreams]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].item) {
        setActiveStreamId(viewableItems[0].item.id);
      }
    },
  ).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 80 }).current;

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={streams}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <StreamPlayer stream={item} isActive={item.id === activeStreamId} playerHeight={playerHeight} viewerVolume={viewerVolume} />
        )}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={playerHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#fff"
            colors={['#fff']}
          />
        }
        ListEmptyComponent={
          <View style={[styles.centered, { height: playerHeight }]}>
            <Text style={styles.emptyText}>No live streams right now</Text>
            <Text style={styles.emptyHint}>Tap refresh to check again</Text>
          </View>
        }
        style={styles.list}
        contentContainerStyle={streams.length === 0 ? styles.emptyContainer : undefined}
      />

      {/* Floating refresh button — always visible, always tappable */}
      <TouchableOpacity
        style={styles.refreshBtn}
        onPress={onRefresh}
        disabled={refreshing}
        activeOpacity={0.7}>
        {refreshing ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <Text style={styles.refreshIcon}>↻</Text>
        )}
      </TouchableOpacity>

      {/* Floating volume control — speaker icon expands to a slider */}
      <View style={styles.volumeControl}>
        {showVolumeSlider && (
          <View
            style={styles.sliderContainer}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={(e) =>
              setViewerVolume(Math.max(0, Math.min(1, (e.nativeEvent.locationX - SLIDER_PADDING) / TRACK_WIDTH)))
            }
            onResponderMove={(e) =>
              setViewerVolume(Math.max(0, Math.min(1, (e.nativeEvent.locationX - SLIDER_PADDING) / TRACK_WIDTH)))
            }
          >
            <View style={styles.sliderTrack}>
              <View style={[styles.sliderFill, { width: viewerVolume * TRACK_WIDTH }]} />
            </View>
            <View style={[styles.sliderThumb, { left: SLIDER_PADDING + viewerVolume * TRACK_WIDTH - 10 }]} />
          </View>
        )}
        <TouchableOpacity
          style={styles.volumeBtn}
          onPress={() => setShowVolumeSlider((v) => !v)}
          activeOpacity={0.7}>
          <Text style={styles.volumeIcon}>{volumeIcon(viewerVolume)}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  list: { backgroundColor: '#000', flex: 1 },
  emptyContainer: { flexGrow: 1 },
  centered: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: { color: '#fff', fontSize: 18, fontWeight: '600' },
  emptyHint: { color: '#888', fontSize: 14, marginTop: 8 },
  refreshBtn: {
    position: 'absolute',
    top: 60,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(10px)', // web only, harmless on native
  },
  refreshIcon: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '600',
  },
  // Volume control: icon button + expandable slider to its left
  volumeControl: {
    position: 'absolute',
    top: 116,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sliderContainer: {
    width: SLIDER_WIDTH,
    height: 44,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderRadius: 22,
    paddingHorizontal: 14,
  },
  sliderTrack: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  sliderFill: {
    height: 4,
    backgroundColor: '#fff',
    borderRadius: 2,
  },
  sliderThumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    top: 12, // (44 - 20) / 2
  },
  volumeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    backdropFilter: 'blur(10px)',
  },
  volumeIcon: {
    fontSize: 22,
  },
});