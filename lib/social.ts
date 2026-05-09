import { client } from './api/client';

export interface Comment {
  id: number;
  stream_id: string;
  user_id: string;
  username: string | null;
  display_name: string | null;
  content: string;
  created_at: string;
}

export async function followUser(userId: string): Promise<void> {
  await client(`/api/v1/follows/${userId}`, { method: 'POST', authRequired: true });
}

export async function unfollowUser(userId: string): Promise<void> {
  await client(`/api/v1/follows/${userId}`, { method: 'DELETE', authRequired: true });
}

export async function checkFollowStatus(userId: string): Promise<boolean> {
  const res = await client<{ following: boolean }>(`/api/v1/follows/${userId}/status`, {
    authRequired: true,
  });
  return res.following;
}

export async function listComments(
  streamId: string,
  params?: { limit?: number; before_id?: number },
): Promise<{ comments: Comment[]; count: number }> {
  const qs = new URLSearchParams();
  if (params?.limit != null) qs.set('limit', String(params.limit));
  if (params?.before_id != null) qs.set('before_id', String(params.before_id));
  const suffix = qs.toString() ? `?${qs}` : '';
  return client(`/api/v1/streams/${streamId}/comments${suffix}`);
}
