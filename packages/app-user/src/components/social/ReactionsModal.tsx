import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PiXBold as X,
  PiHeartFill as Heart,
  PiUserPlusFill as UserPlus,
  PiCheckBold as Check,
} from 'react-icons/pi';
import { Avatar, LevelBadge, VerifiedBadge } from '../user';
import { calculateWealthLevel, calculateLiveLevel } from '../../lib/userLevels';
import { momentsApi, usersApi } from '../../api';
import { useAuthStore, useUIStore } from '../../stores';
import { Loading } from '../ui';

interface ReactionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  momentId: string;
  initialLikes?: any[];
  likesCount: number;
}

export const ReactionsModal: React.FC<ReactionsModalProps> = ({
  isOpen,
  onClose,
  momentId,
  initialLikes,
  likesCount,
}) => {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const showToast = useUIStore((s) => s.showToast);

  const [users, setUsers] = useState<any[]>(() => {
    if (Array.isArray(initialLikes)) {
      return initialLikes.filter((u) => u && typeof u === 'object' && (u._id || u.uid));
    }
    return [];
  });
  const [loading, setLoading] = useState(false);
  const [followedMap, setFollowedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isOpen || !momentId) return;

    // If initialLikes already has populated user objects, seed with it
    if (Array.isArray(initialLikes) && initialLikes.length > 0 && typeof initialLikes[0] === 'object') {
      setUsers(initialLikes.filter((u) => u && (u._id || u.uid)));
    }

    setLoading(true);
    momentsApi
      .getLikes(momentId)
      .then(({ data }) => {
        if (data.success && Array.isArray(data.data)) {
          setUsers(data.data);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [isOpen, momentId, initialLikes]);

  if (!isOpen) return null;

  const resolveLevel = (u?: any): number => {
    if (!u) return 1;
    const rawLvl = Number(u.level) || 0;
    const wLvl = u.wealthLevel && u.wealthLevel > 1 ? u.wealthLevel : calculateWealthLevel(u.wealthExp || u.diamonds, u.wealthLevel || rawLvl).level;
    const lLvl = u.liveLevel && u.liveLevel > 1 ? u.liveLevel : calculateLiveLevel(u.liveStreamMinutes || Math.floor((u.liveStreamSeconds || 0) / 60), rawLvl).level;
    return Math.max(1, rawLvl, wLvl, lLvl);
  };

  const handleFollow = async (e: React.MouseEvent, targetId: string) => {
    e.stopPropagation();
    if (!currentUser) {
      showToast('Please login to follow creators', 'error');
      return;
    }
    try {
      await usersApi.toggleFollow(targetId);
      setFollowedMap((prev) => ({ ...prev, [targetId]: !prev[targetId] }));
    } catch {
      showToast('Could not follow user', 'error');
    }
  };

  const handleOpenProfile = (e: React.MouseEvent, userItem: any) => {
    e.stopPropagation();
    onClose();
    const isSelf = currentUser && (
      (userItem._id && currentUser._id?.toString() === userItem._id?.toString()) ||
      (userItem.uid && currentUser.uid?.toString() === userItem.uid?.toString())
    );
    if (isSelf) {
      navigate('/profile');
    } else if (userItem._id) {
      navigate(`/user/${userItem._id}`);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-sm select-none animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-2xl overflow-hidden shadow-2xl border border-line flex flex-col h-[70vh] max-h-[580px] animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-line bg-surface-soft">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 shadow-sm border border-rose-100">
              <Heart className="w-4 h-4 fill-rose-500" />
            </div>
            <h3 className="text-base font-bold text-ink">Reactions</h3>
            <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 text-xs font-black">
              {likesCount}
            </span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-surface-sunken flex items-center justify-center text-ink hover:bg-line transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Users List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading && users.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-12 text-ink-muted">
              <Loading size="md" />
              <span className="text-xs mt-2 font-medium">Loading reactions...</span>
            </div>
          ) : users.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center py-12 text-center text-ink-muted">
              <div className="w-14 h-14 rounded-full bg-surface-sunken flex items-center justify-center mb-3 text-rose-300">
                <Heart className="w-7 h-7" />
              </div>
              <p className="text-sm font-semibold text-ink">No reactions yet</p>
              <p className="text-xs text-ink-faint mt-1">Be the first to react to this post!</p>
            </div>
          ) : (
            users.map((u) => {
              const isSelf = currentUser && (
                (u._id && currentUser._id?.toString() === u._id?.toString()) ||
                (u.uid && currentUser.uid?.toString() === u.uid?.toString())
              );
              const nickname = isSelf ? (currentUser.nickname || u.nickname || 'User') : (u.nickname || 'User');
              const avatar = isSelf ? (currentUser.avatar || u.avatar) : u.avatar;
              const level = isSelf ? resolveLevel(currentUser) : resolveLevel(u);
              const isFollowed = followedMap[u._id] ?? false;

              return (
                <div
                  key={u._id || u.uid}
                  onClick={(e) => handleOpenProfile(e, u)}
                  className="flex items-center justify-between p-2.5 rounded-2xl hover:bg-surface-sunken/80 transition-colors cursor-pointer group border border-transparent hover:border-line/60"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <Avatar src={avatar} nickname={nickname} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-bold text-ink truncate group-hover:text-accent-500 transition-colors">
                          {nickname}
                        </span>
                        <VerifiedBadge verification={u.verification} />
                        <LevelBadge level={level} size="sm" />
                      </div>
                      {u.uid && (
                        <p className="text-[11px] text-ink-faint mt-0.5">
                          ID: {u.uid}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Follow or Profile Badge */}
                  {!isSelf && (
                    <button
                      onClick={(e) => handleFollow(e, u._id)}
                      className={`h-8 px-3 rounded-full text-xs font-bold transition-all shrink-0 flex items-center gap-1 active:scale-95 ${
                        isFollowed
                          ? 'bg-surface-sunken text-ink-soft border border-line'
                          : 'bg-black text-white hover:bg-neutral-800 shadow-sm'
                      }`}
                    >
                      {isFollowed ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Following</span>
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Follow</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
