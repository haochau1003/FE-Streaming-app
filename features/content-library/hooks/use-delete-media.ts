import { useMutation, useQueryClient } from '@tanstack/react-query';

import { client, mediaKeys } from '@/lib/api';

export function useDeleteMedia() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await client(`/api/v1/media/${encodeURIComponent(id)}`, {
        method: 'DELETE',
        authRequired: true,
      });
      return id;
    },
    onSuccess: (id) => {
      queryClient.removeQueries({ queryKey: mediaKeys.item(id) });
      queryClient.removeQueries({ queryKey: mediaKeys.presigned(id) });
      void queryClient.invalidateQueries({ queryKey: mediaKeys.lists() });
    },
  });
}
