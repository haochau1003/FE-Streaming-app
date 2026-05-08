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
import { listStreams, Stream } from '@/lib/streams';
import StreamPlayer from '@/components/stream-player';

const { height } = Dimensions.get('window');

export default function StreamsScreen() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const fetchStreams = useCallback(async () => {
    try {
      const result = await listStreams();
      setStreams(result.streams);
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
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setActiveIndex(viewableItems[0].index);
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
        data={streams}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <StreamPlayer stream={item} isActive={index === activeIndex} />
        )}
        pagingEnabled
        showsVerticalScrollIndicator={false}
        snapToInterval={height}
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
          <View style={[styles.centered, { height }]}>
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
});