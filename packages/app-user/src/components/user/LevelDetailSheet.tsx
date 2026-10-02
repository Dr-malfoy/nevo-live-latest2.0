import React, { useState } from 'react';
import { PiCaretLeftBold as ChevronLeft, PiQuestionBold as QuestionMark, PiXBold as CloseIcon, PiSparkleFill as Sparkle, PiGiftFill as Gift, PiCrownFill as Crown, PiShieldCheckFill as Shield, PiFireFill as Fire } from 'react-icons/pi';
import { calculateWealthLevel, calculateLiveLevel } from '../../lib/userLevels';

interface LevelDetailSheetProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'wealth' | 'live';
  userDiamonds?: number;
  userCoins?: number;
  userLevel?: number;
}

export const WealthMedal3D = ({ className = 'w-24 h-24' }: { className?: string }) => (
  <svg viewBox="0 0 160 160" className={`drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      {/* Outer Hexagon Silver Frame */}
      <linearGradient id="hexSilverOuter" x1="20" y1="10" x2="140" y2="150" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="25%" stopColor="#C8D1DC" />
        <stop offset="50%" stopColor="#8A96A6" />
        <stop offset="75%" stopColor="#DDE4EC" />
        <stop offset="100%" stopColor="#717E91" />
      </linearGradient>

      {/* Hexagon Bevel Inner */}
      <linearGradient id="hexBevel" x1="30" y1="20" x2="130" y2="140" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#7E8D9F" />
        <stop offset="40%" stopColor="#B3BFCC" />
        <stop offset="100%" stopColor="#556272" />
      </linearGradient>

      {/* Gold Inner Hexagon Disc */}
      <radialGradient id="goldHexDisc" cx="80" cy="80" r="55" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFF275" />
        <stop offset="40%" stopColor="#FFD400" />
        <stop offset="75%" stopColor="#E6A800" />
        <stop offset="100%" stopColor="#BF8200" />
      </radialGradient>

      {/* 4-Point Star Facet Gradients */}
      <linearGradient id="starFacetTop" x1="80" y1="35" x2="80" y2="80" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="60%" stopColor="#FFF4A3" />
        <stop offset="100%" stopColor="#FFDE59" />
      </linearGradient>
      <linearGradient id="starFacetRight" x1="125" y1="80" x2="80" y2="80" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFE066" />
        <stop offset="100%" stopColor="#D99B00" />
      </linearGradient>
      <linearGradient id="starFacetBottom" x1="80" y1="125" x2="80" y2="80" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#C48800" />
        <stop offset="100%" stopColor="#996300" />
      </linearGradient>
      <linearGradient id="starFacetLeft" x1="35" y1="80" x2="80" y2="80" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="60%" stopColor="#FFE57F" />
        <stop offset="100%" stopColor="#E5A700" />
      </linearGradient>
    </defs>

    {/* Outer Hexagon Border with Chamfer */}
    <polygon
      points="80,10 135,42 135,118 80,150 25,118 25,42"
      fill="url(#hexSilverOuter)"
      stroke="#4E5968"
      strokeWidth="2"
      strokeLinejoin="round"
    />

    {/* Inner Hexagon Bevel Step */}
    <polygon
      points="80,18 128,46 128,114 80,142 32,114 32,46"
      fill="url(#hexBevel)"
    />

    {/* Inner Gold Hexagon Face */}
    <polygon
      points="80,25 122,50 122,110 80,135 38,110 38,50"
      fill="url(#goldHexDisc)"
      stroke="#D49B00"
      strokeWidth="1.5"
    />

    {/* Hexagon Rim Inner Shadow / Highlight */}
    <polygon
      points="80,28 119,51 119,109 80,132 41,109 41,51"
      fill="none"
      stroke="rgba(255,255,255,0.4)"
      strokeWidth="1.5"
    />

    {/* 3D Faceted 4-Point Golden Star */}
    {/* Top Facet */}
    <polygon points="80,80 80,36 74,80" fill="url(#starFacetTop)" />
    <polygon points="80,80 80,36 86,80" fill="#FFFBE6" />

    {/* Right Facet */}
    <polygon points="80,80 124,80 80,74" fill="#FFEAA0" />
    <polygon points="80,80 124,80 80,86" fill="url(#starFacetRight)" />

    {/* Bottom Facet */}
    <polygon points="80,80 80,124 86,80" fill="url(#starFacetBottom)" />
    <polygon points="80,80 80,124 74,80" fill="#A87000" />

    {/* Left Facet */}
    <polygon points="80,80 36,80 80,86" fill="#F0B51A" />
    <polygon points="80,80 36,80 80,74" fill="url(#starFacetLeft)" />

    {/* Star Center Diamond Sparkle Center */}
    <polygon points="80,72 88,80 80,88 72,80" fill="#FFFDF0" opacity="0.9" />
  </svg>
);

export const LiveMedal3D = ({ className = 'w-24 h-24' }: { className?: string }) => (
  <svg viewBox="0 0 160 160" className={`drop-shadow-[0_10px_20px_rgba(0,0,0,0.5)] ${className}`} fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      {/* Outer Leaf Silver Frame Gradient */}
      <linearGradient id="leafSilverRim" x1="20" y1="20" x2="140" y2="140" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" />
        <stop offset="30%" stopColor="#D5DEE8" />
        <stop offset="60%" stopColor="#8796A8" />
        <stop offset="90%" stopColor="#C0CBD8" />
        <stop offset="100%" stopColor="#5E6B7C" />
      </linearGradient>

      {/* Leaf Crystal Radial Green Gradient */}
      <radialGradient id="leafGreenDisc" cx="75" cy="70" r="55" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#D4FC58" />
        <stop offset="35%" stopColor="#9BEA28" />
        <stop offset="70%" stopColor="#6BCB13" />
        <stop offset="100%" stopColor="#459405" />
      </radialGradient>

      {/* Leaf Facet Highlights */}
      <linearGradient id="leafTopHighlight" x1="45" y1="40" x2="105" y2="100" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
        <stop offset="50%" stopColor="#B6F83A" stopOpacity="0.2" />
        <stop offset="100%" stopColor="#459405" stopOpacity="0" />
      </linearGradient>

      <linearGradient id="stemSilver" x1="120" y1="120" x2="135" y2="145" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#B3BFCC" />
        <stop offset="100%" stopColor="#505D6D" />
      </linearGradient>
    </defs>

    {/* Leaf Outer Silver Rim Path */}
    <path
      d="M80 18 C125 22 142 65 130 115 C126 126 128 135 133 145 C120 142 112 130 108 122 C55 138 22 105 28 62 C32 35 55 18 80 18 Z"
      fill="url(#leafSilverRim)"
      stroke="#556272"
      strokeWidth="2"
      strokeLinejoin="round"
    />

    {/* Leaf Inner Rim Bevel */}
    <path
      d="M80 25 C118 29 132 66 122 108 C116 116 112 121 106 118 C58 130 30 100 35 65 C38 42 58 25 80 25 Z"
      fill="#475463"
      opacity="0.6"
    />

    {/* Green Crystal Leaf Body */}
    <path
      d="M80 28 C115 32 128 67 118 105 C113 112 108 116 103 113 C60 124 34 96 38 65 C41 44 60 28 80 28 Z"
      fill="url(#leafGreenDisc)"
      stroke="#387704"
      strokeWidth="1"
    />

    {/* Facet / Center Leaf Vein Line */}
    <path
      d="M80 32 C88 60 92 88 102 110"
      stroke="#BAFA3A"
      strokeWidth="2.5"
      strokeLinecap="round"
      opacity="0.8"
    />

    {/* Top-Left Gloss Reflection */}
    <path
      d="M80 32 C58 35 44 54 42 75 C52 50 68 38 80 32 Z"
      fill="url(#leafTopHighlight)"
    />

    {/* Secondary Facet Line */}
    <path
      d="M62 62 C74 72 86 80 100 86"
      stroke="rgba(255,255,255,0.4)"
      strokeWidth="1.5"
      strokeLinecap="round"
    />

    {/* Leaf Stem Metal Hook */}
    <path
      d="M125 125 C132 136 136 144 133 145 C126 142 118 134 114 127 Z"
      fill="url(#stemSilver)"
    />
  </svg>
);

export const LevelDetailSheet: React.FC<LevelDetailSheetProps> = ({
  isOpen,
  onClose,
  defaultTab = 'wealth',
  userDiamonds = 0,
  userCoins = 0,
  userLevel = 1,
}) => {
  const [activeTab, setActiveTab] = useState<'wealth' | 'live'>(defaultTab);
  const [showHelp, setShowHelp] = useState(false);

  // Synchronize initial tab if changed from outside
  React.useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab, isOpen]);

  // Lock background body scroll while the sheet is open
  React.useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    const originalTouchAction = document.body.style.touchAction;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.touchAction = originalTouchAction;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const wealthInfo = calculateWealthLevel(userDiamonds, userLevel);
  const liveInfo = calculateLiveLevel(userCoins, userLevel);

  const currentInfo = activeTab === 'wealth' ? wealthInfo : liveInfo;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm animate-fade-in touch-none overscroll-none">
      {/* Click backdrop to dismiss */}
      <div className="absolute inset-0 touch-none" onClick={onClose} />

      {/* Main Bottom Sheet Container */}
      <div className="relative w-full max-w-lg bg-gradient-to-b from-[#18251a] via-[#121c13] to-[#0a110b] rounded-t-3xl border-t border-white/10 shadow-2xl text-white overflow-hidden pb-8 z-10 animate-slide-up max-h-[92vh] flex flex-col">
        {/* Subtle Starry Background Glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#2a452d]/40 via-transparent to-transparent pointer-events-none" />
        
        {/* Sparkle background dots */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:20px_20px] pointer-events-none" />

        {/* Top Handle bar */}
        <div className="flex justify-center pt-2.5 pb-1 touch-none">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header Navigation Bar */}
        <div className="relative flex items-center justify-between px-4 py-2 border-b border-white/5 touch-none shrink-0">
          {/* Back Chevron */}
          <button
            onClick={onClose}
            aria-label="Back"
            className="w-9 h-9 rounded-full flex items-center justify-center text-white/80 active:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-8">
            {/* Wealth Level Tab */}
            <button
              onClick={() => setActiveTab('wealth')}
              className="flex flex-col items-center group relative py-1 focus:outline-none"
            >
              <span
                className={`text-[17px] font-bold transition-colors ${
                  activeTab === 'wealth' ? 'text-white' : 'text-white/50 hover:text-white/80'
                }`}
              >
                Wealth Level
              </span>
              {activeTab === 'wealth' && (
                <span className="w-6 h-1 bg-white rounded-full mt-1.5 shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-fade-in" />
              )}
            </button>

            {/* Live Level Tab */}
            <button
              onClick={() => setActiveTab('live')}
              className="flex flex-col items-center group relative py-1 focus:outline-none"
            >
              <span
                className={`text-[17px] font-bold transition-colors ${
                  activeTab === 'live' ? 'text-white' : 'text-white/50 hover:text-white/80'
                }`}
              >
                Live Level
              </span>
              {activeTab === 'live' && (
                <span className="w-6 h-1 bg-white rounded-full mt-1.5 shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-fade-in" />
              )}
            </button>
          </div>

          {/* Help Button */}
          <button
            onClick={() => setShowHelp(!showHelp)}
            aria-label="Help Rules"
            className="w-7 h-7 rounded-full border border-white/70 flex items-center justify-center text-white font-bold text-xs active:scale-95 transition-transform"
          >
            <QuestionMark className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto overscroll-contain touch-pan-y px-4 py-4 space-y-4 no-scrollbar flex-1">
          {/* Help Notice Accordion */}
          {showHelp && (
            <div className="bg-white/10 border border-white/20 rounded-xl p-3.5 text-xs text-white/90 animate-fade-in">
              <div className="flex items-center justify-between font-bold mb-1.5 text-yellow-300">
                <span>{activeTab === 'wealth' ? '💎 Wealth Level Rules' : '🍃 Live Level Rules'}</span>
                <button onClick={() => setShowHelp(false)} className="text-white/60 hover:text-white">
                  <CloseIcon className="w-3.5 h-3.5" />
                </button>
              </div>
              {activeTab === 'wealth' ? (
                <p className="leading-relaxed">
                  Wealth Level is upgraded by recharging diamonds into your account. As your wealth level increases, you will unlock exclusive prestige medals, animated entrance effects, and luxury status badges across the platform.
                </p>
              ) : (
                <p className="leading-relaxed">
                  Live Level is upgraded by sending and receiving gifts during live streams. Higher live levels unlock custom chat bubbles, fan badges, and increased visibility in live rooms.
                </p>
              )}
            </div>
          )}

          {/* Level Showcase Card (Pixel Perfect from User Uploaded Images 3 & 4) */}
          <div className="relative rounded-2xl bg-white/[0.05] border border-white/10 p-5 backdrop-blur-md overflow-hidden shadow-inner">
            <div className="flex items-center justify-between gap-3">
              {/* Left Column: Level & Progress */}
              <div className="flex-1 min-w-0 pr-2">
                {/* Level Title */}
                <h2 className="text-4xl font-extrabold text-white tracking-tight">
                  Lv.{currentInfo.level}
                </h2>

                {/* Progress Bar Container with Tooltip */}
                <div className="relative mt-8 mb-3">
                  {/* Floating Bubble Tooltip for Current Points */}
                  <div
                    className="absolute -top-7 transition-all duration-300 pointer-events-none"
                    style={{
                      left: `${Math.min(90, Math.max(8, currentInfo.progress))}%`,
                      transform: 'translateX(-50%)',
                    }}
                  >
                    <div
                      className={`relative text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-lg border whitespace-nowrap ${
                        activeTab === 'wealth'
                          ? 'bg-[#3b270a] border-amber-400/50 text-amber-200 shadow-amber-950/50'
                          : 'bg-[#1b3a1a] border-lime-400/50 text-lime-200 shadow-emerald-950/50'
                      }`}
                    >
                      {currentInfo.currentPoints.toLocaleString()} {activeTab === 'wealth' ? 'Diamonds' : 'Coins'}
                      {/* Downward triangle pointer */}
                      <div
                        className={`absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-x-[4px] border-x-transparent border-t-[4px] ${
                          activeTab === 'wealth' ? 'border-t-[#3b270a]' : 'border-t-[#1b3a1a]'
                        }`}
                      />
                    </div>
                  </div>

                  {/* The Progress Bar Track */}
                  <div
                    className={`h-2.5 w-full rounded-full overflow-hidden ${
                      activeTab === 'wealth' ? 'bg-[#2a1b08]' : 'bg-[#273429]'
                    }`}
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        activeTab === 'wealth'
                          ? 'bg-gradient-to-r from-[#F59E0B] via-[#FBBF24] to-[#FDE047] shadow-[0_0_12px_rgba(251,191,36,0.8)]'
                          : 'bg-gradient-to-r from-[#7cd92e] to-[#99f53d] shadow-[0_0_10px_rgba(124,217,46,0.6)]'
                      }`}
                      style={{ width: `${Math.max(2, currentInfo.progress)}%` }}
                    />
                  </div>
                </div>

                {/* Progress Details Count */}
                <div className="flex items-center justify-between text-xs text-white/80 font-bold mb-1 tabular-nums">
                  <span>
                    {currentInfo.currentPoints.toLocaleString()} / {currentInfo.tierNext === Infinity ? 'MAX' : currentInfo.tierNext.toLocaleString()} EXP
                  </span>
                  <span className={activeTab === 'wealth' ? 'text-amber-300 font-extrabold' : 'text-lime-300 font-extrabold'}>
                    {currentInfo.progress}%
                  </span>
                </div>

                {/* Remaining Progress Text */}
                <p className="text-[11px] text-white/60 font-medium">
                  {currentInfo.remaining > 0
                    ? `Remaining progress to upgrade: ${currentInfo.remaining.toLocaleString()} ${activeTab === 'wealth' ? 'Diamonds' : 'Coins'}`
                    : 'Top level reached!'}
                </p>
              </div>

              {/* Right Column: 3D Emblem */}
              <div className="shrink-0 flex items-center justify-center pl-2">
                {activeTab === 'wealth' ? (
                  <WealthMedal3D className="w-24 h-24 md:w-28 md:h-28" />
                ) : (
                  <LiveMedal3D className="w-24 h-24 md:w-28 md:h-28" />
                )}
              </div>
            </div>
          </div>

          {/* Level Privileges & Benefits Section */}
          <div className="pt-2">
            <h3 className="text-sm font-bold text-white/80 mb-3 flex items-center gap-1.5">
              <Sparkle className="w-4 h-4 text-yellow-400" />
              {activeTab === 'wealth' ? 'Wealth Privileges' : 'Live Stream Privileges'}
            </h3>

            <div className="grid grid-cols-2 gap-2.5">
              <div className="bg-white/[0.04] border border-white/5 rounded-xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center text-yellow-400 shrink-0">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Honor Badge</p>
                  <p className="text-[11px] text-white/50">Unlocked at Lv.1</p>
                </div>
              </div>

              <div className="bg-white/[0.04] border border-white/5 rounded-xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                  <Gift className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">
                    {activeTab === 'wealth' ? 'Diamond Cash Back' : 'Gift Multipliers'}
                  </p>
                  <p className="text-[11px] text-white/50">Unlocked at Lv.5</p>
                </div>
              </div>

              <div className="bg-white/[0.04] border border-white/5 rounded-xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 shrink-0">
                  <Fire className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Entry Animation</p>
                  <p className="text-[11px] text-white/50">Unlocked at Lv.7</p>
                </div>
              </div>

              <div className="bg-white/[0.04] border border-white/5 rounded-xl p-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
                  <Shield className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-white">Anti-Kick Shield</p>
                  <p className="text-[11px] text-white/50">Unlocked at Lv.10</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
