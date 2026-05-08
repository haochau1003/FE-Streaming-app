import { Image } from 'expo-image';
import { useAudioPlayer, useAudioPlayerStatus } from 'expo-audio';
import { useVideoPlayer, VideoView } from 'expo-video';
import { memo, useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { streamSource, streamUrl } from '@/lib/api';
import { getToken } from '@/lib/theme';
import type { MediaItem } from '@/lib/types';

interface MediaRendererProps {
  item: MediaItem;
}

function MediaRendererImpl({ item }: MediaRendererProps) {
  if (item.mimetype.startsWith('image/')) {
    return <ImageRenderer item={item} />;
  }
  if (item.mimetype.startsWith('video/')) {
    return <VideoRenderer item={item} />;
  }
  if (item.mimetype.startsWith('audio/')) {
    return <AudioRenderer item={item} />;
  }
  return <UnknownRenderer item={item} />;
}

export const MediaRenderer = memo(MediaRendererImpl);

function ImageRenderer({ item }: { item: MediaItem }) {
  return (
    <View style={styles.imageContainer}>
      <Image
        source={streamSource(item)}
        style={StyleSheet.absoluteFill}
        contentFit="contain"
        transition={150}
        accessibilityLabel={item.title || item.original_filename}
      />
    </View>
  );
}

function VideoRenderer({ item }: { item: MediaItem }) {
  if (item.visibility === 'private') {
    return <PrivateVideoFallback item={item} />;
  }
  return <PublicVideoPlayer item={item} />;
}

function PublicVideoPlayer({ item }: { item: MediaItem }) {
  const player = useVideoPlayer(streamUrl(item), (p) => {
    p.loop = false;
  });

  return (
    <View style={styles.videoContainer}>
      <VideoView
        style={StyleSheet.absoluteFill}
        player={player}
        allowsFullscreen
        allowsPictureInPicture
        contentFit="contain"
      />
    </View>
  );
}

function PrivateVideoFallback({ item }: { item: MediaItem }) {
  const scheme = useColorScheme() ?? 'light';
  const bg = getToken(scheme, 'tilePlaceholder');
  const fg = getToken(scheme, 'textSecondary');

  return (
    <View style={[styles.videoContainer, styles.fallback, { backgroundColor: bg }]}>
      <IconSymbol name="lock.fill" size={48} color={fg} />
      <ThemedText type="defaultSemiBold">Private video</ThemedText>
      <ThemedText style={styles.fallbackText}>
        Inline streaming for private items isn’t available yet. Download to view.
      </ThemedText>
      <ThemedText style={styles.fallbackHint}>File: {item.original_filename}</ThemedText>
    </View>
  );
}

function AudioRenderer({ item }: { item: MediaItem }) {
  if (item.visibility === 'private') {
    return <PrivateMediaFallback item={item} kind="audio" />;
  }

  const scheme = useColorScheme() ?? 'light';
  const bg = getToken(scheme, 'tilePlaceholder');
  const accent = getToken(scheme, 'accentUpload');

  const player = useAudioPlayer(streamUrl(item));
  const status = useAudioPlayerStatus(player);

  useEffect(() => {
    if (status.didJustFinish) {
      player.seekTo(0);
    }
  }, [status.didJustFinish, player]);

  const isPlaying = status.playing ?? false;

  const togglePlay = () => {
    if (isPlaying) player.pause();
    else player.play();
  };

  return (
    <View style={[styles.audioContainer, { backgroundColor: bg }]}>
      <IconSymbol name="waveform" size={64} color={accent} />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? 'Pause audio' : 'Play audio'}
        onPress={togglePlay}
        style={[styles.audioButton, { backgroundColor: accent }]}>
        <IconSymbol name={isPlaying ? 'pause.fill' : 'play.fill'} size={28} color="#ffffff" />
      </Pressable>
      <ThemedText type="defaultSemiBold" numberOfLines={1}>
        {item.title || item.original_filename}
      </ThemedText>
    </View>
  );
}

function PrivateMediaFallback({ item, kind }: { item: MediaItem; kind: 'audio' }) {
  const scheme = useColorScheme() ?? 'light';
  const bg = getToken(scheme, 'tilePlaceholder');
  const fg = getToken(scheme, 'textSecondary');

  return (
    <View style={[styles.audioContainer, styles.fallback, { backgroundColor: bg }]}>
      <IconSymbol name="lock.fill" size={48} color={fg} />
      <ThemedText type="defaultSemiBold">Private {kind}</ThemedText>
      <ThemedText style={styles.fallbackText}>
        Inline playback for private items is not available yet. Download to view.
      </ThemedText>
      <ThemedText style={styles.fallbackHint}>File: {item.original_filename}</ThemedText>
    </View>
  );
}

function UnknownRenderer({ item }: { item: MediaItem }) {
  const scheme = useColorScheme() ?? 'light';
  const bg = getToken(scheme, 'tilePlaceholder');
  return (
    <View style={[styles.audioContainer, { backgroundColor: bg }]}>
      <IconSymbol name="doc.fill" size={48} color={getToken(scheme, 'textSecondary')} />
      <ThemedText type="defaultSemiBold">{item.original_filename}</ThemedText>
      <ThemedText style={styles.fallbackHint}>Type: {item.mimetype}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  imageContainer: {
    aspectRatio: 1,
    width: '100%',
    backgroundColor: '#000',
  },
  videoContainer: {
    aspectRatio: 16 / 9,
    width: '100%',
    backgroundColor: '#000',
    overflow: 'hidden',
  },
  fallback: { alignItems: 'center', justifyContent: 'center', padding: 24, gap: 8 },
  fallbackText: { textAlign: 'center', opacity: 0.8 },
  fallbackHint: { textAlign: 'center', opacity: 0.6, fontSize: 12 },
  audioContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 16,
    aspectRatio: 16 / 9,
    width: '100%',
  },
  audioButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
