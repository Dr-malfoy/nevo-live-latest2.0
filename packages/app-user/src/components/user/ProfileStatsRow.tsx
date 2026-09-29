import { useNavigate } from 'react-router-dom';
import type { ProfileStats, RelationListType } from '../../types';
import { compactNumber } from '../../lib/time';

interface ProfileStatsRowProps {
  userId: string;
  stats?: ProfileStats | null;
  /** Visitors are private — hidden on someone else's profile. */
  showVisitors?: boolean;
  loading?: boolean;
  className?: string;
}

const ITEMS: { key: RelationListType; label: string }[] = [
  { key: 'friends', label: 'Friends' },
  { key: 'following', label: 'Following' },
  { key: 'followers', label: 'Followers' },
  { key: 'visitors', label: 'Visitors' },
];

/**
 * Requirement #2 — the four counts.
 *
 *   [Friends] [Following] [Followers] [Visitors]
 *
 * Each one opens its full list.
 */
export const ProfileStatsRow = ({
  userId,
  stats,
  showVisitors = true,
  loading = false,
  className = '',
}: ProfileStatsRowProps) => {
  const navigate = useNavigate();
  const items = showVisitors ? ITEMS : ITEMS.filter((i) => i.key !== 'visitors');

  return (
    <div className={`flex items-stretch ${className}`}>
      {items.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => navigate(`/user/${userId}/${key}`)}
          className="flex-1 flex flex-col items-center gap-0.5 py-1 active:opacity-60 transition-opacity"
        >
          <span className="text-lg font-bold text-ink tabular-nums">
            {loading ? <span className="inline-block w-8 h-5 rounded skeleton align-middle" /> : compactNumber(stats?.[key])}
          </span>
          <span className="text-xs text-ink-muted">{label}</span>
        </button>
      ))}
    </div>
  );
};
