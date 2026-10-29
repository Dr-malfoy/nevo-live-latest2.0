import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PiXBold as X,
  PiGiftFill as GiftIcon,
  PiUserPlusBold as FollowIcon,
  PiCheckBold as CheckIcon,
  PiIdentificationCardFill as IdCardIcon,
  PiSparkleFill as SparkleIcon,
  PiUserFill as UserIcon,
} from 'react-icons/pi';
import { usersApi } from '../../api';
import { initial } from '../../lib/time';
import type { PublicProfile } from '../../types';

interface UserProfileModalProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenGiftToUser?: (userId: string) => void;
  currentUserId?: string;
}

export const UserProfileModal = ({
  userId,
  isOpen,
  onClose,
  onOpenGiftToUser,
  currentUserId,
}: UserProfileModalProps) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !userId) {
      setProfile(null);
      return;
    }

    setLoading(true);
    usersApi
      .getPublicProfile(userId)
      .then(({ data }) => {
        if (data.success && data.data) {
          setProfile(data.data as PublicProfile);
          setIsFollowing(Boolean((data.data as any).isFollowing));
        }
      })
      .catch((err) => {
        console.warn('[UserProfileModal] Failed to fetch profile:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [isOpen, userId]);

  const handleToggleFollow = async () => {
    if (!profile || followLoading) return;
    setFollowLoading(true);
    try {
      if (isFollowing) {
        await usersApi.unfollow(profile._id);
        setIsFollowing(false);
        setProfile((prev: any) => (prev ? { ...prev, followerCount: Math.max(0, (prev.followerCount || prev.followersCount || 1) - 1) } : prev));
      } else {
        await usersApi.follow(profile._id);
        setIsFollowing(true);
        setProfile((prev: any) => (prev ? { ...prev, followerCount: ((prev.followerCount || prev.followersCount || 0) + 1) } : prev));
      }
    } catch (e) {
      console.warn('[UserProfileModal] follow toggle error:', e);
    } finally {
      setFollowLoading(false);
    }
  };

  const isSelf = Boolean(currentUserId && profile && profile._id === currentUserId);

  const handleOpenFullProfile = () => {
    if (!profile?._id) return;
    onClose();
    navigate(isSelf ? '/profile' : `/user/${profile._id}`);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 pointer-events-auto select-none">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/65 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: 'spring', damping: 22, stiffness: 350 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-xs bg-[#161726]/95 border border-white/15 rounded-3xl p-5 shadow-2xl z-10 text-white flex flex-col items-center gap-3.5 backdrop-blur-2xl"
          >
            {/* Close Button */}
            <button
              onClick={onClose}
              className="absolute top-3.5 right-3.5 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white/70"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>

            {loading ? (
              <div className="py-12 flex flex-col items-center gap-3">
                <div className="w-8 h-8 rounded-full border-2 border-pink-500 border-t-transparent animate-spin" />
                <span className="text-xs text-white/60">Loading profile...</span>
              </div>
            ) : profile ? (
              <>
                {/* Avatar with Ring (Click to view full profile) */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={handleOpenFullProfile}
                  className="relative mt-2 cursor-pointer group hover:scale-105 active:scale-95 transition-transform"
                  title="Click to view full profile"
                >
                  <div className="w-20 h-20 rounded-full overflow-hidden ring-4 ring-pink-500/50 bg-black/50 flex items-center justify-center shadow-lg group-hover:ring-pink-400 transition-all">
                    {profile.avatar ? (
                      <img src={profile.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-2xl font-bold">
                        {initial(profile.nickname || 'U')}
                      </span>
                    )}
                  </div>
                  {profile.isVip && (
                    <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 text-[9px] font-black text-white shadow flex items-center gap-0.5">
                      <SparkleIcon className="w-2.5 h-2.5" /> VIP
                    </span>
                  )}
                </div>

                {/* Nickname & UID (Click to view full profile) */}
                <div
                  role="button"
                  tabIndex={0}
                  onClick={handleOpenFullProfile}
                  className="text-center w-full px-2 cursor-pointer group"
                  title="Click to view full profile"
                >
                  <h3 className="text-base font-bold text-white truncate group-hover:text-pink-400 transition-colors inline-flex items-center justify-center gap-1">
                    <span>{profile.nickname}</span>
                    <span className="text-xs text-pink-400 opacity-60 group-hover:opacity-100">›</span>
                  </h3>
                  <div className="flex items-center justify-center gap-1.5 mt-1 text-[11px] text-white/60 font-mono">
                    <IdCardIcon className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                    <span>ID: {profile.uid}</span>
                  </div>
                </div>

                {/* Level Badges */}
                <div className="flex items-center justify-center gap-1.5 flex-wrap">
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-xs">
                    Lv.{profile.level || 1}
                  </span>
                  {profile.wealthLevel && profile.wealthLevel > 1 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-xs">
                      Wealth Lv.{profile.wealthLevel}
                    </span>
                  )}
                  {profile.liveLevel && profile.liveLevel > 1 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-xs">
                      Live Lv.{profile.liveLevel}
                    </span>
                  )}
                </div>

                {/* Bio / Signature */}
                {profile.bio && (
                  <p className="text-xs text-white/70 text-center line-clamp-2 px-2 italic">
                    "{profile.bio}"
                  </p>
                )}

                {/* Follower Stats */}
                <div className="w-full grid grid-cols-2 gap-2 p-2.5 rounded-2xl bg-white/5 border border-white/10 text-center text-xs">
                  <div>
                    <p className="font-extrabold text-white text-sm">
                      {((profile as any).followerCount || (profile as any).followersCount || 0).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-white/50">Followers</p>
                  </div>
                  <div>
                    <p className="font-extrabold text-white text-sm">
                      {((profile as any).followingCount || 0).toLocaleString()}
                    </p>
                    <p className="text-[10px] text-white/50">Following</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="w-full flex flex-col gap-2 mt-1">
                  <div className="w-full flex gap-2">
                    {!isSelf && (
                      <button
                        onClick={handleToggleFollow}
                        disabled={followLoading}
                        className={`flex-1 py-2.5 rounded-2xl text-xs font-bold transition-all shadow flex items-center justify-center gap-1.5 active:scale-95 ${
                          isFollowing
                            ? 'bg-white/15 text-white/80 hover:bg-white/20'
                            : 'bg-white/20 hover:bg-white/25 text-white'
                        }`}
                      >
                        {isFollowing ? <CheckIcon className="w-3.5 h-3.5 text-emerald-400" /> : <FollowIcon className="w-3.5 h-3.5" />}
                        {isFollowing ? 'Following' : 'Follow'}
                      </button>
                    )}

                    {!isSelf && onOpenGiftToUser && (
                      <button
                        onClick={() => {
                          const targetId = profile._id;
                          onClose();
                          onOpenGiftToUser(targetId);
                        }}
                        className="flex-1 py-2.5 rounded-2xl bg-gradient-to-r from-pink-500 via-rose-500 to-amber-500 hover:from-pink-600 hover:to-rose-600 transition-all text-xs font-bold text-white shadow-lg shadow-pink-500/30 flex items-center justify-center gap-1.5 active:scale-95"
                      >
                        <GiftIcon className="w-3.5 h-3.5" />
                        Send Gift
                      </button>
                    )}
                  </div>

                  {/* View Full Profile Button */}
                  <button
                    type="button"
                    onClick={handleOpenFullProfile}
                    className="w-full py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 active:bg-white/25 transition-all text-xs font-bold text-white shadow flex items-center justify-center gap-1.5 active:scale-95 border border-white/10"
                  >
                    <UserIcon className="w-3.5 h-3.5 text-pink-400" />
                    <span>View Profile Page</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="py-8 text-center text-white/50 text-xs">
                Failed to load profile.
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
