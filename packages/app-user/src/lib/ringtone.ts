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

  start(vibrate: boolean = true) {
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
    if (vibrate && typeof navigator !== 'undefined' && navigator.vibrate) {
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

    try {
      (window as any).NevoNativeBridge?.stopRingtone?.();
    } catch {}

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

class ReconnectSoundManager {
  private audioCtx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private loopInterval: any = null;
  private activeOscillators: OscillatorNode[] = [];

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

  /**
   * Plays a distinct warning/reconnecting acoustic alert pattern:
   * Two descending warning tones (520Hz -> 370Hz) repeating to clearly indicate network disconnect.
   */
  private playAlertBurst() {
    if (!this.isPlaying) return;
    this.initAudio();
    if (!this.audioCtx) return;

    try {
      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      // Clean up previous oscillators
      this.activeOscillators.forEach((osc) => {
        try {
          osc.stop();
          osc.disconnect();
        } catch {}
      });
      this.activeOscillators = [];

      // Tone 1: 520 Hz warning beep (140ms)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(520, now);

      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.exponentialRampToValueAtTime(0.22, now + 0.02);
      gain1.gain.setValueAtTime(0.22, now + 0.12);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.17);

      // Tone 2: Descending to 370 Hz (150ms, after short gap)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(370, now + 0.18);

      gain2.gain.setValueAtTime(0.001, now + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.24, now + 0.20);
      gain2.gain.setValueAtTime(0.24, now + 0.32);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.18);
      osc2.stop(now + 0.38);

      this.activeOscillators = [osc1, osc2];
    } catch (e) {
      console.warn('[ReconnectSound] Audio error:', e);
    }
  }

  /**
   * Play a pleasant short ascending chime when connection is restored
   */
  playRestoredChime() {
    this.stop();
    this.initAudio();
    if (!this.audioCtx) return;

    try {
      const ctx = this.audioCtx;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.22);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.20, now + 0.03);
      gain.gain.setValueAtTime(0.20, now + 0.20);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.33);
    } catch {}
  }

  start() {
    if (this.isPlaying) return;
    this.isPlaying = true;

    // Play initial warning burst immediately
    this.playAlertBurst();

    // Repeat warning burst every 2.2 seconds while reconnecting
    this.loopInterval = setInterval(() => {
      if (this.isPlaying) {
        this.playAlertBurst();
      }
    }, 2200);

    // Subtle warning vibration pulse on mobile
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate([200, 120, 200]);
      } catch {}
    }
  }

  stop() {
    this.isPlaying = false;
    if (this.loopInterval) {
      clearInterval(this.loopInterval);
      this.loopInterval = null;
    }
    for (const osc of this.activeOscillators) {
      try {
        osc.stop();
        osc.disconnect();
      } catch {}
    }
    this.activeOscillators = [];
  }
}

export const ringtone = new RingtoneManager();
export const reconnectSound = new ReconnectSoundManager();
