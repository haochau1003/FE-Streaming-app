import * as Linking from 'expo-linking';
import { Platform, Pressable, Share, StyleSheet } from 'react-native';

import { IconSymbol } from '@/components/ui/icon-symbol';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getToken } from '@/lib/theme';
import { useToast } from '@/lib/toast';
import type { MediaItem } from '@/lib/types';

import { usePresignedUrl } from '../hooks/use-presigned-url';

interface ShareButtonProps {
  item: MediaItem;
  compact?: boolean;
}

export function ShareButton({ compact = false, item }: ShareButtonProps) {
  const scheme = useColorScheme() ?? 'light';
  const bg = getToken(scheme, 'bgCard');
  const fg = getToken(scheme, 'textPrimary');
  const toast = useToast();
  const presigned = usePresignedUrl(item.id, item.visibility === 'public' ? item.visibility : undefined);

  if (item.visibility === 'private') return null;

  const onPress = async () => {
    const url =
      item.visibility === 'public'
        ? (presigned.data?.url ?? (await presigned.refetch()).data?.url)
        : Linking.createURL(`/library/${item.id}`);

    if (!url) {
      toast.show({ level: 'warning', title: 'Link unavailable', message: 'Try again in a moment.' });
      return;
    }

    if (item.visibility === 'unlisted') {
      toast.show({
        level: 'info',
        title: 'Unlisted link',
        message: 'Anyone with this link can view the item.',
      });
    }

    try {
      if (Platform.OS === 'web') {
        const nav = (typeof navigator !== 'undefined' ? navigator : undefined) as
          | (Navigator & { share?: (data: { title?: string; url?: string }) => Promise<void> })
          | undefined;
        if (nav?.share) {
          await nav.share({ title: item.title || item.original_filename, url });
        } else {
          await Linking.openURL(url);
        }
        return;
      }
      await Share.share({ message: url, url, title: item.title || item.original_filename });
    } catch (e) {
      if (e instanceof Error && (e.name === 'AbortError' || e.message.includes('cancel'))) return;
      toast.show({
        level: 'error',
        title: 'Share failed',
        message: e instanceof Error ? e.message : 'Unknown error',
      });
    }
  };

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel="Share this item"
      style={[
        compact ? styles.compactButton : styles.button,
        { backgroundColor: compact ? 'rgba(0,0,0,0.5)' : bg },
      ]}>
      <IconSymbol name="square.and.arrow.up" size={compact ? 14 : 20} color={compact ? '#ffffff' : fg} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
