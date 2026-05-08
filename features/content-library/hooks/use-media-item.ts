import { useQuery } from '@tanstack/react-query';

import { client, mediaKeys } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { MediaItem } from '@/lib/types';

interface SingleResponse {
  media: MediaItem;
}

export function useMediaItem(id: string | undefined) {
  const { isReady } = useAuth();
  return useQuery({
    queryKey: id ? mediaKeys.item(id) : ['media', 'item', 'unknown'],
    enabled: Boolean(id) && isReady,
    queryFn: async ({ signal }) => {
      if (!id) throw new Error('id required');
      const res = await client<SingleResponse>(`/api/v1/media/${encodeURIComponent(id)}`, {
        signal,
      });
      return res.media;
    },
  });
}
