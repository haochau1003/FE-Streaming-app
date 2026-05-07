import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';

import { client, mediaKeys } from '@/lib/api';
import type { ListMediaParams, MediaListResponse } from '@/lib/types';

export interface UseMediaListParams {
  ownerId?: string;
  visibility?: 'public' | 'private' | 'unlisted';
  mimetypePrefix?: string;
  perPage?: number;
  enabled?: boolean;
}

export function useMediaList(params: UseMediaListParams) {
  const requestParams: ListMediaParams = {
    owner_id: params.ownerId,
    visibility: params.visibility,
    mimetype_prefix: params.mimetypePrefix,
    per_page: params.perPage ?? 24,
  };

  return useInfiniteQuery<
    MediaListResponse,
    Error,
    InfiniteData<MediaListResponse>,
    ReturnType<typeof mediaKeys.list>,
    number
  >({
    queryKey: mediaKeys.list(requestParams),
    enabled: params.enabled ?? true,
    initialPageParam: 1,
    queryFn: async ({ pageParam, signal }) => {
      const search = new URLSearchParams();
      search.set('page', String(pageParam));
      search.set('per_page', String(requestParams.per_page ?? 24));
      if (requestParams.owner_id) search.set('owner_id', requestParams.owner_id);
      if (requestParams.visibility) search.set('visibility', requestParams.visibility);
      if (requestParams.mimetype_prefix)
        search.set('mimetype_prefix', requestParams.mimetype_prefix);
      return client<MediaListResponse>(`/api/v1/media?${search.toString()}`, { signal });
    },
    getNextPageParam: (last) => (last.page < last.total_pages ? last.page + 1 : undefined),
  });
}
