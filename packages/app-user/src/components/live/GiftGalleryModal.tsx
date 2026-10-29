import React from 'react';
import { motion } from 'framer-motion';
import {
  PiXBold as X,
  PiStorefrontFill as Storefront,
  PiCrownFill as Crown,
  PiSparkleFill as Sparkle,
  PiMedalFill as Medal,
  PiGiftFill as GiftIcon,
} from 'react-icons/pi';
import { getMediaUrl } from '../../lib/media';

export interface GalleryGiftItem {
  id: string;
  name: string;
  icon: string;
  count: number;
  totalDiamonds: number;
  topSender?: {
    userId: string;
    nickname: string;
    avatar?: string;
  };
}

interface GiftGalleryModalProps {
  isOpen: boolean;
  onClose: () => void;
  topGifts?: GalleryGiftItem[];
}

export const GiftGalleryModal: React.FC<GiftGalleryModalProps> = ({
  isOpen,
  onClose,
  topGifts = [],
}) => {
  if (!isOpen) return null;

  // Fallback defaults if no gifts yet
  const displayGifts: GalleryGiftItem[] =
    topGifts.length > 0
      ? topGifts.slice(0, 3)
      : [
          {
            id: 'g1',
            name: 'Luxury Yacht',
            icon: '🛥️',
            count: 12,
            totalDiamonds: 24000,
            topSender: { userId: '1', nickname: 'Alex VIP', avatar: '' },
          },
          {
            id: 'g2',
            name: 'Rocket Launch',
            icon: '🚀',
            count: 28,
            totalDiamonds: 14000,
            topSender: { userId: '2', nickname: 'Star_Gazer', avatar: '' },
          },
          {
            id: 'g3',
            name: 'Golden Rose',
            icon: '🌹',
            count: 85,
            totalDiamonds: 8500,
            topSender: { userId: '3', nickname: 'Luna_Fan', avatar: '' },
          },
        ];

  const rankThemes = [
    {
      badge: 'TOP 1',
      crownColor: 'text-amber-400',
      ringColor: 'border-amber-400 shadow-amber-400/40',
      bgGrad: 'from-amber-500/20 via-amber-600/10 to-transparent',
      borderColor: 'border-amber-400/40',
      textColor: 'text-amber-300',
    },
    {
      badge: 'TOP 2',
      crownColor: 'text-slate-300',
      ringColor: 'border-slate-300 shadow-slate-300/40',
      bgGrad: 'from-slate-400/20 via-slate-500/10 to-transparent',
      borderColor: 'border-slate-300/40',
      textColor: 'text-slate-200',
    },
    {
      badge: 'TOP 3',
      crownColor: 'text-amber-700',
      ringColor: 'border-amber-700 shadow-amber-800/40',
      bgGrad: 'from-amber-700/20 via-amber-800/10 to-transparent',
      borderColor: 'border-amber-700/40',
      textColor: 'text-amber-400',
    },
  ];

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
        className="relative w-full max-w-lg bg-gradient-to-b from-[#191a32] via-[#101124] to-[#090a16] border-t border-cyan-500/30 rounded-t-[28px] overflow-hidden flex flex-col max-h-[85vh] shadow-[0_-10px_40px_rgba(6,182,212,0.25)] text-white"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/30">
              <Storefront className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-wide text-white flex items-center gap-2">
                GIFT GALLERY
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-black border border-cyan-500/30 uppercase">
                  Top 3 Gifts
                </span>
              </h3>
              <p className="text-[11px] text-white/50">Top gifts sent by the audience in this live session</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 transition-colors flex items-center justify-center text-white/70 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Top 3 Gifts Showcase */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {displayGifts.map((gift, idx) => {
            const theme = rankThemes[idx] || rankThemes[2];
            return (
              <motion.div
                key={gift.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                className={`relative p-4 rounded-2xl bg-gradient-to-r ${theme.bgGrad} border ${theme.borderColor} shadow-lg flex items-center justify-between gap-4`}
              >
                {/* Left: Rank & Big Gift Icon */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0 flex flex-col items-center">
                    <Crown className={`w-5 h-5 mb-0.5 ${theme.crownColor}`} />
                    <div className="w-14 h-14 rounded-2xl bg-black/40 border border-white/10 flex items-center justify-center text-3xl shadow-inner">
                      {gift.icon.startsWith('http') ? (
                        <img
                          src={getMediaUrl(gift.icon)}
                          alt={gift.name}
                          className="w-10 h-10 object-contain"
                        />
                      ) : (
                        <span>{gift.icon}</span>
                      )}
                    </div>
                    <span
                      className={`mt-1 px-1.5 py-0.2 rounded-full text-[9px] font-black uppercase text-white shadow ${
                        idx === 0 ? 'bg-amber-500' : idx === 1 ? 'bg-slate-400' : 'bg-amber-800'
                      }`}
                    >
                      #{idx + 1}
                    </span>
                  </div>

                  <div className="min-w-0">
                    <h4 className="text-base font-extrabold text-white truncate">{gift.name}</h4>
                    <p className="text-xs font-bold text-white/70 mt-0.5">
                      Received: <span className="text-white font-black">{gift.count}x</span>
                    </p>

                    {gift.topSender && (
                      <div className="flex items-center gap-1.5 mt-2 bg-black/30 px-2 py-1 rounded-xl w-fit border border-white/5">
                        <Sparkle className="w-3 h-3 text-amber-300" />
                        <span className="text-[10px] text-white/60">Top Sender:</span>
                        <span className="text-[10px] font-bold text-white truncate max-w-[90px]">
                          {gift.topSender.nickname}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Diamonds Value */}
                <div className="text-right shrink-0">
                  <div className={`text-base font-black ${theme.textColor} tabular-nums`}>
                    💎 {gift.totalDiamonds.toLocaleString()}
                  </div>
                  <span className="text-[10px] uppercase tracking-wider text-white/40 font-bold block">
                    Total Diamonds
                  </span>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};
