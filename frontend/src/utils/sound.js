// ─────────────────────────────────────────────────────────────────────────────
// utils/sound.js — ระบบเสียงแจ้งเตือนของแอป (Web Audio API)
// สร้างเสียงแบบ synthesized (ไม่ต้องใช้ไฟล์เสียงภายนอก)
// รองรับ 4 ประเภทเสียง: click, alert, critical, success
// ─────────────────────────────────────────────────────────────────────────────

/**
 * CyberShield — Web Audio API Sound System
 * Synthesizes sci-fi HUD audio effects and threat sirens without any external audio file dependencies.
 */

// AudioContext instance ร่วม — สร้างครั้งเดียว แล้วใช้ซ้ำตลอด
let audioCtx = null;

/**
 * getAudioContext — สร้างหรือดึง AudioContext ที่มีอยู่แล้ว
 * - รองรับทั้ง window.AudioContext (standard) และ window.webkitAudioContext (Safari เก่า)
 * - ถ้า context ถูก suspend (เช่น browser ระงับไว้) จะ resume กลับมา
 */
function getAudioContext() {
  if (!audioCtx && typeof window !== 'undefined') {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  // browser อาจ suspend AudioContext หลังผู้ใช้ไม่โต้ตอบนาน → resume ก่อนเล่น
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// ─────────────────────────────────────────────────────────────────────────────
// ส่วนจัดการการตั้งค่าเสียง (บันทึกลง localStorage)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * isSoundEnabled — ตรวจสอบว่าเสียงเปิดอยู่หรือไม่
 * ค่าเริ่มต้นคือ true (เปิด) ถ้าไม่เคยตั้งค่าไว้
 */
export function isSoundEnabled() {
  const stored = localStorage.getItem('cybershield_sound_enabled');
  return stored !== 'false'; // default true
}

/**
 * setSoundEnabled — เปิด/ปิดเสียงและบันทึกลง localStorage
 * @param {boolean} enabled - true = เปิดเสียง, false = ปิดเสียง
 */
export function setSoundEnabled(enabled) {
  localStorage.setItem('cybershield_sound_enabled', enabled ? 'true' : 'false');
}

/**
 * getVolume — ดึงค่าระดับเสียง (0.0 – 1.0) จาก localStorage
 * ค่าเริ่มต้นคือ 0.4 (40%)
 */
export function getVolume() {
  const stored = localStorage.getItem('cybershield_volume');
  return stored ? parseFloat(stored) : 0.4;
}

/**
 * setVolume — บันทึกระดับเสียงลง localStorage
 * @param {number} vol - ระดับเสียง 0.0 – 1.0
 */
export function setVolume(vol) {
  localStorage.setItem('cybershield_volume', vol.toString());
}

// ─────────────────────────────────────────────────────────────────────────────
// ส่วนสร้างเสียงแบบ synthesized
// ─────────────────────────────────────────────────────────────────────────────

/**
 * playSound — เล่นเสียงแจ้งเตือนตามประเภทที่กำหนด
 * @param {'alert' | 'critical' | 'click' | 'success'} type - ประเภทเสียง
 *
 * - 'click'    → เสียงคลิก HUD สั้นๆ (ใช้ทุกครั้งที่กดปุ่ม)
 * - 'alert'    → เสียง siren ภัยคุกคามระดับปานกลาง-สูง
 * - 'critical' → เสียง pulse เร็ว 3 ครั้ง สำหรับภัยวิกฤต (DEFCON 1/2)
 * - 'success'  → เสียง chime ขึ้นสูง สำหรับการทำสำเร็จ / reconnect
 */
export function playSound(type = 'alert') {
  // ถ้าผู้ใช้ปิดเสียง ไม่ต้องเล่น
  if (!isSoundEnabled()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const vol = getVolume();

    // GainNode ควบคุมระดับเสียงรวม — เชื่อมกับ output จริง (speakers)
    const gainNode = ctx.createGain();
    gainNode.connect(ctx.destination);

    const now = ctx.currentTime;

    // ── เสียง 'click' — เสียงคลิก HUD สั้นๆ ความถี่สูง ──
    if (type === 'click') {
      // Short HUD high-pitched tick
      const osc = ctx.createOscillator();
      osc.type = 'sine';                                          // คลื่นไซน์ (เสียงนุ่ม)
      osc.frequency.setValueAtTime(1400, now);                   // เริ่มที่ความถี่สูง
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.04); // ลดลงเร็ว (เสียง "tik")

      gainNode.gain.setValueAtTime(vol * 0.3, now);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gainNode);
      osc.start(now);
      osc.stop(now + 0.04); // เล่นแค่ 40ms

    // ── เสียง 'alert' — Dual-tone Cyber Alert Siren ──
    // ใช้สำหรับภัยคุกคาม confidence >= 0.82 แต่ < 0.92
    } else if (type === 'alert') {
      // Dual-tone Cyber Alert Siren
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth'; // คลื่นเลื่อย (เสียงแหลมคม เหมือน siren)
      
      // สลับความถี่ D5 → A5 → D5 ให้ฟังดู "alert"
      osc.frequency.setValueAtTime(587.33, now);       // D5
      osc.frequency.setValueAtTime(880, now + 0.12);   // A5
      osc.frequency.setValueAtTime(587.33, now + 0.24); // D5

      gainNode.gain.setValueAtTime(0.01, now);
      gainNode.gain.linearRampToValueAtTime(vol * 0.6, now + 0.02);
      gainNode.gain.setValueAtTime(vol * 0.6, now + 0.28);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      // Lowpass filter กรองความถี่สูงเกินไปออก ให้เสียงนุ่มขึ้น
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, now);

      osc.connect(filter);
      filter.connect(gainNode);

      osc.start(now);
      osc.stop(now + 0.4); // เล่น 400ms

    // ── เสียง 'critical' — Fast repeating DEFCON 1 pulse ──
    // ใช้สำหรับภัยคุกคามวิกฤต confidence >= 0.92 (DEFCON 2)
    } else if (type === 'critical') {
      // Fast repeating DEFCON 1 pulse — เล่น 3 pulse ต่อเนื่องกัน
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        osc.type = 'square'; // คลื่นสี่เหลี่ยม (เสียงดังและแหลม)
        const start = now + i * 0.14; // แต่ละ pulse ห่างกัน 140ms
        osc.frequency.setValueAtTime(960, start);
        osc.frequency.linearRampToValueAtTime(480, start + 0.1); // ลดความถี่ลง (เสียง "dun")

        const pulseGain = ctx.createGain();
        pulseGain.gain.setValueAtTime(vol * 0.7, start);
        pulseGain.gain.exponentialRampToValueAtTime(0.001, start + 0.12);

        // Bandpass filter เน้นความถี่กลาง ให้เสียงดัง
        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1500, start);

        osc.connect(filter);
        filter.connect(pulseGain);
        pulseGain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.12);
      }

    // ── เสียง 'success' — Sci-fi ascending chime ──
    // ใช้เมื่อ: ล็อกอินสำเร็จ, reconnect สำเร็จ, สมัครสมาชิกสำเร็จ
    } else if (type === 'success') {
      // Sci-fi ascending chime — โน้ต C5, E5, G5, C6 เรียงขึ้น
      const freqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine'; // คลื่นไซน์ (เสียงนุ่ม ไม่แหลม)
        const start = now + idx * 0.08; // แต่ละโน้ตเล่นห่างกัน 80ms

        osc.frequency.setValueAtTime(freq, start);

        const toneGain = ctx.createGain();
        toneGain.gain.setValueAtTime(vol * 0.4, start);
        toneGain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);

        osc.connect(toneGain);
        toneGain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.25); // แต่ละโน้ตเล่น 250ms
      });
    }
  } catch (e) {
    // ถ้าเบราว์เซอร์ไม่รองรับ Web Audio API หรือเกิด error ใดๆ ให้ log แล้วผ่าน
    console.warn('Audio play error:', e);
  }
}
