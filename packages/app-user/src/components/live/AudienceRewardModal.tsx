import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  PiXBold as X,
  PiCoinsFill as Coins,
  PiGiftFill as GiftIcon,
  PiCheckBold as Check,
  PiCircleNotchBold as Spinner,
  PiSparkleFill as Sparkle,
} from 'react-icons/pi';
import { useUIStore } from '../../stores';
import { getMediaUrl } from '../../lib/media';
import type { Viewer } from './AudienceList';

interface AudienceRewardModalProps {
  isOpen: boolean;
  onClose: () => void;
  viewers: Viewer[];
  onRewardUser: (targetUserId: string, diamondAmount: number, message?: string, targetUserName?: string) => Promise<void>;
  balance?: number;
}

export const AudienceRewardModal: React.FC<AudienceRewardModalProps> = ({
  isOpen,
  onClose,
  viewers,
  onRewardUser,
  balance = 0,
}) => {
  const showToast = useUIStore((s) => s.showToast);
  const [selectedUser, setSelectedUser] = useState<Viewer | null>(null);
  const [rewardAmount, setRewardAmount] = useState<number>(100);
  const [customMsg, setCustomMsg] = useState('');
  const [sending, setSending] = useState(false);

  const presetAmounts = [50, 100, 200, 500, 1000, 5000];

  const handleSendReward = async () => {
    if (!selectedUser) {
      showToast('Please select an audience member first', 'info');
      return;
    }
    if (balance < rewardAmount) {
      showToast('Insufficient diamonds balance', 'error');
      return;
    }

    try {
      setSending(true);
      await onRewardUser(selectedUser.userId, rewardAmount, customMsg, selectedUser.nickname);
      onClose();
    } catch (err: any) {
      showToast(err?.message || 'Failed to send reward', 'error');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

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
        className="relative w-full max-w-lg bg-gradient-to-b from-[#241a12] via-[#161009] to-[#0c0905] border-t border-amber-500/30 rounded-t-[28px] overflow-hidden flex flex-col max-h-[85vh] shadow-[0_-10px_40px_rgba(245,158,11,0.25)] text-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center shadow-lg shadow-amber-500/30">
              <Coins className="w-5 h-5 text-black" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-wide text-white flex items-center gap-2">
                REWARD AUDIENCE
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-black border border-amber-500/30 uppercase">
                  Host Perk
                </span>
              </h3>
              <p className="text-[11px] text-white/50">Send diamonds reward to your active viewers</p>
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
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Step 1: Select Audience */}
          <div>
            <span className="text-xs font-bold text-amber-300 uppercase tracking-wider block mb-2">
              1. Select Audience Member ({viewers.length})
            </span>

            {viewers.length === 0 ? (
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 text-center text-xs text-white/50">
                No audience members currently in room
              </div>
            ) : (
              <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                {viewers.map((v) => {
                  const isSelected = selectedUser?.userId === v.userId;
                  return (
                    <button
                      key={v.userId}
                      type="button"
                      onClick={() => setSelectedUser(v)}
                      className={`flex flex-col items-center gap-1.5 p-2 rounded-2xl border transition-all shrink-0 w-20 ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-400 shadow-md shadow-amber-500/30'
                          : 'bg-white/5 border-white/10 hover:bg-white/10'
                      }`}
                    >
                      <div className="relative w-11 h-11 rounded-full overflow-hidden border border-white/20 bg-[#252033]">
                        {v.avatar ? (
                          <img
                            src={getMediaUrl(v.avatar)}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-bold text-xs">
                            {v.nickname?.charAt(0) || 'U'}
                          </div>
                        )}
                        {isSelected && (
                          <div className="absolute inset-0 bg-amber-500/60 flex items-center justify-center">
                            <Check className="w-5 h-5 text-black font-black" />
                          </div>
                        )}
                      </div>
                      <span className="text-[11px] font-bold text-white truncate w-full text-center">
                        {v.nickname}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Step 2: Select Reward Amount */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                2. Choose Reward Diamonds
              </span>
              <span className="text-[11px] text-white/50">
                Balance: <span className="text-amber-300 font-bold">{balance.toLocaleString()} 💎</span>
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {presetAmounts.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setRewardAmount(amt)}
                  className={`py-2 px-3 rounded-xl text-xs font-extrabold transition-all border flex items-center justify-center gap-1.5 ${
                    rewardAmount === amt
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-black border-yellow-300 shadow-lg shadow-amber-500/30'
                      : 'bg-white/5 border-white/10 text-white/80 hover:bg-white/10'
                  }`}
                >
                  <Coins className="w-3.5 h-3.5" />
                  {amt} 💎
                </button>
              ))}
            </div>
          </div>

          {/* Note / Message */}
          <div>
            <span className="text-xs font-bold text-white/70 block mb-1.5">
              Reward Note (Optional)
            </span>
            <input
              type="text"
              value={customMsg}
              onChange={(e) => setCustomMsg(e.target.value)}
              placeholder="e.g. Thanks for the amazing support! 🎉"
              className="w-full h-11 px-3.5 rounded-xl bg-white/5 border border-white/10 focus:border-amber-400 focus:outline-none text-xs text-white placeholder-white/40"
            />
          </div>
        </div>

        {/* Bottom Confirm */}
        <div className="px-5 py-3.5 bg-black/40 border-t border-white/10 shrink-0">
          <button
            type="button"
            onClick={handleSendReward}
            disabled={sending || !selectedUser}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 active:scale-[0.98] transition-all font-black text-sm text-black shadow-xl shadow-amber-500/30 flex items-center justify-center gap-2 disabled:opacity-40"
          >
            {sending ? (
              <Spinner className="w-5 h-5 animate-spin" />
            ) : (
              <>
                <Sparkle className="w-4 h-4 fill-current" />
                Send {rewardAmount} Diamonds to {selectedUser ? selectedUser.nickname : 'User'}
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
