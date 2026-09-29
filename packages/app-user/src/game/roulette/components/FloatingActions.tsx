// Floating action buttons — sound, music, auto-spin, reset bet.

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { PiSpeakerHighFill as Volume2, PiSpeakerSlashFill as VolumeX, PiMusicNoteFill as Music, PiMusicNotesFill as Music4, PiArrowCounterClockwiseBold as RotateCcw, PiLightningFill as Zap } from 'react-icons/pi';
import { useSettingsStore } from '../store/settingsStore';

interface FloatingActionsProps {
  onReset: () => void;
}

const Action = ({ label, onClick, active, children }: { label: string; onClick: () => void; active?: boolean; children: React.ReactNode }) => (
  <motion.button
    type="button"
    aria-label={label}
    onClick={onClick}
    className={`w-10 h-10 rounded-full flex items-center justify-center shadow-lg border backdrop-blur-xl transition-colors ${
      active ? 'bg-yellow-400/20 border-yellow-300/40 text-yellow-300' : 'bg-dark-800/80 border-dark-600 text-dark-200'
    }`}
    whileHover={{ scale: 1.1 }}
    whileTap={{ scale: 0.9 }}
  >
    {children}
  </motion.button>
);

const FloatingActionsInner = ({ onReset }: FloatingActionsProps) => {
  const sound = useSettingsStore((s) => s.sound);
  const music = useSettingsStore((s) => s.music);
  const autoSpin = useSettingsStore((s) => s.autoSpin);
  const setSound = useSettingsStore((s) => s.setSound);
  const setMusic = useSettingsStore((s) => s.setMusic);
  const setAutoSpin = useSettingsStore((s) => s.setAutoSpin);

  return (
    <div className="fixed right-3 bottom-24 z-40 flex flex-col gap-2">
      <Action label={sound ? 'Mute sound' : 'Unmute sound'} onClick={() => setSound(!sound)} active={sound}>
        {sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
      </Action>
      <Action label={music ? 'Mute music' : 'Unmute music'} onClick={() => setMusic(!music)} active={music}>
        {music ? <Music4 size={18} /> : <Music size={18} />}
      </Action>
      <Action label={autoSpin ? 'Disable auto-spin' : 'Enable auto-spin'} onClick={() => setAutoSpin(!autoSpin)} active={autoSpin}>
        <Zap size={18} />
      </Action>
      <Action label="Reset bets" onClick={onReset}>
        <RotateCcw size={18} />
      </Action>
    </div>
  );
};

export const FloatingActions = memo(FloatingActionsInner);
