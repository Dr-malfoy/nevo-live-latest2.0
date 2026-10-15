import React from 'react';
import {
  PiSparkleFill,
  PiCrownFill,
  PiGiftFill,
  PiCheckBold,
  PiXBold,
  PiBroadcastFill,
  PiChatCircleDotsFill,
} from 'react-icons/pi';
import { Avatar } from '../user';
import { getMediaUrl } from '../../lib/media';
import type { AgencyWelcomeBanner as BannerType } from '../../api/agency.api';

export const BANNER_THEMES: Record<
  string,
  {
    name: string;
    gradient: string;
    accent: string;
    badgeBg: string;
    glow: string;
    previewRing: string;
  }
> = {
  purple: {
    name: 'Royal Purple',
    gradient: 'from-violet-600 via-indigo-700 to-purple-900',
    accent: 'text-amber-300',
    badgeBg: 'bg-gradient-to-r from-amber-400 to-yellow-300 text-amber-950',
    glow: 'shadow-indigo-500/30',
    previewRing: 'ring-indigo-500',
  },
  gold: {
    name: 'Golden Luxury',
    gradient: 'from-amber-500 via-orange-600 to-yellow-800',
    accent: 'text-yellow-200',
    badgeBg: 'bg-gradient-to-r from-yellow-300 to-amber-200 text-yellow-950',
    glow: 'shadow-amber-500/30',
    previewRing: 'ring-amber-500',
  },
  sunset: {
    name: 'Neon Sunset',
    gradient: 'from-rose-500 via-pink-600 to-purple-800',
    accent: 'text-pink-200',
    badgeBg: 'bg-gradient-to-r from-rose-300 to-pink-200 text-rose-950',
    glow: 'shadow-rose-500/30',
    previewRing: 'ring-rose-500',
  },
  emerald: {
    name: 'Emerald Elite',
    gradient: 'from-emerald-500 via-teal-600 to-cyan-900',
    accent: 'text-emerald-200',
    badgeBg: 'bg-gradient-to-r from-emerald-300 to-teal-200 text-emerald-950',
    glow: 'shadow-emerald-500/30',
    previewRing: 'ring-emerald-500',
  },
  ocean: {
    name: 'Cyber Ocean',
    gradient: 'from-cyan-500 via-blue-600 to-indigo-950',
    accent: 'text-cyan-200',
    badgeBg: 'bg-gradient-to-r from-cyan-300 to-blue-200 text-cyan-950',
    glow: 'shadow-blue-500/30',
    previewRing: 'ring-blue-500',
  },
  dark: {
    name: 'Midnight Star',
    gradient: 'from-slate-900 via-purple-950 to-black',
    accent: 'text-violet-300',
    badgeBg: 'bg-gradient-to-r from-violet-400 to-purple-300 text-slate-950',
    glow: 'shadow-purple-900/40',
    previewRing: 'ring-purple-500',
  },
};

interface AgencyWelcomeBannerProps {
  banner?: BannerType | null;
  agencyName?: string;
  agencyCode?: string;
  agent?: {
    nickname?: string;
    avatar?: string;
    uid?: string;
  } | null;
  userName?: string;
  mode?: 'modal' | 'card' | 'preview';
  isOpen?: boolean;
  onClose?: () => void;
  onGoLive?: () => void;
  onContactAgent?: () => void;
}

export const AgencyWelcomeBanner: React.FC<AgencyWelcomeBannerProps> = ({
  banner,
  agencyName = 'Agency',
  agencyCode = 'AGENCY',
  agent,
  userName = 'Streamer',
  mode = 'modal',
  isOpen = true,
  onClose,
  onGoLive,
  onContactAgent,
}) => {
  if (banner && banner.enabled === false && mode !== 'preview') {
    return null;
  }

  const themeKey = banner?.theme && BANNER_THEMES[banner.theme] ? banner.theme : 'purple';
  const theme = BANNER_THEMES[themeKey];
  const floatAnim = banner?.floatAnimation !== false;

  const defaultTitle = `Welcome to ${agencyName}! 🎉`;
  const defaultMessage = `We are thrilled to welcome you to the ${agencyName} family! Broadcast, shine bright, and let's achieve great success together.`;
  const title = banner?.title?.trim() || defaultTitle;
  const message = banner?.message?.trim() || defaultMessage;
  const badgeText = banner?.badgeText?.trim() || 'OFFICIAL HOST';
  const customBg = banner?.imageUrl ? getMediaUrl(banner.imageUrl) : '';

  // Mode: In-Page Card (Floating banner on top of agency screen)
  if (mode === 'card') {
    return (
      <div
        className={`w-full rounded-3xl p-4 sm:p-5 relative overflow-hidden text-white shadow-xl transition-all ${
          theme.glow
        } ${floatAnim ? 'animate-welcome-float' : ''}`}
        style={{
          backgroundImage: customBg ? `url("${customBg}")` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {!customBg && <div className={`absolute inset-0 bg-gradient-to-r ${theme.gradient} opacity-95`} />}
        {customBg && <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />}

        {/* Floating glowing orbs */}
        <div className="absolute -top-12 -right-12 w-36 h-36 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-32 h-32 rounded-full bg-amber-400/15 blur-xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-1.5">
              <span
                className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1 ${
                  theme.badgeBg
                } ${floatAnim ? 'animate-float-badge' : ''}`}
              >
                <PiSparkleFill className="w-3 h-3 shrink-0" />
                <span>{badgeText}</span>
              </span>
              <span className="text-[11px] font-bold text-white/80">• Code: {agencyCode}</span>
            </div>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Dismiss banner"
                className="w-6 h-6 rounded-full bg-black/20 hover:bg-black/40 text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              >
                <PiXBold className="w-3 h-3" />
              </button>
            )}
          </div>

          <h3 className="text-base sm:text-lg font-black tracking-tight drop-shadow-xs flex items-center gap-2">
            <span>{title}</span>
          </h3>

          <p className="text-xs text-white/90 leading-relaxed mt-1 line-clamp-2 max-w-sm drop-shadow-xs">
            {message}
          </p>

          <div className="flex items-center gap-2 mt-3.5 pt-2.5 border-t border-white/15">
            {onGoLive && (
              <button
                type="button"
                onClick={onGoLive}
                className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 active:scale-95 text-slate-900 font-extrabold text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <PiBroadcastFill className="w-3.5 h-3.5 text-indigo-600" />
                <span>Go Live Now</span>
              </button>
            )}

            {onContactAgent && agent && (
              <button
                type="button"
                onClick={onContactAgent}
                className="px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 active:scale-95 text-white font-bold text-xs backdrop-blur-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <PiChatCircleDotsFill className="w-3.5 h-3.5 text-amber-300" />
                <span>Message Agent</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Mode: Preview in Agent Dashboard settings
  if (mode === 'preview') {
    return (
      <div
        className={`w-full rounded-3xl p-5 relative overflow-hidden text-white shadow-lg transition-all ${
          theme.glow
        } ${floatAnim ? 'animate-welcome-float' : ''}`}
        style={{
          backgroundImage: customBg ? `url("${customBg}")` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {!customBg && <div className={`absolute inset-0 bg-gradient-to-r ${theme.gradient}`} />}
        {customBg && <div className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" />}

        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />

        <div className="relative z-10">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span
              className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1 ${
                theme.badgeBg
              } ${floatAnim ? 'animate-float-badge' : ''}`}
            >
              <PiSparkleFill className="w-3 h-3 shrink-0" />
              <span>{badgeText}</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/15 text-white/90">
              Live Animated Preview
            </span>
          </div>

          <h4 className="text-base font-black tracking-tight drop-shadow-xs">{title}</h4>
          <p className="text-xs text-white/90 leading-relaxed mt-1 drop-shadow-xs line-clamp-3">
            {message}
          </p>

          <div className="flex items-center gap-3 mt-4 pt-3 border-t border-white/20">
            <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-amber-300 shrink-0">
              <PiCrownFill className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{agent?.nickname || 'Agency Agent'}</p>
              <p className="text-[10px] text-white/70 font-mono">Agency Code: {agencyCode}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Mode: Modal (Pop up when new user joins/enters agency page)
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div
        className={`w-full max-w-sm rounded-[32px] overflow-hidden text-white shadow-2xl relative transition-all ${
          theme.glow
        } ${floatAnim ? 'animate-welcome-float' : 'animate-in zoom-in-95 duration-200'}`}
        style={{
          backgroundImage: customBg ? `url("${customBg}")` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        {!customBg && <div className={`absolute inset-0 bg-gradient-to-b ${theme.gradient}`} />}
        {customBg && <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px]" />}

        {/* Ambient floating lights */}
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-white/15 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-amber-400/20 blur-2xl pointer-events-none" />

        {/* Close Button top-right */}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close welcome modal"
            className="absolute top-4 right-4 z-20 w-8 h-8 rounded-full bg-black/30 hover:bg-black/50 text-white/80 hover:text-white flex items-center justify-center transition-all cursor-pointer active:scale-90"
          >
            <PiXBold className="w-4 h-4" />
          </button>
        )}

        <div className="relative z-10 p-6 flex flex-col items-center text-center">
          {/* Animated Floating Gift Icon / Emblem */}
          <div
            className={`w-20 h-20 rounded-3xl bg-white/15 backdrop-blur-md border border-white/30 flex items-center justify-center mb-4 shadow-xl relative ${
              floatAnim ? 'animate-float-badge' : ''
            }`}
          >
            <div className="text-4xl drop-shadow-md">🎁</div>
            <div className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-amber-950 flex items-center justify-center text-xs shadow-md">
              <PiSparkleFill className="w-4 h-4" />
            </div>
          </div>

          {/* Badge */}
          <span
            className={`text-[11px] font-black uppercase px-3 py-1 rounded-full shadow-md mb-2 flex items-center gap-1.5 ${
              theme.badgeBg
            }`}
          >
            <PiCrownFill className="w-3.5 h-3.5" />
            <span>{badgeText}</span>
          </span>

          {/* Title */}
          <h2 className="text-xl sm:text-2xl font-black tracking-tight leading-snug drop-shadow-md">
            {title}
          </h2>

          <p className="text-xs text-white/80 font-bold mt-1">
            Dear <span className="text-amber-300">{userName}</span> 🌟
          </p>

          {/* Message */}
          <div className="my-3.5 p-3.5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 w-full text-left">
            <p className="text-xs text-white/95 leading-relaxed font-medium drop-shadow-xs">
              {message}
            </p>
          </div>

          {/* Agent Information Card */}
          <div className="w-full flex items-center justify-between p-3 rounded-2xl bg-black/25 backdrop-blur-md border border-white/10 mb-5">
            <div className="flex items-center gap-2.5 min-w-0">
              <Avatar
                src={agent?.avatar}
                nickname={agent?.nickname || 'Agent'}
                size="md"
                className="ring-2 ring-white/30 shadow-xs shrink-0"
              />
              <div className="text-left min-w-0">
                <p className="text-xs font-black text-white truncate">
                  {agent?.nickname || 'Agency Leader'}
                </p>
                <p className="text-[10px] text-white/70 font-mono">
                  Agency Code: <strong className="text-amber-300">{agencyCode}</strong>
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-white/20 text-white border border-white/20">
                Agent Owner
              </span>
            </div>
          </div>

          {/* Action Button: Confirm / Enter Hub */}
          <button
            type="button"
            onClick={onClose}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 hover:opacity-95 active:scale-[0.98] text-amber-950 font-black text-sm shadow-xl shadow-amber-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <PiCheckBold className="w-5 h-5 text-amber-950" />
            <span>Enter Agency Hub</span>
          </button>
        </div>
      </div>
    </div>
  );
};
