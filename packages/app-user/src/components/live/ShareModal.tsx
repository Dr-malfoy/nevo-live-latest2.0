import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PiXBold as X,
  PiShareNetworkFill as ShareIcon,
  PiCopyBold as Copy,
  PiCheckBold as Check,
  PiUsersBold as Users,
  PiPaperPlaneRightFill as PaperPlane,
  PiLinkSimpleBold as LinkIcon,
} from 'react-icons/pi';
import { useUIStore } from '../../stores';
import { getMediaUrl } from '../../lib/media';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  streamTitle?: string;
  hostName?: string;
  friends?: Array<{
    userId: string;
    nickname: string;
    avatar?: string;
  }>;
  onShareToUser?: (userId: string) => Promise<void>;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  streamTitle = 'Live Stream',
  hostName = 'Streamer',
  friends = [],
  onShareToUser,
}) => {
  const showToast = useUIStore((s) => s.showToast);
  const [copied, setCopied] = useState(false);
  const [sharedUsers, setSharedUsers] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const streamUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(streamUrl);
      }
      setCopied(true);
      showToast('Live stream link copied to clipboard!', 'success');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      showToast('Failed to copy link', 'error');
    }
  };

  const handleNativeShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: streamTitle,
          text: `Watch ${hostName} live on Nevo Live!`,
          url: streamUrl,
        });
      } else {
        handleCopyLink();
      }
    } catch {}
  };

  const handleSendToFriend = async (userId: string, name: string) => {
    try {
      setSharedUsers((prev) => new Set(prev).add(userId));
      if (onShareToUser) {
        await onShareToUser(userId);
      }
      showToast(`Shared stream with ${name}!`, 'success');
    } catch {
      showToast('Failed to share with friend', 'error');
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center pointer-events-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/75 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Sheet Content */}
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 26, stiffness: 280 }}
        className="relative w-full max-w-lg bg-gradient-to-b from-[#181829] via-[#10101d] to-[#090912] border-t border-white/10 rounded-t-[28px] overflow-hidden flex flex-col max-h-[85vh] shadow-[0_-10px_40px_rgba(0,0,0,0.5)] text-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <ShareIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-wide text-white">
                SHARE LIVE STREAM
              </h3>
              <p className="text-[11px] text-white/50">Invite friends and followers to this live room</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white/70 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Quick Copy Link Bar */}
          <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0 border border-cyan-500/30">
                <LinkIcon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">Copy Live Link</p>
                <p className="text-[10px] text-white/40 truncate">{streamUrl}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCopyLink}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shrink-0 shadow-md ${
                copied
                  ? 'bg-emerald-500 text-white'
                  : 'bg-cyan-500 hover:bg-cyan-400 text-black'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" /> Copied
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" /> Copy
                </>
              )}
            </button>
          </div>

          {/* Social Share Buttons */}
          <div>
            <span className="text-xs font-bold text-white/50 uppercase tracking-wider block mb-2.5">
              Share via Social Media
            </span>
            <div className="grid grid-cols-4 gap-2.5">
              {[
                { name: 'WhatsApp', color: 'bg-emerald-600', icon: '💬' },
                { name: 'Facebook', color: 'bg-blue-600', icon: '📘' },
                { name: 'Telegram', color: 'bg-sky-500', icon: '✈️' },
                { name: 'More…', color: 'bg-purple-600', icon: '🌐' },
              ].map((s) => (
                <button
                  key={s.name}
                  type="button"
                  onClick={handleNativeShare}
                  className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all"
                >
                  <div
                    className={`w-11 h-11 rounded-2xl ${s.color} flex items-center justify-center text-xl shadow-md`}
                  >
                    {s.icon}
                  </div>
                  <span className="text-[11px] font-bold text-white/80">{s.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Friends & Followers List */}
          <div>
            <span className="text-xs font-bold text-white/50 uppercase tracking-wider block mb-2.5">
              Share with Friends & Followers
            </span>

            {friends.length === 0 ? (
              <div className="p-4 rounded-xl bg-white/5 border border-white/5 text-center text-xs text-white/40">
                You can copy the live link above to share with any friend directly!
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {friends.map((f) => {
                  const sent = sharedUsers.has(f.userId);
                  return (
                    <div
                      key={f.userId}
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-white/5 border border-white/5"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-full overflow-hidden border border-white/20 bg-[#252033] shrink-0">
                          {f.avatar ? (
                            <img
                              src={getMediaUrl(f.avatar)}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-xs">
                              {f.nickname?.charAt(0) || 'U'}
                            </div>
                          )}
                        </div>
                        <span className="text-xs font-bold text-white truncate max-w-[140px]">
                          {f.nickname}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleSendToFriend(f.userId, f.nickname)}
                        disabled={sent}
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1 shrink-0 ${
                          sent
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            : 'bg-white/10 hover:bg-white/20 text-white'
                        }`}
                      >
                        {sent ? (
                          <>
                            <Check className="w-3.5 h-3.5" /> Sent
                          </>
                        ) : (
                          <>
                            <PaperPlane className="w-3.5 h-3.5" /> Send
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
