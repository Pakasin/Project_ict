/**
 * CyberShield — Web Audio API Sound System
 * Synthesizes sci-fi HUD audio effects and threat sirens without any external audio file dependencies.
 */

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx && typeof window !== 'undefined') {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function isSoundEnabled() {
  const stored = localStorage.getItem('cybershield_sound_enabled');
  return stored !== 'false'; // default true
}

export function setSoundEnabled(enabled) {
  localStorage.setItem('cybershield_sound_enabled', enabled ? 'true' : 'false');
}

export function getVolume() {
  const stored = localStorage.getItem('cybershield_volume');
  return stored ? parseFloat(stored) : 0.4;
}

export function setVolume(vol) {
  localStorage.setItem('cybershield_volume', vol.toString());
}

/**
 * Plays synthesized sound alerts based on type
 * @param {'alert' | 'critical' | 'click' | 'success'} type
 */
export function playSound(type = 'alert') {
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const vol = getVolume();
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;

    if (type === 'click') {
      // Short HUD high-pitched tick
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

      gainNode.gain.setValueAtTime(vol * 0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 0.04);
    } else if (type === 'alert') {
      // Dual-tone Cyber Alert Siren
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.setValueAtTime(880, now + 0.12); // A5
      osc.frequency.setValueAtTime(587.33, now + 0.24); // D5

      gainNode.gain.setValueAtTime(0.01, now);
      gainNode.gain.linearRampToValueAtTime(vol * 0.6, now + 0.02);
      gainNode.gain.setValueAtTime(vol * 0.6, now + 0.28);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, now);

      osc.connect(filter);
      filter.connect(gainNode);

      osc.start(now);
      osc.stop(now + 0.4);
    } else if (type === 'critical') {
      // Fast repeating DEFCON 1 pulse
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        const start = now + i * 0.14;
        osc.frequency.setValueAtTime(960, start);
        osc.frequency.linearRampToValueAtTime(480, start + 0.1);

        const pulseGain = ctx.createGain();
        pulseGain.gain.setValueAtTime(vol * 0.7, start);
        pulseGain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1500, start);

        osc.connect(filter);
        filter.connect(pulseGain);
        pulseGain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.12);
      }
    } else if (type === 'success') {
      // Sci-fi ascending chime
      const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        const start = now + idx * 0.08;
        osc.frequency.setValueAtTime(freq, start);

        const toneGain = ctx.createGain();
        toneGain.gain.setValueAtTime(vol * 0.4, start);
        toneGain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);

        osc.connect(toneGain);
        toneGain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.25);
      });
    }
  } catch (e) {
    console.warn('Audio play error:', e);
  }
}
