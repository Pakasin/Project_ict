// ─────────────────────────────────────────────────────────────────────────────
// pages/Settings.jsx — หน้าตั้งค่าระบบ (System Settings)
//
// Tab ที่มี:
//   - profile:   สามารถแก้ไขชื่อ, อีเมล, เบอร์โทร, เปลี่ยนรหัสผ่าน
//   - display:   ธีมสี (dark/light), ภาษา (th/en), compact mode, refresh interval
//   - audio:     เปิด/ปิดเสียง, ปรับระดับเสียง
//   - firewall:  จัดการ IP ที่ถูกบล็อค/quarantine (Admin เท่านั้น)
//   - connection: ทดสอบสถานะ WebSocket และ Admin preview mode
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { isSoundEnabled, setSoundEnabled as saveSoundEnabled, getVolume, setVolume as saveVolume, playSound } from '../utils/sound';
import { useApp } from '../context/AppContext';
import InfoHelp from '../components/InfoHelp';
import { CONN_STATUS } from '../hooks/useConnectionStatus';
import { relativeTimeTh } from '../utils/time';

const INPUT_STYLE = {
  width: '100%', padding: '10px 14px', borderRadius: 9, border: '1px solid var(--border-soft)',
  background: 'var(--row-head-bg)', color: 'var(--text)', fontSize: 13.5, outline: 'none',
  boxSizing: 'border-box', transition: 'border-color .15s',
};

const SECTION_TITLE = { fontSize: 15, fontWeight: 700, margin: '0 0 4px', color: 'var(--text)' };
const SECTION_SUB = { fontSize: 12.5, color: 'var(--text-tertiary)', margin: '0 0 20px' };

export default function Settings() {
  const { t, lang, setLang, theme, setTheme, auth, updateProfile, previewAsGeneral, setPreviewAsGeneral, isAdminActual, isGeneralView, setAccessDeniedOpen, conn } = useApp();

  // category: tab/หมวดหมู่ที่กำลังแสดงอยู่ — เริ่มที่ 'profile'
  const [category, setCategory] = useState('profile');

  // ป้องกัน General User เข้าถึง tab firewall (ผ่าน URL หรือ admin preview mode)
  // เมื่อ isGeneralView เปลี่ยน หรือ category เปลี่ยนไปที่ firewall ให้ redirect กลับ
  useEffect(() => {
    if (isGeneralView && category === 'firewall') {
      setCategory('profile');          // บังคับกลับมาที่ profile
      setAccessDeniedOpen(true);       // เปิด modal แจ้ง "ไม่มีสิทธิ์"
    }
  }, [isGeneralView, category, setAccessDeniedOpen]);

  // ── Profile Tab State ──────────────────────────────────────────────────────────
  // โหลดข้อมูล profile จาก auth (context) เป็นค่าเริ่มต้น
  // ถ้าไม่มีข้อมูล ใช้ค่า fallback ('Admin', 'User', etc.)
  const [firstName, setFirstName] = useState(auth?.profile?.name || 'Admin');
  const [lastName, setLastName] = useState(auth?.profile?.lastname || 'User');
  const [email, setEmail] = useState(auth?.email || 'admin@cybershield.local');
  const [phone, setPhone] = useState(auth?.profile?.phone || '');
  const [profileSaved, setProfileSaved] = useState(false); // แสดงเครื่องหมาย ✓ หลังบันทึกสำเร็จ

  /**
   * saveProfile — บันทึก profile ใหม่ผ่าน updateProfile (จาก AppContext)
   * General User ไม่สามารถทำได้ (isGeneralView guard)
   */
  function saveProfile() {
    if (isGeneralView) return;              // guard: ห้าม General User แก้ไข
    playSound('click');
    updateProfile({ name: firstName, lastname: lastName, phone });
    setProfileSaved(true);                  // แสดงข้อความ "บันทึกแล้ว"
  }

  // ── Password State (UI เท่านั้น — การเปลี่ยนรหัสผ่านจริงต้องทำผ่าน backend) ──
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');

  // ── Audio Tab State ─────────────────────────────────────────────────────────────
  // โหลดค่าจาก localStorage ผ่าน utils/sound.js (isSoundEnabled, getVolume)
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  const [volume, setVolume] = useState(() => getVolume());

  /**
   * handleSoundToggle — เปิด/ปิดเสียงแจ้งเตือนทั้งหมด
   * - บันทึกลง localStorage ผ่าน saveSoundEnabled
   * - ถ้าเปิดเสียง จะเล่นเสียง success ให้ผู้ใช้รับรู้ทันที
   * @param {boolean} checked - true = เปิดเสียง
   */
  function handleSoundToggle(checked) {
    if (isGeneralView) return; // General User เปลี่ยนไม่ได้
    playSound('click');
    setSoundOn(checked);
    saveSoundEnabled(checked);
    if (checked) setTimeout(() => playSound('success'), 100); // เล่นเสียงตัวอย่างหลังเปิด
  }

  /**
   * handleVolumeChange — ปรับระดับเสียง (0.0 – 1.0)
   * บันทึกลง localStorage ผ่าน saveVolume ทันทีที่ slider เปลี่ยน
   * @param {React.ChangeEvent<HTMLInputElement>} e
   */
  function handleVolumeChange(e) {
    if (isGeneralView) return;
    const val = parseFloat(e.target.value);
    setVolume(val);
    saveVolume(val);
  }

  // ── Display Tab State ────────────────────────────────────────────────────────
  // compact mode: ลดระยะห่างและขนาด font ทั่วแอป (CSS class 'compact-theme' บน <html>)
  const [compactMode, setCompactMode] = useState(() => localStorage.getItem('cybershield_compact_mode') === 'true');

  // refreshInterval: ความถี่ดึงข้อมูลจากเซิร์ฟเวอร์ (วินาที) — '5'|'10'|'30'|'60'
  const [refreshInterval, setRefreshInterval] = useState(() => localStorage.getItem('cybershield_refresh_interval') || '10');

  /**
   * handleCompactToggle — เปิด/ปิด compact mode
   * toggle CSS class 'compact-theme' บน <html> ให้ CSS variables ทำงานทันที
   * @param {boolean} checked - true = เปิด compact mode
   */
  function handleCompactToggle(checked) {
    if (isGeneralView) return;
    playSound('click');
    setCompactMode(checked);
    localStorage.setItem('cybershield_compact_mode', checked ? 'true' : 'false');
    document.documentElement.classList.toggle('compact-theme', checked); // ปรับ CSS ทั้งแอปทันที
  }

  /**
   * handleRefreshChange — เปลี่ยนช่วงเวลา refresh ข้อมูล
   * @param {React.ChangeEvent<HTMLSelectElement>} e
   */
  function handleRefreshChange(e) {
    if (isGeneralView) return;
    playSound('click');
    setRefreshInterval(e.target.value);
    localStorage.setItem('cybershield_refresh_interval', e.target.value);
  }

  // ── Firewall Tab State ─────────────────────────────────────────────────────
  const [blockedIps, setBlockedIps] = useState([]); // รายการ IP ที่ถูกบล็อก (ดึงจาก API)

  // โหลด blocked IPs จาก API ตอน component mount
  useEffect(() => { fetchBlockedIps(); }, []);

  /**
   * fetchBlockedIps — ดึงรายการ IP ที่ถูกบล็อกจาก API /api/blocked-ips
   * อัปเดต state blockedIps เพื่อแสดงในตาราง Firewall
   */
  async function fetchBlockedIps() {
    try {
      const res = await fetch('/api/blocked-ips');
      const data = await res.json();
      if (data.ok) setBlockedIps(data.data.map(row => row.ip));
    } catch { /* ถ้า API ไม่ตอบ ให้แสดงตารางว่าง */ }
  }

  /**
   * unblockIp — ปลดบล็อก IP ที่เลือกผ่าน API DELETE /api/blocked-ips/:ip
   * General User ทำไม่ได้ (isGeneralView guard)
   * @param {string} ip - IP Address ที่ต้องการปลดบล็อก
   */
  async function unblockIp(ip) {
    if (isGeneralView) return;
    playSound('click');
    try {
      const res = await fetch(`/api/blocked-ips/${encodeURIComponent(ip)}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) { setBlockedIps(prev => prev.filter(item => item !== ip)); playSound('success'); }
    } catch { }
  }

  // ── รายการเมนูซ้าย (Sidebar Navigation ของ Settings) ─────────────────────────
  // แสดง role/firewall tab เฉพาะเมื่อ user มีสิทธิ์ (isAdminActual / !isGeneralView)
  const navItems = [
    { key: 'profile',    label: 'โปรไฟล์',        icon: 'M12 12c2.5 0 4.5-2 4.5-4.5S14.5 3 12 3 7.5 5 7.5 7.5 9.5 12 12 12Zm0 2c-4 0-7.5 2-7.5 5v1h15v-1c0-3-3.5-5-7.5-5Z' },
    { key: 'general',   label: 'ทั่วไป',           icon: 'M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0M12 3v3M12 18v3M3 12h3M18 12h3M5.5 5.5l2 2M16.5 16.5l2 2M5.5 18.5l2-2M16.5 7.5l2-2' },
    { key: 'audio',     label: 'เสียงแจ้งเตือน',   icon: 'M4 9v6h4l5 5V4L8 9H4Zm12.5 3a4.5 4.5 0 0 0-2.5-4v8a4.5 4.5 0 0 0 2.5-4Z' },
    { key: 'display',   label: 'การแสดงผล',        icon: 'M3 4h18v12H3zM8 20h8M12 16v4' },
    { key: 'connection',label: 'การเชื่อมต่อ',     icon: 'M12 3l9 16H3L12 3zM12 10v4M12 17h.01' },
    ...(isAdminActual ? [{ key: 'role',     label: 'บทบาท',      icon: 'M12 8a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM6 21v-2a6 6 0 0 1 12 0v2' }] : []),     // เฉพาะ admin จริง
    ...(!isGeneralView ? [{ key: 'system',   label: 'ระบบ & Sensor', icon: 'M3 12h4l3-8 4 16 3-8h4' }] : []),
    ...(!isGeneralView ? [{ key: 'firewall', label: 'ไฟร์วอลล์', icon: 'M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z' }] : []),               // ซ่อนจาก General User
  ];

  /**
   * SegControl — Segmented Control (radio group แบบปุ่ม pill)
   * ใช้แทน <select> เพื่อ UX ที่ดีกว่า (ธีม/ภาษา/เสียง ฯลฯ)
   * @param {string} name - ชื่อ radio group (HTML name attribute)
   * @param {string} value - ค่าที่เลือกอยู่
   * @param {Array<{value, label}>} options - ตัวเลือกทั้งหมด
   * @param {function} onChange - callback เมื่อเลือกค่าใหม่ รับ value string
   * @param {boolean} [disabled] - ถ้า true ปิดการใช้งานทุกตัวเลือก
   */
  const SegControl = ({ name, value, options, onChange, disabled }) => (
    <div style={{ display: 'flex', background: 'var(--gray-chip-bg)', borderRadius: 10, padding: 3, gap: 2 }}>
      {options.map(opt => (
        <label key={opt.value} style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}>
          <input type="radio" name={name} checked={value === opt.value} onChange={() => !disabled && onChange(opt.value)} style={{ display: 'none' }} />
          <span style={{
            display: 'block', padding: '7px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600, transition: 'all .15s',
            background: value === opt.value ? 'var(--card-bg)' : 'transparent',
            boxShadow: value === opt.value ? 'var(--shadow)' : 'none',
            color: value === opt.value ? 'var(--text)' : 'var(--text-secondary)',
          }}>
            {opt.label}
          </span>
        </label>
      ))}
    </div>
  );

  /**
   * SettingRow — แถวแสดงรายการตั้งค่า 1 รายการ
   * ประกอบด้วย: label (หัวข้อ) + desc (คำอธิบาย) + children (control ทางขวา)
   * @param {string|ReactNode} label - หัวข้อรายการ (ข้อความหรือ JSX)
   * @param {string} [desc] - คำอธิบายสั้นๆ ด้านล่าง label
   * @param {ReactNode} children - control ฝั่งขวา (SegControl, select, slider ฯลฯ)
   */
  const SettingRow = ({ label, desc, children }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 0', borderBottom: '1px solid var(--border-soft)', gap: 20, flexWrap: 'wrap' }}>
      <div>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{label}</div>
        {desc && <div className="text-muted" style={{ fontSize: 12, marginTop: 3 }}>{desc}</div>}
      </div>
      {children}
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(99,102,241,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0M12 3v3M12 18v3M3 12h3M18 12h3M5.5 5.5l2 2M16.5 16.5l2 2M5.5 18.5l2-2M16.5 7.5l2-2" />
          </svg>
        </div>
        <div>
          <h2 style={{ margin: 0 }}>การตั้งค่า</h2>
          <p className="text-muted" style={{ margin: 0, marginTop: 3, fontSize: 13 }}>จัดการโปรไฟล์ ภาษาและธีม เสียงแจ้งเตือน การแสดงผล และการกักกันของไฟร์วอลล์</p>
        </div>
      </div>

      {/* ── Layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 20, alignItems: 'start' }}>
        {/* ── Sidebar Nav ── */}
        <div className="card elev-sm" style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
          {navItems.map(item => (
            <button key={item.key} onClick={() => { playSound('click'); setCategory(item.key); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 10,
                border: 'none', cursor: 'pointer', textAlign: 'left', fontSize: 13.5, fontWeight: 600, transition: 'all .15s',
                background: category === item.key ? 'rgba(99,102,241,.12)' : 'transparent',
                color: category === item.key ? 'var(--accent)' : 'var(--text-secondary)',
              }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={item.icon} />
              </svg>
              {item.label}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Profile */}
          {category === 'profile' && (
            <>
              <div className="card elev-sm" style={{ padding: '24px 28px' }}>
                <h3 style={SECTION_TITLE}>ข้อมูลส่วนตัว</h3>
                <p style={SECTION_SUB}>แก้ไขชื่อ นามสกุล อีเมล และเบอร์โทรศัพท์ของคุณ</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)' }}>ชื่อจริง</label>
                    <input style={INPUT_STYLE} value={firstName} disabled={isGeneralView}
                      onChange={e => { setFirstName(e.target.value); setProfileSaved(false); }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)' }}>นามสกุล</label>
                    <input style={INPUT_STYLE} value={lastName} disabled={isGeneralView}
                      onChange={e => { setLastName(e.target.value); setProfileSaved(false); }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)' }}>อีเมล</label>
                    <input style={INPUT_STYLE} value={email} disabled={isGeneralView}
                      onChange={e => { setEmail(e.target.value); setProfileSaved(false); }} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)' }}>เบอร์โทรศัพท์</label>
                    <input style={INPUT_STYLE} placeholder="ระบุเบอร์โทรศัพท์" value={phone} disabled={isGeneralView}
                      onChange={e => { setPhone(e.target.value); setProfileSaved(false); }} />
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 20 }}>
                  <button className="btn btn-primary" onClick={saveProfile} disabled={isGeneralView}
                    style={{ padding: '10px 22px' }}>
                    บันทึกการเปลี่ยนแปลง
                  </button>
                  {profileSaved && (
                    <span style={{ fontSize: 13, color: '#4ade80', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      บันทึกแล้ว
                    </span>
                  )}
                </div>
              </div>

              <div className="card elev-sm" style={{ padding: '24px 28px' }}>
                <h3 style={SECTION_TITLE}>รีเซ็ตรหัสผ่าน</h3>
                <p style={SECTION_SUB}>เปลี่ยนรหัสผ่านของบัญชีผู้ใช้งาน (ต้องใช้งานผ่านระบบหลังบ้าน)</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 400 }}>
                    <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)' }}>รหัสผ่านปัจจุบัน</label>
                    <input style={INPUT_STYLE} type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} disabled />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)' }}>รหัสผ่านใหม่ (อย่างน้อย 8 ตัวอักษร)</label>
                      <input style={INPUT_STYLE} type="password" value={newPw} onChange={e => setNewPw(e.target.value)} disabled />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)' }}>ยืนยันรหัสผ่าน</label>
                      <input style={INPUT_STYLE} type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} disabled />
                    </div>
                  </div>
                </div>
                <button style={{ marginTop: 18, padding: '9px 20px', borderRadius: 9, border: '1px solid var(--border-soft)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'not-allowed', fontSize: 13 }} disabled>
                  รีเซ็ตรหัสผ่าน
                </button>
              </div>
            </>
          )}

          {/* General */}
          {category === 'general' && (
            <div className="card elev-sm" style={{ padding: '24px 28px' }}>
              <h3 style={SECTION_TITLE}>ทั่วไป</h3>
              <p style={SECTION_SUB}>ตั้งค่าภาษาและธีมของแอปพลิเคชัน</p>
              <SettingRow label="ภาษา" desc="เลือกภาษาที่แสดงในหน้าเว็บ">
                <SegControl name="lang" value={lang} options={[{ value: 'th', label: 'ไทย' }, { value: 'en', label: 'English' }]} onChange={v => setLang(v)} />
              </SettingRow>
              <SettingRow label="ธีม" desc="เลือกธีมสีสว่างหรือมืด">
                <SegControl name="theme" value={theme} options={[{ value: 'light', label: '☀️ สว่าง' }, { value: 'dark', label: '🌙 มืด' }]} onChange={v => setTheme(v)} />
              </SettingRow>
            </div>
          )}

          {/* Audio */}
          {category === 'audio' && (
            <div className="card elev-sm" style={{ padding: '24px 28px' }}>
              <h3 style={SECTION_TITLE}>เสียงแจ้งเตือน</h3>
              <p style={SECTION_SUB}>ปรับแต่งเสียงการแจ้งเตือนภัยคุกคามและระดับเสียง</p>
              <SettingRow label="เปิดใช้งานเสียง" desc="เปิด/ปิดเสียงแจ้งเตือนทั้งหมด">
                <SegControl name="siren" value={soundOn ? 'on' : 'off'} options={[{ value: 'on', label: 'เปิด' }, { value: 'off', label: 'ปิด' }]} onChange={v => handleSoundToggle(v === 'on')} disabled={isGeneralView} />
              </SettingRow>
              <SettingRow label={`ระดับเสียง (${Math.round(volume * 100)}%)`} desc="ปรับระดับเสียงของการแจ้งเตือน">
                <input type="range" min="0.05" max="1.0" step="0.05" value={volume} onChange={handleVolumeChange}
                  disabled={!soundOn || isGeneralView}
                  style={{ width: 180, accentColor: 'var(--accent)' }} />
              </SettingRow>
              <div style={{ paddingTop: 16, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-tertiary)', alignSelf: 'center' }}>ทดสอบเสียง:</span>
                {[['alert', '🚨 เสียงเตือน'], ['critical', '⚡ วิกฤต'], ['click', '🖱 คลิก'], ['success', '✓ สำเร็จ']].map(([key, label]) => (
                  <button key={key} onClick={() => playSound(key)} disabled={!soundOn}
                    style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border-soft)', background: 'var(--row-head-bg)', color: 'var(--text-secondary)', cursor: soundOn ? 'pointer' : 'not-allowed', fontSize: 12.5, opacity: soundOn ? 1 : .5 }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Display */}
          {category === 'display' && (
            <div className="card elev-sm" style={{ padding: '24px 28px' }}>
              <h3 style={SECTION_TITLE}>การแสดงผล</h3>
              <p style={SECTION_SUB}>ตั้งค่าความหนาแน่นของการแสดงผลและช่วงเวลารีเฟรช</p>
              <SettingRow label={<>โหมดกะทัดรัด <InfoHelp id="compactModeHelp" /></>} desc="ลดระยะห่างและขนาดองค์ประกอบต่างๆ">
                <SegControl name="density" value={compactMode ? 'on' : 'off'} options={[{ value: 'on', label: 'เปิด' }, { value: 'off', label: 'ปิด' }]} onChange={v => handleCompactToggle(v === 'on')} disabled={isGeneralView} />
              </SettingRow>
              <SettingRow label={<>ช่วงเวลารีเฟรช <InfoHelp id="refreshIntervalHelp" /></>} desc="ความถี่ในการดึงข้อมูลใหม่จากเซิร์ฟเวอร์">
                <select value={refreshInterval} onChange={handleRefreshChange} disabled={isGeneralView}
                  style={{ padding: '9px 14px', borderRadius: 9, border: '1px solid var(--border-soft)', background: 'var(--row-head-bg)', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}>
                  <option value="5">ทุก 5 วินาที</option>
                  <option value="10">ทุก 10 วินาที</option>
                  <option value="30">ทุก 30 วินาที</option>
                  <option value="60">ทุก 60 วินาที</option>
                </select>
              </SettingRow>
            </div>
          )}

          {/* Connection */}
          {category === 'connection' && (
            <div className="card elev-sm" style={{ padding: '24px 28px' }}>
              <h3 style={SECTION_TITLE}>สถานะการเชื่อมต่อ</h3>
              <p style={SECTION_SUB}>สถานะปัจจุบันของฟีดข้อมูลสด และแผงจำลองสถานะสำหรับสาธิต/ทดสอบ</p>

              <SettingRow label="สถานะปัจจุบัน" desc="คลิกที่ badge มุมซ้ายบนของแถบด้านข้างเพื่อสลับเชื่อมต่อสด/ขาดการเชื่อมต่อโดยตรง">
                <span className={`conn-badge ${conn.status}`} style={{ width: 'auto', cursor: 'default' }}>
                  <span className="conn-dot"></span>
                  {conn.status === CONN_STATUS.CONNECTED ? 'เชื่อมต่อสด (Real-time)' :
                    conn.status === CONN_STATUS.RECONNECTING ? 'กำลังเชื่อมต่อใหม่...' :
                    conn.status === CONN_STATUS.DEGRADED ? 'การเชื่อมต่อไม่เสถียร' : 'ขาดการเชื่อมต่อ'}
                </span>
              </SettingRow>
              {conn.status === CONN_STATUS.CONNECTED && (
                <SettingRow label="อัปเดตล่าสุดเมื่อ" desc="เวลาที่ข้อมูลสดเข้ามาล่าสุด">
                  <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{relativeTimeTh(conn.lastUpdate)}</span>
                </SettingRow>
              )}

              <div style={{ marginTop: 20, padding: '18px 20px', borderRadius: 12, background: 'var(--row-head-bg)', border: '1px solid var(--border-soft)' }}>
                <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>จำลองสถานะ (Demo)</div>
                <p style={{ ...SECTION_SUB, margin: '0 0 14px' }}>
                  สำหรับสาธิต/ทดสอบเพิ่มเติมเท่านั้น — เชื่อมต่อสด/ขาดการเชื่อมต่อสลับได้ตรงจาก badge หลักอยู่แล้ว ส่วนนี้ไว้ดูว่า UI แสดงผลอย่างไรตอน "กำลังเชื่อมต่อใหม่" หรือ "ไม่เสถียร" ซึ่งปกติระบบจะเปลี่ยนเองอัตโนมัติเมื่อเน็ตมีปัญหาจริง ไม่ใช่สิ่งที่ผู้ใช้กดเลือกเอง
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                  <button className="conn-menu-option" onClick={() => { playSound('click'); conn.simulate.connected(); }}>
                    <span className="conn-menu-mark conn-menu-mark-green">✓</span> เชื่อมต่อสด
                  </button>
                  <button className="conn-menu-option" onClick={() => { playSound('click'); conn.simulate.reconnecting(); }}>
                    <span className="conn-menu-mark conn-menu-mark-orange">↻</span> กำลังเชื่อมต่อใหม่
                  </button>
                  <button className="conn-menu-option" onClick={() => { playSound('click'); conn.simulate.degraded(); }}>
                    <span className="conn-menu-mark conn-menu-mark-yellow">!</span> การเชื่อมต่อไม่เสถียร
                  </button>
                  <button className="conn-menu-option" onClick={() => { playSound('click'); conn.simulate.disconnected(); }}>
                    <span className="conn-menu-mark conn-menu-mark-red">×</span> ขาดการเชื่อมต่อ
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Role */}
          {category === 'role' && isAdminActual && (
            <div className="card elev-sm" style={{ padding: '24px 28px' }}>
              <h3 style={SECTION_TITLE}>บทบาทผู้ใช้งาน</h3>
              <p style={SECTION_SUB}>สลับมุมมองเพื่อดูอินเทอร์เฟซในฐานะผู้ใช้งานทั่วไป</p>
              <SettingRow label={<>มุมมองปัจจุบัน <InfoHelp id="currentViewHelp" /></>} desc="เลือกประเภทการเข้าถึงที่ต้องการดูตอนนี้">
                <SegControl name="rolePreview" value={previewAsGeneral ? 'general' : 'admin'}
                  options={[{ value: 'admin', label: '🔑 ผู้ดูแลระบบ' }, { value: 'general', label: '👤 ผู้ใช้ทั่วไป' }]}
                  onChange={v => setPreviewAsGeneral(v === 'general')} />
              </SettingRow>
            </div>
          )}

          {/* System: สถานะ sensor + threshold */}
          {category === 'system' && !isGeneralView && <SystemPanel isAdmin={isAdminActual && !isGeneralView} />}

          {/* Firewall */}
          {category === 'firewall' && !isGeneralView && (
            <div className="card elev-sm" style={{ padding: '24px 28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <h3 style={{ ...SECTION_TITLE, margin: 0 }}>
                  รายการกักกัน IP <InfoHelp id="firewallHelp" /> <InfoHelp id="quarantineIp" />
                </h3>
              </div>
              <p style={SECTION_SUB}>รายการ IP Address ที่ถูกกักกันโดยผู้ดูแลระบบ</p>
              <div style={{ margin: '0 0 14px', padding: '10px 14px', borderRadius: 8, borderLeft: '3px solid #fbbf24', background: 'rgba(251,191,36,.08)', color: '#fbbf24', fontSize: 12.5, fontWeight: 600 }}>
                บันทึกเท่านั้น — ระบบยังไม่ได้บล็อก IP ที่ไฟร์วอลล์จริง (iptables/nft)
              </div>
              {blockedIps.length === 0 ? (
                <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 10, opacity: .4 }}><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"></path><path d="M9.5 9.5l5 5M14.5 9.5l-5 5"></path></svg>
                  <div>ไม่มี IP ที่ถูกบล็อกในขณะนี้</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {blockedIps.map((ip, i) => (
                    <div key={ip} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 0', borderBottom: i < blockedIps.length - 1 ? '1px solid var(--border-soft)' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(239,68,68,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171' }}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" /><path d="M9.5 9.5l5 5M14.5 9.5l-5 5" /></svg>
                        </div>
                        <span className="mono" style={{ fontSize: 13.5, fontWeight: 600 }}>{ip}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <button onClick={() => unblockIp(ip)} disabled={isGeneralView}
                          style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--border-soft)', background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12.5, fontWeight: 600 }}>
                          ปลดบล็อก
                        </button>
                        <InfoHelp id="unblockHelp" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}


// ── SystemPanel — สถานะ backend/โมเดล/Sensor จริง (/api/health) และ threshold ต่อโมเดล ──────────
const MODEL_LABEL = { intrusion: 'Intrusion Model', flow: 'Flow Model', sqli: 'Injection Model (SQLi)' };

function SystemPanel({ isAdmin }) {
  const [health, setHealth] = useState(null);      // /api/health
  const [healthErr, setHealthErr] = useState(false);
  const [thr, setThr] = useState(null);            // { model: { value, default } }
  const [draft, setDraft] = useState({});          // ค่าที่กำลังแก้ใน input
  const [msg, setMsg] = useState('');
  const [webhook, setWebhook] = useState('');     // URL webhook แจ้งเตือน (admin เท่านั้นที่อ่านได้)
  const [hookMsg, setHookMsg] = useState('');

  async function loadHealth() {
    try {
      const d = await (await fetch('/api/health')).json();
      if (d.ok) { setHealth(d.data); setHealthErr(false); } else setHealthErr(true);
    } catch { setHealthErr(true); }
  }
  async function loadThr() {
    try {
      const d = await (await fetch('/api/settings/thresholds')).json();
      if (d.ok) { setThr(d.data); setDraft(Object.fromEntries(Object.entries(d.data).map(([m, v]) => [m, String(v.value)]))); }
    } catch { /* แสดงเป็นว่าง */ }
  }
  async function loadWebhook() {
    if (!isAdmin) return;
    try {
      const d = await (await fetch('/api/settings/notifications')).json();
      if (d.ok) setWebhook(d.data.webhook_url);
    } catch { /* ปล่อยว่าง */ }
  }
  async function saveWebhook(test = false) {
    playSound('click');
    try {
      const url = test ? '/api/settings/notifications/test' : '/api/settings/notifications';
      const res = await fetch(url, test ? { method: 'POST' } : { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ webhook_url: webhook }) });
      if (res.status === 401 || res.status === 403) { setHookMsg('ต้องเข้าสู่ระบบด้วยบัญชี admin'); return; }
      const d = await res.json();
      setHookMsg(d.ok ? (test ? 'ส่งข้อความทดสอบแล้ว — ตรวจที่ปลายทาง' : 'บันทึกแล้ว') : (d.error || 'ไม่สำเร็จ'));
    } catch { setHookMsg('เชื่อมต่อ API ไม่ได้'); }
  }

  useEffect(() => {
    loadHealth(); loadThr(); loadWebhook();
    const id = setInterval(loadHealth, 10000);
    return () => clearInterval(id);
  }, []);

  async function saveThresholds() {
    const body = {};
    for (const [m, v] of Object.entries(draft)) {
      const n = Number(v);
      if (!(n > 0 && n <= 1)) { setMsg(`${MODEL_LABEL[m] || m}: ต้องเป็นตัวเลข 0–1`); return; }
      body[m] = n;
    }
    playSound('click');
    try {
      const res = await fetch('/api/settings/thresholds', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ thresholds: body }) });
      if (res.status === 401 || res.status === 403) { setMsg('ต้องเข้าสู่ระบบด้วยบัญชี admin'); return; }
      const d = await res.json();
      if (d.ok) { setMsg('บันทึกแล้ว — มีผลกับเหตุการณ์ถัดไปทันที'); playSound('success'); loadThr(); }
      else setMsg(d.error || 'บันทึกไม่สำเร็จ');
    } catch { setMsg('เชื่อมต่อ API ไม่ได้'); }
  }

  const dot = (ok) => <span style={{ width: 9, height: 9, borderRadius: 999, background: ok ? '#4ade80' : '#f87171', display: 'inline-block', marginRight: 8 }} />;
  const row = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid var(--border-soft)', fontSize: 13.5 };
  const ago = (sec) => sec == null ? '—' : sec < 60 ? `${Math.round(sec)} วินาทีที่แล้ว` : sec < 3600 ? `${Math.round(sec / 60)} นาทีที่แล้ว` : `${Math.round(sec / 3600)} ชั่วโมงที่แล้ว`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="card elev-sm" style={{ padding: '24px 28px' }}>
        <h3 style={SECTION_TITLE}>สถานะระบบ</h3>
        <p style={SECTION_SUB}>ข้อมูลจริงจาก backend — รีเฟรชทุก 10 วินาที</p>
        {healthErr && <div style={{ color: '#f87171', fontSize: 13 }}>เชื่อมต่อ API ไม่ได้</div>}
        {health && (<>
          <div style={row}><span>{dot(health.db)}ฐานข้อมูล (SQLite)</span><span className="text-muted">{health.db ? 'ปกติ' : 'ผิดปกติ'}</span></div>
          {Object.entries(health.models).map(([m, ok]) => (
            <div key={m} style={row}><span>{dot(ok)}{MODEL_LABEL[m] || m}</span><span className="text-muted">{ok ? 'โหลดแล้ว' : 'ยังไม่โหลด'}</span></div>
          ))}
        </>)}
      </div>

      <div className="card elev-sm" style={{ padding: '24px 28px' }}>
        <h3 style={SECTION_TITLE}>Sensor</h3>
        <p style={SECTION_SUB}>ถือว่า online ถ้าส่ง event หรือ heartbeat ภายใน {health?.online_window_seconds ?? 120} วินาที</p>
        {health && health.sensors.length === 0 && (
          <div className="text-muted" style={{ fontSize: 13, padding: '16px 0' }}>ยังไม่เคยได้รับสัญญาณจาก sensor ใดเลย — เริ่ม network_sensor / http_sensor / live_sensor_lite ก่อน</div>
        )}
        {health?.sensors.map((sn) => (
          <div key={sn.sensor} style={row}>
            <span>{dot(sn.online)}<strong>{sn.sensor}</strong>{sn.info ? <span className="text-muted"> · {sn.info}</span> : null}</span>
            <span className="text-muted">{sn.online ? 'online' : 'offline'} · เห็นล่าสุด {ago(sn.age_seconds)}</span>
          </div>
        ))}
      </div>

      <div className="card elev-sm" style={{ padding: '24px 28px' }}>
        <h3 style={SECTION_TITLE}>Threshold การแจ้งเตือน</h3>
        <p style={SECTION_SUB}>ค่า confidence ขั้นต่ำที่ถือเป็น alert ของแต่ละโมเดล (มีผลกับเหตุการณ์ใหม่ที่ sensor ส่งเข้ามาทันที ไม่ต้อง restart)</p>
        {thr && Object.entries(thr).map(([m, v]) => (
          <div key={m} style={row}>
            <span>{MODEL_LABEL[m] || m} <span className="text-muted" style={{ fontSize: 12 }}>(ค่าเริ่มต้น .env: {v.default})</span></span>
            <input type="number" step="0.01" min="0.01" max="1" value={draft[m] ?? ''} disabled={!isAdmin}
              onChange={(e) => setDraft((d) => ({ ...d, [m]: e.target.value }))}
              style={{ ...INPUT_STYLE, width: 90, textAlign: 'right' }} />
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 16 }}>
          <button className="btn btn-primary" onClick={saveThresholds} disabled={!isAdmin || !thr}>บันทึก</button>
          {!isAdmin && <span className="text-muted" style={{ fontSize: 12.5 }}>เฉพาะผู้ดูแลระบบ</span>}
          {msg && <span style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>{msg}</span>}
        </div>
      </div>

      <div className="card elev-sm" style={{ padding: '24px 28px' }}>
        <h3 style={SECTION_TITLE}>แจ้งเตือนภายนอก (Webhook)</h3>
        <p style={SECTION_SUB}>ส่ง alert ไป Slack / Discord / ระบบอื่นที่รับ JSON ทันทีที่ตรวจพบ (IP+ประเภทเดิมซ้ำไม่ส่งภายใน 60 วินาที)</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input value={webhook} onChange={(e) => setWebhook(e.target.value)} disabled={!isAdmin} placeholder="https://hooks.slack.com/services/..."
            style={{ ...INPUT_STYLE, flex: 1, minWidth: 260 }} />
          <button className="btn btn-primary" onClick={() => saveWebhook(false)} disabled={!isAdmin}>บันทึก</button>
          <button className="btn btn-outline" onClick={() => saveWebhook(true)} disabled={!isAdmin || !webhook}>ทดสอบส่ง</button>
        </div>
        <div style={{ marginTop: 10, fontSize: 12.5, color: 'var(--text-secondary)' }}>
          {!isAdmin ? 'เฉพาะผู้ดูแลระบบ' : hookMsg || 'เว้นว่างแล้วบันทึกเพื่อปิดการแจ้งเตือน'}
        </div>
      </div>
    </div>
  );
}
