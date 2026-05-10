import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { checkFollowStatus, followUser, unfollowUser } from '@/lib/social';

export function useFollow(userId: string | null) {
  const { apiKey } = useAuth();
  const [following, setFollowing] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!userId || !apiKey) return;
    checkFollowStatus(userId)
      .then(setFollowing)
      .catch(() => {});
  }, [userId, apiKey]);

  const toggle = useCallback(async () => {
    if (!userId || busy) return;
    setBusy(true);
    const prev = following;
    setFollowing(!prev);
    try {
      if (prev) await unfollowUser(userId);
      else await followUser(userId);
    } catch {
      setFollowing(prev);
    } finally {
      setBusy(false);
    }
  }, [userId, following, busy]);

  return { following, busy, toggle };
}
