import { Image } from 'expo-image';
import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { ThemedText } from '@/components/themed-text';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { streamSource, streamUrl } from '@/lib/api';
import { getToken } from '@/lib/theme';
import type { MediaItem } from '@/lib/types';

import { ShareButton } from './share-button';
import { VisibilityChip } from './visibility-chip';

interface MediaTileProps {
  item: MediaItem;
  width: number;
  onPress: (id: string) => void;
  isOwner?: boolean;
  onEdit?: (item: MediaItem) => void;
  onDelete?: (item: MediaItem) => void;
}

function MediaTileImpl({ item, width, isOwner = false, onDelete, onEdit, onPress }: MediaTileProps) {
  const scheme = useColorScheme() ?? 'light';
  const placeholder = getToken(scheme, 'tilePlaceholder');
  const overlay = getToken(scheme, 'overlay');

  const isImage = item.mimetype.startsWith('image/');
  const isVideo = item.mimetype.startsWith('video/');
  const isAudio = item.mimetype.startsWith('audio/');
  const height = Math.round((width / 2) * 3);

  return (
    <Pressable
      onPress={() => onPress(item.id)}
      accessibilityRole="button"
      accessibilityLabel={`Open ${item.title || item.original_filename}`}
      style={[styles.tile, { width, height, backgroundColor: placeholder }]}>
      {isImage ? (
        <Image
          source={streamSource(item)}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={150}
        />
      ) : null}

      {isVideo ? (
        <Image
          source={item.visibility === 'private' ? undefined : `${streamUrl(item)}#t=0.5`}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={150}
        />
      ) : null}

      {isVideo || isAudio ? (
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.placeholderCenter,
            { backgroundColor: isVideo && item.visibility !== 'private' ? 'transparent' : placeholder },
          ]}>
          <IconSymbol
            name={isVideo ? 'play.fill' : 'waveform'}
            size={36}
            color={getToken(scheme, 'textSecondary')}
          />
        </View>
      ) : null}

      <View style={[styles.gradientTop, { backgroundColor: overlay }]} />
      <View style={styles.topRow}>
        <VisibilityChip visibility={item.visibility} size="sm" />
        <View style={styles.actionRow}>
          <ShareButton item={item} compact />
          {isOwner ? (
            <>
              <Pressable
                onPress={() => onEdit?.(item)}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${item.title || item.original_filename}`}
                style={styles.actionButton}>
                <IconSymbol name="pencil" size={14} color="#ffffff" />
              </Pressable>
              <Pressable
                onPress={() => onDelete?.(item)}
                accessibilityRole="button"
                accessibilityLabel={`Delete ${item.title || item.original_filename}`}
                style={styles.actionButton}>
                <IconSymbol name="trash" size={14} color="#ffffff" />
              </Pressable>
            </>
          ) : null}
        </View>
      </View>

      <View style={styles.bottomRow}>
        <ThemedText
          numberOfLines={1}
          type="defaultSemiBold"
          style={styles.title}
          lightColor="#ffffff"
          darkColor="#ffffff">
          {item.title || item.original_filename}
        </ThemedText>
      </View>
    </Pressable>
  );
}

export const MediaTile = memo(MediaTileImpl);

const styles = StyleSheet.create({
  tile: {
    overflow: 'hidden',
  },
  placeholderCenter: { alignItems: 'center', justifyContent: 'center' },
  gradientTop: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 64,
    opacity: 0.55,
  },
  topRow: {
    position: 'absolute',
    top: 6,
    left: 6,
    right: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'center',
  },
  actionButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  bottomRow: {
    position: 'absolute',
    bottom: 8,
    left: 8,
    right: 8,
  },
  title: {
    fontSize: 12,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 2,
  },
});
