import type { ListMediaParams } from '../types';

export const mediaKeys = {
  all: ['media'] as const,
  lists: () => [...mediaKeys.all, 'list'] as const,
  list: (params: ListMediaParams) => [...mediaKeys.lists(), params] as const,
  items: () => [...mediaKeys.all, 'item'] as const,
  item: (id: string) => [...mediaKeys.items(), id] as const,
  presigned: (id: string) => [...mediaKeys.all, 'presigned', id] as const,
};
