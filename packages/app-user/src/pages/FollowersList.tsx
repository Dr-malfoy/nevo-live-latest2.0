import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PiCaretLeftBold as ArrowLeft, PiUsersFill as Users } from 'react-icons/pi';
import { usersApi } from '../api';
import { useAuthStore } from '../stores';
import { UserListRow } from '../components/user';
import { Loading } from '../components/ui';
import type { RelationListType, UserPublic } from '../types';

type Row = UserPublic & { visitTime?: string };

const TABS: { key: RelationListType; label: string }[] = [
  { key: 'friends', label: 'Friends' },
  { key: 'following', label: 'Following' },
  { key: 'followers', label: 'Followers' },
  { key: 'visitors', label: 'Visitors' },
];

const EMPTY_COPY: Record<RelationListType, { title: string; hint: string }> = {
  friends: { title: 'No friends yet', hint: 'Friends are people you follow who follow you back.' },
  following: { title: 'Not following anyone', hint: 'Follow hosts you like to see them here.' },
  followers: { title: 'No followers yet', hint: 'Go live and share your profile to grow your audience.' },
  visitors: { title: 'No visitors yet', hint: 'People who view your profile in the last 7 days show up here.' },
};

const FETCHERS: Record<RelationListType, (id: string) => Promise<any>> = {
  friends: (id) => usersApi.getFriends(id),
  following: (id) => usersApi.getFollowing(id),
  followers: (id) => usersApi.getFollowers(id),
  visitors: (id) => usersApi.getVisitors(id),
};

const isListType = (value?: string): value is RelationListType =>
  !!value && TABS.some((t) => t.key === value);

/**
 * Requirement #2 — the list behind each profile count.
 *
 * One screen with four tabs: Friends, Following, Followers and Visitors.
 * Visitors is owner-only (the API rejects anyone else), so the tab is hidden
 * when viewing someone else's profile.
 */
export const FollowersList = () => {
  const { id, listType } = useParams<{ id: string; listType: string }>();
  const navigate = useNavigate();
  const currentUserId = useAuthStore((s) => s.user?._id);

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile = !!id && id === currentUserId;
  const active: RelationListType = isListType(listType) ? listType : 'followers';
  const tabs = isOwnProfile ? TABS : TABS.filter((t) => t.key !== 'visitors');

  useEffect(() => {
    if (!id) return;
    let cancelled = false;

    setLoading(true);
    setError(null);
    setRows([]);

    FETCHERS[active](id)
      .then(({ data }) => {
        if (cancelled) return;
        if (data.success) setRows(data.data || []);
        else setError(data.error || 'Could not load this list');
      })
      .catch((err: any) => {
        if (!cancelled) setError(err.response?.data?.error || 'Could not load this list');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [id, active]);

  const empty = EMPTY_COPY[active];

  return (
    <div className="min-h-screen bg-surface-soft">
      <header className="sticky top-0 z-20 bg-white border-b border-line">
        <div className="flex items-center gap-3 px-4 h-14">
          <button onClick={() => navigate(-1)} aria-label="Back" className="-ml-1 p-1 text-ink">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <h1 className="text-base font-bold text-ink">{isOwnProfile ? 'My Connections' : 'Connections'}</h1>
        </div>

        <div className="flex items-center gap-5 px-4 overflow-x-auto no-scrollbar">
          {tabs.map(({ key, label }) => {
            const isActive = key === active;
            return (
              <button
                key={key}
                onClick={() => navigate(`/user/${id}/${key}`, { replace: true })}
                className={`relative shrink-0 pb-2.5 pt-1 text-sm transition-colors ${
                  isActive ? 'text-ink font-bold' : 'text-ink-faint font-medium'
                }`}
              >
                {label}
                {isActive && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-[3px] rounded-full bg-black text-white" />
                )}
              </button>
            );
          })}
        </div>
      </header>

      {loading ? (
        <Loading className="pt-20" size="lg" />
      ) : error ? (
        <div className="text-center pt-20 px-8">
          <p className="text-base font-semibold text-ink mb-1">{error}</p>
          <button onClick={() => navigate(-1)} className="mt-4 h-9 px-4 btn-secondary text-sm">
            Go back
          </button>
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center pt-20 px-8">
          <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center mx-auto mb-4">
            <Users className="w-6 h-6 text-ink-ghost" />
          </div>
          <p className="text-base font-semibold text-ink mb-1">{empty.title}</p>
          <p className="text-sm text-ink-muted">{empty.hint}</p>
        </div>
      ) : (
        <div className="mt-3 bg-white divide-y divide-line">
          {rows.map((row) => (
            <UserListRow
              key={row._id}
              user={row}
              // Requirement #2 — "Click Korle Full List + Profile Pic + Follow Button"
              showFollow={row._id !== currentUserId}
              showVisitTime={active === 'visitors'}
            />
          ))}
        </div>
      )}
    </div>
  );
};
