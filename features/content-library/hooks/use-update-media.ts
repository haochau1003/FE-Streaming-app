import { useMutation, useQueryClient } from '@tanstack/react-query';

import { client, mediaKeys } from '@/lib/api';
import type { MediaItem, Visibility } from '@/lib/types';

export interface UpdateMediaInput {
  id: string;
  title?: string;
  description?: string;
  visibility?: Visibility;
}

interface SingleResponse {
  media: MediaItem;
}

export function useUpdateMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateMediaInput) => {
      const { id, ...patch } = input;
      const res = await client<SingleResponse>(`/api/v1/media/${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: patch,
        authRequired: true,
      });
      return res.media;
    },
    onSuccess: (updated, variables) => {
      queryClient.setQueryData(mediaKeys.item(variables.id), updated);
      void queryClient.invalidateQueries({ queryKey: mediaKeys.lists() });
      if (variables.visibility) {
        queryClient.removeQueries({ queryKey: mediaKeys.presigned(variables.id) });
      }
    },
  });
}
