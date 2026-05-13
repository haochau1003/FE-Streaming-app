import { useCallback, useEffect, useState } from 'react';
import { useSocket } from '@/lib/api/realtime';
import { listComments, type Comment } from '@/lib/social';

export function useComments(streamId: string) {
  const { socket, connected } = useSocket();
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    if (!streamId) return;
    listComments(streamId, { limit: 50 })
      .then((res) => setComments(res.comments))
      .catch(() => {});
  }, [streamId]);

  useEffect(() => {
    if (!socket || !connected || !streamId) return;
    socket.emit('join_room', { stream_id: streamId });
  }, [socket, streamId, connected]);

  useEffect(() => {
    if (!socket) return;
    const onComment = (data: Comment) => {
      setComments((prev) => [...prev, data]);
    };
    socket.on('comment_received', onComment);
    return () => {
      socket.off('comment_received', onComment);
    };
  }, [socket]);

  const sendComment = useCallback(
    (content: string) => {
      if (!socket || !content.trim()) return;
      socket.emit('comment_send', { stream_id: streamId, content: content.trim() });
    },
    [socket, streamId],
  );

  const sendEmote = useCallback(
    (emoteType: string) => {
      if (!socket) return;
      socket.emit('emote_send', { stream_id: streamId, emote_type: emoteType });
    },
    [socket, streamId],
  );

  return { comments, sendComment, sendEmote };
}
