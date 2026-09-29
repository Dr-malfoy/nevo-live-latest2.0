import { useEffect, useMemo } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { audioEngine } from '../audio/engine';

export function useSound() {
  const sound = useSettingsStore((s) => s.sound);
  const volume = useSettingsStore((s) => s.volume);

  useEffect(() => {
    audioEngine.setMuted(!sound);
  }, [sound]);

  useEffect(() => {
    audioEngine.setVolume(volume);
  }, [volume]);

  return useMemo(
    () => ({
      sound,
      playTick: () => sound && audioEngine.tick(),
      playChip: () => sound && audioEngine.chip(),
      playSpin: () => sound && audioEngine.spin(),
      playBallSlow: () => sound && audioEngine.ballSlow(),
      playCountdown: () => sound && audioEngine.countdown(),
      playCountdownUrgent: () => sound && audioEngine.countdownUrgent(),
      playWin: () => sound && audioEngine.win(),
      playLose: () => sound && audioEngine.lose(),
    }),
    [sound]
  );
}
