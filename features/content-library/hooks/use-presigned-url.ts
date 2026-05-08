import { useQuery } from '@tanstack/react-query';

import { client, mediaKeys } from '@/lib/api';
import type { PresignedUrlResponse, Visibility } from '@/lib/types';

const REFRESH_BUFFER_MS = 30_000;

export function usePresignedUrl(id: string | undefined, visibility: Visibility | undefined) {
  const enabled = Boolean(id) && (visibility === 'public' || visibility === 'unlisted');
  return useQuery({
    queryKey: id ? mediaKeys.presigned(id) : ['media', 'presigned', 'unknown'],
    enabled,
    queryFn: async ({ signal }) => {
      if (!id) throw new Error('id required');
      return client<PresignedUrlResponse>(`/api/v1/media/${encodeURIComponent(id)}/url`, {
        signal,
      });
    },
    staleTime: (q) => {
      const data = q.state.data as PresignedUrlResponse | undefined;
      if (!data) return 0;
      const expiresAt = new Date(data.expires_at).getTime();
      const remaining = expiresAt - Date.now() - REFRESH_BUFFER_MS;
      return Math.max(0, remaining);
    },
    refetchInterval: (q) => {
      const data = q.state.data as PresignedUrlResponse | undefined;
      if (!data) return false;
      const expiresAt = new Date(data.expires_at).getTime();
      const remaining = expiresAt - Date.now() - REFRESH_BUFFER_MS;
      return Math.max(15_000, remaining);
    },
  });
}
