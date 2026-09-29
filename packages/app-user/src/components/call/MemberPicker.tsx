import { useState } from 'react';
import { PiMagnifyingGlassBold as Search, PiCheckBold as Check } from 'react-icons/pi';
import { usersApi } from '../../api';
import { Avatar, LevelBadge } from '../user';

export interface PickedUser {
  _id: string;
  nickname: string;
  avatar?: string;
  uid?: string;
}

interface MemberPickerProps {
  /** Max selectable members (excluding the caller) — group call cap is 10 total. */
  max?: number;
  onConfirm: (users: PickedUser[]) => void;
  onClose: () => void;
}

/**
 * Search-and-pick sheet for starting a group call. Supports up to `max`
 * members (default 9 → 10 total with the caller).
 */
export const MemberPicker = ({ max = 9, onConfirm, onClose }: MemberPickerProps) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [picked, setPicked] = useState<PickedUser[]>([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      const { data } = await usersApi.searchUsers(query.trim(), { limit: 20 });
      setResults(data.data || []);
    } catch {
      // ignore — empty results shown below
    } finally {
      setSearching(false);
    }
  };

  const togglePick = (u: any) => {
    setPicked((prev) => {
      if (prev.some((p) => p._id === u._id)) return prev.filter((p) => p._id !== u._id);
      if (prev.length >= max) return prev; // cap
      return [...prev, { _id: u._id, nickname: u.nickname, avatar: u.avatar, uid: u.uid }];
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search by UID, name, or phone"
          className="flex-1 bg-dark-800 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
        <button
          onClick={handleSearch}
          disabled={searching}
          className="px-4 py-3 bg-primary-600 rounded-xl flex items-center gap-2 text-sm font-medium"
        >
          <Search className="w-4 h-4" /> {searching ? '...' : 'Search'}
        </button>
      </div>

      <p className="text-xs text-dark-400">
        Selected: {picked.length}/{max} — you'll be the {picked.length + 1}th member.
      </p>

      <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
        {results.map((u: any) => {
          const isPicked = picked.some((p) => p._id === u._id);
          return (
            <button
              key={u._id}
              onClick={() => togglePick(u)}
              className="w-full flex items-center gap-3 p-3 bg-dark-800 rounded-xl hover:bg-dark-700 transition-colors"
            >
              <Avatar src={u.avatar} nickname={u.nickname} size="md" />
              <div className="flex-1 text-left">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-sm">{u.nickname}</p>
                  <LevelBadge level={u.level} />
                </div>
                <p className="text-xs text-dark-400">UID: {u.uid}</p>
              </div>
              <span
                className={`w-6 h-6 rounded-full border flex items-center justify-center ${
                  isPicked ? 'bg-primary-600 border-primary-600' : 'border-dark-500'
                }`}
              >
                {isPicked && <Check className="w-4 h-4 text-white" />}
              </span>
            </button>
          );
        })}
        {!searching && query.trim() && results.length === 0 && (
          <p className="text-sm text-dark-400 text-center py-6">No users found for "{query}".</p>
        )}
      </div>

      <div className="flex gap-2">
        <button onClick={onClose} className="flex-1 py-3 rounded-xl bg-dark-700 text-sm font-medium">
          Cancel
        </button>
        <button
          onClick={() => picked.length > 0 && onConfirm(picked)}
          disabled={picked.length === 0}
          className="flex-1 py-3 rounded-xl bg-primary-600 text-sm font-medium disabled:opacity-40"
        >
          Start Call ({picked.length})
        </button>
      </div>
    </div>
  );
};
