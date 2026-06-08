import { useCallback, useEffect, useState } from 'react';
import { useSocket } from '@/lib/api/realtime';
import { listComments, type Comment } from '@/lib/social';

export function useComments(streamId: string) {
  const { socket } = useSocket();
  const [comments, setComments] = useState<Comment[]>([]);

  useEffect(() => {
    listComments(streamId, { limit: 50 })
      .then((res) => setComments(res.comments))
      .catch(() => {});
  }, [streamId]);

  // Room membership is owned by stream-player (which also handles
  // leave_room on unmount). Emitting join_room here too would double the
  // backend's `viewer_joined` broadcast and inflate dashboard viewer counts.

  useEffect(() => {
    if (!socket) return;
    const onComment = (data: Comment) => {
      if (data.stream_id !== streamId) return;
      setComments((prev) => [...prev, data]);
    };
    socket.on('comment_received', onComment);
    return () => {
      socket.off('comment_received', onComment);
    };
  }, [socket, streamId]);

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
