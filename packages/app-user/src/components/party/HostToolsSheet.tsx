import React, { useState } from 'react';
import {
  PiLockKeyFill,
  PiLockKeyOpenFill,
  PiMicrophoneFill,
  PiMicrophoneSlashFill,
  PiSwordFill,
  PiGiftFill,
  PiGameControllerFill,
  PiTrophyFill,
  PiStorefrontFill,
  PiSparkleFill,
  PiStarFill,
  PiShareNetworkFill,
  PiPowerFill,
  PiSlidersFill,
  PiHeadphonesFill,
  PiSpeakerSimpleSlashFill,
  PiXBold as X,
  PiCopyFill,
  PiCheckBold,
  PiUsersFill,
} from 'react-icons/pi';
import type { PartyRoomDetail } from '../../api/party.api';
import { compactNumber, initial } from '../../lib/time';

export interface HostToolsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  isHost: boolean;
  onAction: (key: string, label: string) => void;
  room?: PartyRoomDetail | null;
  micOn?: boolean;
  areSeatsLocked?: boolean;
  areSeatsMuted?: boolean;
  noiseReduction?: boolean;
  roomAudioMuted?: boolean;
}

export const HostToolsSheet = ({
  isOpen,
  onClose,
  isHost,
  onAction,
  room,
  micOn = false,
  areSeatsLocked = false,
  areSeatsMuted = false,
  noiseReduction = true,
  roomAudioMuted = false,
}: HostToolsSheetProps) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!room?._id) return;
    navigator.clipboard.writeText(room._id).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/65 backdrop-blur-sm animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-md bg-gradient-to-b from-[#21123d] via-[#180c2e] to-[#120724] border-t border-white/10 rounded-t-[32px] max-h-[88vh] flex flex-col shadow-2xl animate-slide-up text-white z-10 overflow-hidden pb-safe">
        {/* Grab Handle */}
        <div className="w-10 h-1 rounded-full bg-white/20 mx-auto my-2.5 shrink-0" />

        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)] animate-pulse" />
            <h3 className="text-base font-extrabold tracking-wide text-white">
              {isHost ? 'Host Controls & Tools' : 'Party Room Tools'}
            </h3>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/15 active:scale-95 flex items-center justify-center text-white/70 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4 no-scrollbar">
          {/* Room Info Quick Card */}
          {room && (
            <div className="p-3.5 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-between gap-3 shadow-inner">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-full overflow-hidden bg-gradient-to-tr from-purple-500 to-pink-500 p-0.5 shrink-0 shadow-md">
                  <div className="w-full h-full rounded-full overflow-hidden bg-black/40 flex items-center justify-center">
                    {room.ownerId?.avatar ? (
                      <img src={room.ownerId.avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-white text-sm font-bold">
                        {initial(room.ownerId?.nickname)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{room.name || 'Party Room'}</p>
                    {room.isPrivate && (
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0">
                        🔒 Private
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 mt-1 text-[11px] text-white/60">
                    <span className="flex items-center gap-1">
                      <PiUsersFill className="w-3 h-3 text-white/40" />
                      {compactNumber(room.viewerCount || 0)} Live
                    </span>
                    <span>•</span>
                    <span className="font-semibold text-purple-300">
                      {room.seatCount || 8} Seats
                    </span>
                  </div>
                </div>
              </div>

              {/* Copy Room ID Button */}
              <button
                onClick={handleCopyId}
                className="px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 active:scale-95 border border-white/10 text-[11px] font-semibold flex items-center gap-1.5 text-white/80 shrink-0 transition-colors"
                title="Copy Room ID"
              >
                {copied ? (
                  <>
                    <PiCheckBold className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400">Copied</span>
                  </>
                ) : (
                  <>
                    <PiCopyFill className="w-3.5 h-3.5 text-amber-400" />
                    <span>Copy ID</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* 1. Host Room Management Controls (Host Only) */}
          {isHost && (
            <div className="space-y-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-[12px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <span>👑</span> Host Controls
                </span>
                <span className="text-[10px] text-white/40 font-medium">Room Management</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {/* Lock / Unlock Guest Seats */}
                <button
                  type="button"
                  onClick={() => onAction('lock_all', areSeatsLocked ? 'Unlock Seats' : 'Lock Seats')}
                  className={`p-3 rounded-2xl border text-left flex items-start justify-between transition-all active:scale-[0.98] ${
                    areSeatsLocked
                      ? 'bg-gradient-to-br from-amber-500/20 to-orange-600/10 border-amber-500/40 shadow-sm'
                      : 'bg-white/[0.05] border-white/10 hover:bg-white/[0.08]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      {areSeatsLocked ? <PiLockKeyFill className="w-4 h-4" /> : <PiLockKeyOpenFill className="w-4 h-4" />}
                    </div>
                    <p className="text-xs font-bold text-white pt-1">
                      {areSeatsLocked ? 'Unlock Seats' : 'Lock Seats'}
                    </p>
                    <p className="text-[10px] text-white/50 leading-tight">
                      {areSeatsLocked ? 'Tap to open seats' : 'Prevent guest seating'}
                    </p>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                      areSeatsLocked
                        ? 'bg-amber-500 text-black'
                        : 'bg-white/10 text-white/60'
                    }`}
                  >
                    {areSeatsLocked ? 'LOCKED' : 'OPEN'}
                  </span>
                </button>

                {/* Mute / Unmute Guest Seats */}
                <button
                  type="button"
                  onClick={() => onAction('mute_all', areSeatsMuted ? 'Unmute All' : 'Mute All')}
                  className={`p-3 rounded-2xl border text-left flex items-start justify-between transition-all active:scale-[0.98] ${
                    areSeatsMuted
                      ? 'bg-gradient-to-br from-red-500/20 to-rose-600/10 border-red-500/40 shadow-sm'
                      : 'bg-white/[0.05] border-white/10 hover:bg-white/[0.08]'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="w-8 h-8 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center">
                      {areSeatsMuted ? <PiMicrophoneSlashFill className="w-4 h-4" /> : <PiMicrophoneFill className="w-4 h-4" />}
                    </div>
                    <p className="text-xs font-bold text-white pt-1">
                      {areSeatsMuted ? 'Unmute All' : 'Mute All'}
                    </p>
                    <p className="text-[10px] text-white/50 leading-tight">
                      {areSeatsMuted ? 'Tap to unmute guests' : 'Mute all guest mics'}
                    </p>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9px] font-black ${
                      areSeatsMuted
                        ? 'bg-red-500 text-white'
                        : 'bg-white/10 text-white/60'
                    }`}
                  >
                    {areSeatsMuted ? 'MUTED' : 'ACTIVE'}
                  </span>
                </button>

                {/* Share Room Link */}
                <button
                  type="button"
                  onClick={() => onAction('share', 'Share Party')}
                  className="p-3 rounded-2xl bg-white/[0.05] border border-white/10 hover:bg-white/[0.08] active:scale-[0.98] text-left flex items-start justify-between transition-all"
                >
                  <div className="space-y-1">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center">
                      <PiShareNetworkFill className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-bold text-white pt-1">Share Party</p>
                    <p className="text-[10px] text-white/50 leading-tight">Invite friends via link</p>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-500/20 text-blue-300">
                    LINK
                  </span>
                </button>

                {/* End / Close Party */}
                <button
                  type="button"
                  onClick={() => onAction('close_party', 'End Party')}
                  className="p-3 rounded-2xl bg-gradient-to-br from-rose-500/15 to-red-600/25 border border-red-500/30 hover:border-red-500/50 active:scale-[0.98] text-left flex items-start justify-between transition-all group"
                >
                  <div className="space-y-1">
                    <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 group-hover:bg-rose-500 group-hover:text-white transition-colors flex items-center justify-center">
                      <PiPowerFill className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-bold text-rose-300 pt-1">End Party</p>
                    <p className="text-[10px] text-rose-200/60 leading-tight">Close room safely</p>
                  </div>
                  <span className="px-1.5 py-0.5 rounded text-[9px] font-black bg-rose-500 text-white">
                    END
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* 2. Interactive Party Features (Both Host & Members) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[12px] font-bold text-pink-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>✨</span> Party Features
              </span>
              <span className="text-[10px] text-white/40 font-medium">Interactive</span>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {/* PK Battle */}
              <button
                type="button"
                onClick={() => onAction('pk', 'PK Battle')}
                className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 transition-all text-center group"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:shadow-orange-500/40">
                  <PiSwordFill className="w-6 h-6 text-white" />
                </div>
                <span className="text-[11px] font-bold text-white">PK Battle</span>
                <span className="text-[9px] text-white/40">1v1 & Team</span>
              </button>

              {/* Send Gift */}
              <button
                type="button"
                onClick={() => onAction('gift', 'Send Gift')}
                className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 transition-all text-center group"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center shadow-lg shadow-rose-500/20 group-hover:shadow-rose-500/40">
                  <PiGiftFill className="w-6 h-6 text-white" />
                </div>
                <span className="text-[11px] font-bold text-white">Send Gift</span>
                <span className="text-[9px] text-white/40">Gift Shop</span>
              </button>

              {/* Party Games */}
              <button
                type="button"
                onClick={() => onAction('game', 'Party Games')}
                className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 transition-all text-center group"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20 group-hover:shadow-purple-500/40">
                  <PiGameControllerFill className="w-6 h-6 text-white" />
                </div>
                <span className="text-[11px] font-bold text-white">Games</span>
                <span className="text-[9px] text-white/40">Play Along</span>
              </button>

              {/* Leaderboard / Rank */}
              <button
                type="button"
                onClick={() => onAction('rank', 'Leaderboard')}
                className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 transition-all text-center group"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-yellow-400 to-amber-500 flex items-center justify-center shadow-lg shadow-yellow-500/20 group-hover:shadow-yellow-500/40">
                  <PiTrophyFill className="w-6 h-6 text-white" />
                </div>
                <span className="text-[11px] font-bold text-white">Rankings</span>
                <span className="text-[9px] text-white/40">Top Gifters</span>
              </button>

              {/* Room Themes & Store */}
              <button
                type="button"
                onClick={() => onAction('store', 'Party Store')}
                className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 transition-all text-center group"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-teal-500/20 group-hover:shadow-teal-500/40">
                  <PiStorefrontFill className="w-6 h-6 text-white" />
                </div>
                <span className="text-[11px] font-bold text-white">Store</span>
                <span className="text-[9px] text-white/40">Themes</span>
              </button>

              {/* Rewards */}
              <button
                type="button"
                onClick={() => onAction('rewards', 'Daily Rewards')}
                className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 transition-all text-center group"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-400 to-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20 group-hover:shadow-blue-500/40">
                  <PiSparkleFill className="w-6 h-6 text-white" />
                </div>
                <span className="text-[11px] font-bold text-white">Rewards</span>
                <span className="text-[9px] text-white/40">Daily Coins</span>
              </button>

              {/* Fan Club */}
              <button
                type="button"
                onClick={() => onAction('fan_club', 'Fan Club')}
                className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 transition-all text-center group"
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/40">
                  <PiStarFill className="w-6 h-6 text-white" />
                </div>
                <span className="text-[11px] font-bold text-white">Fan Club</span>
                <span className="text-[9px] text-white/40">Host Club</span>
              </button>

              {/* Share Party (Member View) */}
              {!isHost && (
                <button
                  type="button"
                  onClick={() => onAction('share', 'Share Party')}
                  className="flex flex-col items-center gap-1.5 p-2 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 transition-all text-center group"
                >
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/40">
                    <PiShareNetworkFill className="w-6 h-6 text-white" />
                  </div>
                  <span className="text-[11px] font-bold text-white">Share</span>
                  <span className="text-[9px] text-white/40">Invite</span>
                </button>
              )}
            </div>
          </div>

          {/* 3. Audio & Voice Settings */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <span className="text-[12px] font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>🎙️</span> Voice & Sound
              </span>
              <span className="text-[10px] text-white/40 font-medium">Audio Controls</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {/* Mic Toggle */}
              <button
                type="button"
                onClick={() => onAction('mic', micOn ? 'Mute Mic' : 'Turn Mic On')}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 text-center transition-all active:scale-95 ${
                  micOn
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-white/[0.04] border-white/10 text-white/70'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    micOn ? 'bg-emerald-500 text-white shadow-md shadow-emerald-500/30' : 'bg-red-500/20 text-red-400'
                  }`}
                >
                  {micOn ? <PiMicrophoneFill className="w-5 h-5" /> : <PiMicrophoneSlashFill className="w-5 h-5" />}
                </div>
                <span className="text-[11px] font-bold text-white">{micOn ? 'Mic: ON' : 'Mic: MUTED'}</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[8px] font-black ${
                    micOn ? 'bg-emerald-500 text-black' : 'bg-red-500 text-white'
                  }`}
                >
                  {micOn ? 'TALKING' : 'MUTED'}
                </span>
              </button>

              {/* Noise Reduction */}
              <button
                type="button"
                onClick={() => onAction('noise_reduction', 'Noise Reduction')}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 text-center transition-all active:scale-95 ${
                  noiseReduction
                    ? 'bg-purple-500/15 border-purple-500/40 text-purple-300'
                    : 'bg-white/[0.04] border-white/10 text-white/70'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    noiseReduction ? 'bg-purple-600 text-white shadow-md shadow-purple-500/30' : 'bg-white/10 text-white/40'
                  }`}
                >
                  <PiSlidersFill className="w-5 h-5" />
                </div>
                <span className="text-[11px] font-bold text-white">Noise Filter</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[8px] font-black ${
                    noiseReduction ? 'bg-purple-500 text-white' : 'bg-white/10 text-white/50'
                  }`}
                >
                  {noiseReduction ? 'ACTIVE' : 'OFF'}
                </span>
              </button>

              {/* Room Sound */}
              <button
                type="button"
                onClick={() => onAction('mute_room', 'Room Audio')}
                className={`p-3 rounded-2xl border flex flex-col items-center gap-1.5 text-center transition-all active:scale-95 ${
                  roomAudioMuted
                    ? 'bg-red-500/15 border-red-500/40 text-red-300'
                    : 'bg-white/[0.04] border-white/10 text-white/70'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                    roomAudioMuted ? 'bg-red-500 text-white' : 'bg-blue-500/20 text-blue-400'
                  }`}
                >
                  {roomAudioMuted ? (
                    <PiSpeakerSimpleSlashFill className="w-5 h-5" />
                  ) : (
                    <PiHeadphonesFill className="w-5 h-5" />
                  )}
                </div>
                <span className="text-[11px] font-bold text-white">Speaker</span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[8px] font-black ${
                    roomAudioMuted ? 'bg-red-500 text-white' : 'bg-blue-500/20 text-blue-300'
                  }`}
                >
                  {roomAudioMuted ? 'MUTED' : 'HEARING'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
