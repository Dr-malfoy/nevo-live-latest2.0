/**
 * Cross-platform Ringtone and Vibration manager.
 * Uses Web Audio API for synthetic ringing so it works instantly on all devices
 * without network delays or missing file assets, plus HTML5 vibration API.
 */

class RingtoneManager {
  private audioCtx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private ringInterval: any = null;
  private vibrateInterval: any = null;
  private activeOscillators: OscillatorNode[] = [];
  private activeGain: GainNode | null = null;

  private initAudio() {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
  }

  private playRingBurst() {
    if (!this.isPlaying) return;
    this.initAudio();
    if (!this.audioCtx) return;

    try {
      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      // Dual-frequency pleasant phone ring tones (440Hz + 480Hz US standard / 700Hz + 900Hz digital chime)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(440, now);
      osc1.frequency.setValueAtTime(480, now + 0.5);

      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(480, now);
      osc2.frequency.setValueAtTime(520, now + 0.5);

      // Volume envelope: smooth fade-in and burst
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.25, now + 0.08);
      gain.gain.setValueAtTime(0.25, now + 1.6);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.8);
      osc2.stop(now + 1.8);

      this.activeOscillators = [osc1, osc2];
      this.activeGain = gain;
    } catch (e) {
      console.warn('[Ringtone] Audio synthesis error:', e);
    }
  }

  start() {
    if (this.isPlaying) return;
    this.isPlaying = true;

    // Start audio ring burst immediately
    this.playRingBurst();

    // Repeat ring burst every 3 seconds (1.8s ring + 1.2s pause)
    this.ringInterval = setInterval(() => {
      if (this.isPlaying) {
        this.playRingBurst();
      }
    }, 3000);

    // Vibration pattern: vibrate 800ms, pause 1000ms
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([800, 1000, 800, 1000]);
        this.vibrateInterval = setInterval(() => {
          if (this.isPlaying && navigator.vibrate) {
            navigator.vibrate([800, 1000, 800, 1000]);
          }
        }, 3600);
      } catch (err) {
        // Vibration not permitted or supported
      }
    }
  }

  stop() {
    this.isPlaying = false;

    if (this.ringInterval) {
      clearInterval(this.ringInterval);
      this.ringInterval = null;
    }

    if (this.vibrateInterval) {
      clearInterval(this.vibrateInterval);
      this.vibrateInterval = null;
    }

    // Stop active oscillators
    for (const osc of this.activeOscillators) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {}
    }
    this.activeOscillators = [];

    if (this.activeGain) {
      try {
        this.activeGain.disconnect();
      } catch {}
      this.activeGain = null;
    }

    // Cancel ongoing vibration
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(0);
      } catch {}
    }
  }
}

export const ringtone = new RingtoneManager();
