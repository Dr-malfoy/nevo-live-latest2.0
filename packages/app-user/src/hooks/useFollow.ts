import { useCallback, useEffect, useRef, useState } from 'react';
import { usersApi } from '../api';
import { useUIStore } from '../stores';

interface UseFollowOptions {
  targetUserId?: string | null;
  /** Initial server-known state (from a profile fetch) — avoids an extra round-trip. */
  initialFollowing?: boolean;
  onCountsChange?: (followers: number) => void;
}

/**
 * Explicit follow/unfollow hook.
 *
 * - Reads the real relationship state (server truth), never blind-toggles.
 * - Branches: already following → UNFOLLOW, else → FOLLOW.
 * - Locks while a request is in flight (prevents rapid-click duplicates).
 * - Only flips local state after the DB operation succeeds; refreshes on failure.
 */
export const useFollow = ({ targetUserId, initialFollowing, onCountsChange }: UseFollowOptions = {}) => {
  const showToast = useUIStore((s) => s.showToast);
  const [following, setFollowing] = useState(!!initialFollowing);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);

  // Adopt server-truth when it arrives (e.g. profile loads after mount)
  useEffect(() => {
    if (typeof initialFollowing === 'boolean') setFollowing(initialFollowing);
  }, [initialFollowing]);

  const refresh = useCallback(async () => {
    if (!targetUserId) return;
    try {
      const { data } = await usersApi.getFollowStatus(targetUserId);
      if (data.success && data.data) {
        setFollowing(!!data.data.following);
        onCountsChange?.(data.data.followers);
      }
    } catch {
      // non-fatal
    }
  }, [targetUserId, onCountsChange]);

  // Load real state once when the target appears
  useEffect(() => {
    if (!targetUserId || typeof initialFollowing === 'boolean') return;
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUserId]);

  const toggle = useCallback(async () => {
    if (!targetUserId || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);

    const action = following ? usersApi.unfollow : usersApi.follow;
    try {
      const { data } = await action(targetUserId);
      if (data.success && data.data) {
        setFollowing(!!data.data.following);
        if (typeof data.data.followers === 'number') onCountsChange?.(data.data.followers);
      } else {
        await refresh();
        showToast(data.error || 'Action failed', 'error');
      }
    } catch (err: any) {
      // Roll back to server truth on failure
      await refresh();
      showToast(err.response?.data?.error || 'Action failed, please try again', 'error');
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  }, [targetUserId, following, refresh, onCountsChange, showToast]);

  return { following, busy, toggle, refresh };
};
