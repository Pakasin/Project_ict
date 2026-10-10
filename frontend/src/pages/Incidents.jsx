// ─────────────────────────────────────────────────────────────────────────────
// pages/Incidents.jsx — หน้าจัดการเหตุการณ์ภัยคุกคาม (Incident Management)
//
// ประกอบด้วย:
//   - ตารางรายการเหตุการณ์พร้อม filter/search/sort และ date picker ภาษาไทย
//   - Triage flow: OPEN → INVESTIGATING → MITIGATED (สิ้นสุด)
//   - Donut Chart สัดส่วนระดับความรุนแรง + Audit Log การดำเนินการ
//   - ดึงข้อมูลจาก API (/api/logs, /api/incidents/statuses) ไม่มี mock — ถ้า API ล้มเหลวแสดง error banner
//   - Live feed: subscribe WebSocket /ws/feed เพื่อรับ alert ใหม่แบบ real-time
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react';
import { playSound } from '../utils/sound';
import ThreatInspectModal from '../components/ThreatInspectModal';
import InfoHelp from '../components/InfoHelp';
import { useApp } from '../context/AppContext';
import { CONN_STATUS } from '../hooks/useConnectionStatus';
import { useLiveEvents } from '../hooks/useLiveEvents';

const SEV_CONFIG = {
  CRITICAL: { label: 'วิกฤต', bg: 'rgba(239,68,68,.15)', color: '#f87171' },
  HIGH:     { label: 'สูง',    bg: 'rgba(249,115,22,.15)', color: '#fb923c' },
  MEDIUM:   { label: 'ปานกลาง', bg: 'rgba(234,179,8,.15)', color: '#fbbf24' },
  LOW:      { label: 'ต่ำ',    bg: 'rgba(34,197,94,.12)', color: '#4ade80' },
  INFO:     { label: 'ข้อมูล', bg: 'rgba(59,130,246,.12)', color: '#60a5fa' },
};

const STATUS_CONFIG = {
  OPEN:          { label: 'เปิดอยู่',      dot: '#f87171', dotBg: 'rgba(239,68,68,.12)' },
  INVESTIGATING: { label: 'กำลังตรวจสอบ', dot: '#fbbf24', dotBg: 'rgba(234,179,8,.12)' },
  MITIGATED:     { label: 'แก้ไขแล้ว',    dot: '#4ade80', dotBg: 'rgba(34,197,94,.12)', check: true },
};

// กระบวนการ Triage: OPEN → INVESTIGATING → MITIGATED. MITIGATED ไม่มี `next` —
// เป็นขั้นสุดท้าย (การแก้ไขเสร็จจะกักกัน source IP ฝั่งเซิร์ฟเวอร์โดยอัตโนมัติ)
const STATUS_FLOW = {
  OPEN:          { next: 'INVESTIGATING', label: 'เริ่มตรวจสอบ',    action: 'เปลี่ยนสถานะเป็นกำลังตรวจสอบ' },
  INVESTIGATING: { next: 'MITIGATED',     label: 'ทำเครื่องหมายว่าแก้ไขแล้ว', action: 'แก้ไข/กักกันเหตุการณ์เรียบร้อย' },
};

// ── Donut Chart — วงแหวนแสดงสัดส่วนระดับความรุนแรง ─────────────────────────────────────────────────
function DonutChart({ counts, total }) {
  const R = 60, cx = 80, cy = 80, stroke = 20;
  const C = 2 * Math.PI * R;
  const segments = [
    { key: 'CRITICAL', count: counts.CRITICAL, color: '#f87171' },
    { key: 'HIGH',     count: counts.HIGH,     color: '#fb923c' },
    { key: 'MEDIUM',   count: counts.MEDIUM,   color: '#fbbf24' },
    { key: 'LOW',      count: counts.LOW,      color: '#4ade80' },
    { key: 'INFO',     count: counts.INFO,     color: '#60a5fa' },
  ].filter(s => s.count > 0);

  let offset = 0;
  return (
    <svg width={160} height={160} viewBox="0 0 160 160">
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--border-soft)" strokeWidth={stroke} />
      {segments.map((seg) => {
        const dash = (seg.count / (total || 1)) * C;
        const gap = C - dash;
        const el = (
          <circle key={seg.key} cx={cx} cy={cy} r={R} fill="none"
            stroke={seg.color} strokeWidth={stroke}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={-offset}
            strokeLinecap="butt"
            style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }}
          />
        );
        offset += dash;
        return el;
      })}
      <text x={cx} y={cy - 8} textAnchor="middle" fontSize="22" fontWeight="700" fill="var(--text)">{total}</text>
      <text x={cx} y={cy + 12} textAnchor="middle" fontSize="9.5" fill="var(--text-tertiary)">รวมทั้งหมด</text>
      <text x={cx} y={cy + 24} textAnchor="middle" fontSize="9.5" fill="var(--text-tertiary)">เหตุการณ์ทั้งหมด</text>
    </svg>
  );
}

// ── ไอคอนใน Audit Log ──────────────────────────────────────────────────────────
function AuditIcon({ type }) {
  if (type === 'check') return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
  if (type === 'block') return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>;
  if (type === 'calendar') return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
}

// ── Thai Date Picker — ตัวเลือกวันที่ภาษาไทย (ปีพุทธศักราช) ──────────────────────────────────────
const TH_MONTHS       = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม']; // ชื่อเดือนเต็ม (index 0–11)
const TH_MONTHS_SHORT = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];     // ชื่อเดือนย่อ (ใช้ใน month picker)
const TH_DAYS         = ['จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์','อาทิตย์'];                                      // ชื่อวันในสัปดาห์ (เริ่มจันทร์)

/**
 * ThaiDatePicker — ตัวเลือกวันที่ภาษาไทย (ปีพุทธศักราช)
 * @param {string} value    - วันที่ที่เลือกอยู่ในรูปแบบ ISO "YYYY-MM-DD" (CE)
 * @param {function} onChange - callback เมื่อเลือกวันใหม่ ส่ง ISO string กลับ
 */
function ThaiDatePicker({ value, onChange }) {
  // pickerView: มุมมองปัจจุบันของ calendar popup — 'day' | 'month' | 'year'
  const [open, setOpen] = React.useState(false);
  const [pickerView, setPickerView] = React.useState('day');

  // view: วันที่ใช้ navigate ภายใน calendar (เดือน/ปีที่กำลังดู ไม่ใช่ที่เลือก)
  const [view, setView] = React.useState(() => value ? new Date(value + 'T00:00:00') : new Date());

  // inputVal: ข้อความใน text input เช่น "19/05/2568"
  const [inputVal, setInputVal] = React.useState(() => {
    if (!value) return '';
    const d = new Date(value + 'T00:00:00');
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    return `${dd}/${mm}/${d.getFullYear()+543}`; // แปลงปี CE → พ.ศ. แล้วแสดง
  });
  const ref = React.useRef(null); // ref ของ wrapper ใช้ตรวจจับ click นอก picker

  // ปิด calendar popup เมื่อผู้ใช้คลิกนอก component
  React.useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);

  // sync inputVal เมื่อ value เปลี่ยนจากภายนอก (เช่น กด clear)
  React.useEffect(() => {
    if (!value) { setInputVal(''); return; }
    const d = new Date(value + 'T00:00:00');
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    setInputVal(`${dd}/${mm}/${d.getFullYear()+543}`);
  }, [value]);

  // คำนวณค่าพื้นฐานสำหรับ render calendar ในเดือนปัจจุบัน
  const year  = view.getFullYear();  // ปี ค.ศ. ของ view
  const month = view.getMonth();     // เดือน (0-11) ของ view
  const bYear = year + 543;          // แปลงเป็น พ.ศ. เพื่อแสดงหัว
  const firstDay    = new Date(year, month, 1).getDay(); // วันที่ 1 ของเดือนตกวันอะไร (0=อาทิตย์)
  const startOffset = (firstDay + 6) % 7;               // offset สำหรับ grid (เริ่มจันทร์)
  const daysInMonth = new Date(year, month + 1, 0).getDate(); // จำนวนวันในเดือน
  const selected = value ? new Date(value + 'T00:00:00') : null; // วันที่ที่ถูกเลือกไว้

  // ── helpers ── ฟังก์ชันช่วยภายใน ──

  /**
   * commitDay — ยืนยันการเลือกวัน แล้วปิด calendar
   * @param {number} day - วันที่ที่เลือก (1-31)
   */
  function commitDay(day) {
    const d = new Date(year, month, day);
    const iso = d.toISOString().slice(0,10); // แปลงเป็น ISO string ส่งกลับ
    onChange(iso);
    // อัปเดต text input ให้แสดง วว/ดด/ปปปป (พ.ศ.)
    const dd = String(d.getDate()).padStart(2,'0');
    const mm = String(d.getMonth()+1).padStart(2,'0');
    setInputVal(`${dd}/${mm}/${d.getFullYear()+543}`);
    setOpen(false);         // ปิด calendar popup
    setPickerView('day');   // reset กลับเป็น day view
  }

  /**
   * parseInput — แปลง text ที่พิมพ์ใน input เป็น Date object
   * รองรับรูปแบบ: วว/ดด/ปปปป หรือ วว-ดด-ปปปป ทั้ง พ.ศ. และ ค.ศ.
   * @returns {Date|null} Date object หรือ null ถ้า format ไม่ถูกต้อง
   */
  function parseInput(raw) {
    const clean = raw.replace(/-/g,'/').trim(); // แทนที่ขีดกลางด้วย /
    const parts  = clean.split('/');
    if (parts.length !== 3) return null; // ต้องมีพอดี 3 ส่วน
    const dd = parseInt(parts[0],10);
    const mm = parseInt(parts[1],10);
    const yy = parseInt(parts[2],10);
    if (isNaN(dd)||isNaN(mm)||isNaN(yy)) return null; // ตัวเลขไม่ถูกต้อง
    // ถ้าปีมากกว่า 2500 ถือว่าเป็น พ.ศ. → ลบ 543 เพื่อแปลงเป็น ค.ศ.
    const ceYear = yy > 2500 ? yy - 543 : yy;
    if (mm < 1||mm > 12||dd < 1||dd > 31||ceYear < 1900||ceYear > 2200) return null; // ค่าเกินขอบเขต
    const date = new Date(ceYear, mm-1, dd);
    if (date.getMonth() !== mm-1) return null; // ตรวจสอบวันล้นเดือน เช่น 31/02
    return date;
  }

  /**
   * handleInputChange — จัดการ input ขณะพิมพ์
   * - กรองตัวอักษรที่ไม่ใช่ตัวเลขหรือ /
   * - ใส่ / อัตโนมัติหลังวันและเดือน
   * - ถ้า parse ได้ จะ call onChange ทันที (live update)
   */
  function handleInputChange(e) {
    let raw = e.target.value;
    raw = raw.replace(/[^0-9/]/g,'');                              // กรองอักขระที่ไม่ใช่ตัวเลขและ /
    if (raw.length === 2 && !raw.includes('/')) raw += '/';        // ใส่ / หลังวันอัตโนมัติ
    if (raw.length === 5 && raw.split('/').length === 2) raw += '/'; // ใส่ / หลังเดือนอัตโนมัติ
    if (raw.length > 10) raw = raw.slice(0,10);                    // จำกัดความยาวสูงสุด 10 ตัว
    setInputVal(raw);
    // ถ้าข้อความที่พิมพ์ parse ได้แล้ว ให้อัปเดต value ทันที
    const d = parseInput(raw);
    if (d) {
      onChange(d.toISOString().slice(0,10));
      setView(d); // เลื่อน calendar ไปแสดงเดือนของวันที่นั้น
    }
  }

  /**
   * handleInputKeyDown — จัดการ keyboard shortcut ใน text input
   * - Enter: ยืนยันวันที่แล้วปิด calendar
   * - Escape: ปิด calendar โดยไม่เปลี่ยนค่า
   */
  function handleInputKeyDown(e) {
    if (e.key === 'Enter') {
      const d = parseInput(inputVal);
      if (d) { onChange(d.toISOString().slice(0,10)); setView(d); setOpen(false); }
    }
    if (e.key === 'Escape') setOpen(false);
  }

  // ตรวจสอบว่าวันนี้ (today) อยู่ในเดือน/ปีที่กำลังดูอยู่
  const isToday = (day) => {
    const t = new Date();
    return day === t.getDate() && month === t.getMonth() && year === t.getFullYear();
  };
  // ตรวจสอบว่าวันนั้นเป็นวันที่ user เลือกไว้
  const isSelected = (day) =>
    selected && day === selected.getDate() && month === selected.getMonth() && year === selected.getFullYear();

  // ช่วงปีสำหรับ year picker — แสดง 12 ปีต่อหน้า (grid 3×4)
  const yearRangeStart = Math.floor((year - 543) / 12) * 12;
  const yearsBE = Array.from({length:12},(_,i) => yearRangeStart + i + 543);

  // ── ฟังก์ชัน format ข้อความบนปุ่มเลือกวัน (trigger button) ──
  function formatDisplay(d) {
    if (!d) return 'วันที่…'; // placeholder เมื่อยังไม่ได้เลือก
    return `${d.getDate()} ${TH_MONTHS[d.getMonth()].slice(0,3)}. ${d.getFullYear()+543}`; // เช่น "1 ม.ค. 2568"
  }

  const navBtn = (style={}) => ({
    background:'none', border:'none', cursor:'pointer',
    color:'var(--text-secondary)', padding:'4px 8px',
    borderRadius:6, fontSize:17, lineHeight:1, ...style
  });

  const headerClickable = {
    cursor:'pointer', borderRadius:6, padding:'2px 6px',
    transition:'background .12s',
    ':hover':{ background:'var(--row-head-bg)' },
  };

  return (
    <div ref={ref} style={{ position:'relative' }}>
      {/* ── trigger button ── */}
      <button
        onClick={() => {
          // sync view to selected date when opening so selected month/year is visible
          if (value) setView(new Date(value + 'T00:00:00'));
          setOpen(o=>!o);
          setPickerView('day');
        }}
        style={{
          display:'flex', alignItems:'center', gap:8,
          padding:'8px 14px', borderRadius:8,
          border:`1.5px solid ${open ? 'var(--accent)' : 'var(--border-soft)'}`,
          background:'var(--row-head-bg)', color: value ? 'var(--text)' : 'var(--text-secondary)',
          cursor:'pointer', fontSize:12.5, fontWeight: value ? 600 : 400,
          whiteSpace:'nowrap', transition:'border-color .15s',
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/>
          <line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        {value ? formatDisplay(new Date(value + 'T00:00:00')) : 'วันที่…'}
        {value && (
          <span onClick={e=>{ e.stopPropagation(); onChange(''); setInputVal(''); }}
            style={{ marginLeft:4, opacity:.5, lineHeight:1, fontSize:14 }}>✕</span>
        )}
      </button>

      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 6px)', left:0, zIndex:200,
          background:'var(--card-bg)', border:'1px solid var(--border-soft)',
          borderRadius:14, boxShadow:'0 8px 32px rgba(0,0,0,.2)',
          padding:16, width:300,
        }}>

          {/* ── manual text input ── */}
          <div style={{ marginBottom:12, display:'flex', alignItems:'center', gap:8,
            background:'var(--row-head-bg)', border:'1px solid var(--border-soft)',
            borderRadius:8, padding:'7px 12px' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2">
              <line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/>
              <line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/>
            </svg>
            <input
              value={inputVal}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              placeholder="วว/ดด/ปปปป (พ.ศ.)"
              style={{
                border:'none', background:'transparent', outline:'none',
                fontSize:12.5, color:'var(--text)', flex:1,
                fontFamily:'inherit',
              }}
            />
          </div>

          {/* ── DAY VIEW ── */}
          {pickerView === 'day' && (<>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
              <button style={navBtn()} onClick={() => setView(new Date(year, month-1, 1))}>‹</button>
              <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                <button onClick={() => setPickerView('month')}
                  style={{ background:'none', border:'none', cursor:'pointer',
                    fontWeight:700, fontSize:13.5, color:'var(--text)',
                    padding:'2px 8px', borderRadius:6,
                    transition:'background .12s' }}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--row-head-bg)'}
                  onMouseLeave={e=>e.currentTarget.style.background='none'}
                >
                  {TH_MONTHS[month]}
                </button>
                <button onClick={() => setPickerView('year')}
                  style={{ background:'none', border:'none', cursor:'pointer',
                    fontWeight:600, fontSize:13.5, color:'var(--text-secondary)',
                    padding:'2px 8px', borderRadius:6,
                    transition:'background .12s' }}
                  onMouseEnter={e=>e.currentTarget.style.background='var(--row-head-bg)'}
                  onMouseLeave={e=>e.currentTarget.style.background='none'}
                >
                  {bYear}
                </button>
              </div>
              <button style={navBtn()} onClick={() => setView(new Date(year, month+1, 1))}>›</button>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:4 }}>
              {TH_DAYS.map(d=>(
                <div key={d} style={{ textAlign:'center', fontSize:10, fontWeight:600,
                  color:'var(--text-tertiary)', padding:'2px 0' }}>{d}</div>
              ))}
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
              {Array(startOffset).fill(null).map((_,i)=><div key={'e'+i}/>)}
              {Array(daysInMonth).fill(null).map((_,i)=>{
                // sel = isSelected: วันที่ user เลือกจริง — tod = วันนี้ของระบบ (คนละ state)
                const day=i+1; const sel=isSelected(day); const tod=isToday(day);
                return (
                  <button key={day} onClick={()=>commitDay(day)}
                    style={{
                      position:'relative',
                      width:'100%', aspectRatio:'1', borderRadius:8,
                      cursor:'pointer', fontSize:12.5, fontWeight:sel?700:400,
                      transition:'background .12s, border-color .12s',
                      // selected: สีฟ้าจาง — ไม่ผูกกับ isToday เลย
                      border: sel ? '1px solid rgba(37,99,235,0.20)' : '1px solid transparent',
                      background: sel ? 'rgba(37,99,235,0.12)' : 'transparent',
                      color: sel ? '#2563EB' : 'var(--text)',
                    }}
                    onMouseEnter={e=>{ if(!sel) e.currentTarget.style.background='var(--row-head-bg)'; }}
                    onMouseLeave={e=>{ if(!sel) e.currentTarget.style.background='transparent'; }}
                  >
                    {day}
                    {/* วันนี้: dot เล็กๆ เท่านั้น ห้าม background เด็ดขาด */}
                    {tod && !sel && (
                      <span style={{
                        position:'absolute', bottom:2, left:'50%', transform:'translateX(-50%)',
                        width:3, height:3, borderRadius:'50%',
                        background:'var(--text-tertiary)', display:'block',
                      }}/>
                    )}
                  </button>
                );
              })}
            </div>
          </>)}

          {/* ── MONTH VIEW ── */}
          {pickerView === 'month' && (<>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <button style={navBtn()} onClick={()=>setView(new Date(year-1,month,1))}>‹</button>
              <button onClick={()=>setPickerView('year')}
                style={{ background:'none', border:'none', cursor:'pointer',
                  fontWeight:700, fontSize:13.5, color:'var(--text)',
                  padding:'2px 8px', borderRadius:6 }}
              >{bYear}</button>
              <button style={navBtn()} onClick={()=>setView(new Date(year+1,month,1))}>›</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:4 }}>
              {TH_MONTHS_SHORT.map((m,i)=>{
                // isSelectedM: เดือนที่ user เลือกจริงๆ — เปรียบกับ selected (จาก prop value) เท่านั้น
                // ต้องเช็คทั้ง month และ year ของ selected กับปีที่กำลัง view อยู่
                const isSelectedM = selected
                  && selected.getMonth() === i
                  && selected.getFullYear() === year;
                // ห้ามใช้ isViewM เป็น selected state — แค่ใช้สำหรับ subtle outline เพื่อบอกว่า view ชี้อยู่ที่ไหน
                const isViewM = i === month && !isSelectedM;
                return (
                  <button key={i}
                    onClick={()=>{
                      // เมื่อกดเดือน: navigate view ไปที่เดือนนั้น แล้วกลับไป day view
                      // การ commit วันที่จริงยังต้องทำใน day view
                      setView(new Date(year, i, 1));
                      setPickerView('day');
                    }}
                    style={{
                      padding:'8px 2px', borderRadius:8, cursor:'pointer', textAlign:'center',
                      // selected: พื้นหลังฟ้าเข้มแบบจาง + border ฟ้า
                      border: isSelectedM
                        ? '1px solid rgba(37,99,235,0.25)'
                        : '1px solid transparent',
                      background: isSelectedM
                        ? 'rgba(37,99,235,0.12)'
                        : 'transparent',
                      color: isSelectedM ? '#2563EB' : 'var(--text)',
                      fontWeight: isSelectedM ? 700 : 500,
                      fontSize:12.5,
                      transition:'background .12s, border-color .12s, color .12s',
                    }}
                    onMouseEnter={e=>{
                      if (!isSelectedM) {
                        e.currentTarget.style.background = 'var(--row-head-bg)';
                        e.currentTarget.style.borderColor = 'var(--border-soft)';
                      }
                    }}
                    onMouseLeave={e=>{
                      if (!isSelectedM) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.borderColor = 'transparent';
                      }
                    }}
                  >{m}</button>
                );
              })}
            </div>
          </>)}

          {/* ── YEAR VIEW ── */}
          {pickerView === 'year' && (<>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <button style={navBtn()} onClick={()=>setView(new Date(year-12,month,1))}>‹</button>
              <span style={{ fontWeight:700, fontSize:13.5, color:'var(--text)' }}>
                {yearsBE[0]}–{yearsBE[yearsBE.length-1]}
              </span>
              <button style={navBtn()} onClick={()=>setView(new Date(year+12,month,1))}>›</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:6 }}>
              {yearsBE.map(by=>{
                // isViewY: ปีที่ view กำลัง navigate อยู่
                const isViewY = (by - 543) === year;
                // isSelectedY: ปีของวันที่ที่ user เลือกจริงๆ (จาก prop value)
                const isSelectedY = selected && (by - 543) === selected.getFullYear();
                return (
                  <button key={by} onClick={()=>{ setView(new Date(by-543,month,1)); setPickerView('month'); }}
                    style={{
                      padding:'10px 4px', borderRadius:8, cursor:'pointer', fontSize:12.5,
                      transition:'background .12s',
                      // ปีที่ selected ใช้สีฟ้าเข้มแบบจาง; ปี view ปัจจุบัน outline เบาๆ; อื่นๆ transparent
                      border: isSelectedY
                        ? '1px solid rgba(37,99,235,0.25)'
                        : isViewY
                          ? '1px solid var(--border-soft)'
                          : '1px solid transparent',
                      background: isSelectedY ? 'rgba(37,99,235,0.12)' : 'transparent',
                      color: isSelectedY ? '#2563EB' : 'var(--text)',
                      fontWeight: isSelectedY ? 700 : isViewY ? 600 : 500,
                    }}
                    onMouseEnter={e=>{
                      if (!isSelectedY) e.currentTarget.style.background = 'var(--row-head-bg)';
                    }}
                    onMouseLeave={e=>{
                      if (!isSelectedY) e.currentTarget.style.background = 'transparent';
                    }}
                  >{by}</button>
                );
              })}
            </div>
          </>)}

        </div>
      )}
    </div>
  );
}

// ── ฟังก์ชันช่วย (Helpers) ─────────────────────────────────────────────────────
/**
 * timeAgo — แปลง timestamp เป็นข้อความ relative ภาษาไทย
 * ตัวอย่าง: "5 นาทีที่แล้ว", "2 ชั่วโมงที่แล้ว", "1 วันที่แล้ว"
 * @param {string} ts - ISO timestamp string
 * @returns {string} ข้อความเวลาแบบ relative ภาษาไทย
 */
function timeAgo(ts) {
  const diff = Math.floor((Date.now() - new Date(ts)) / 60000); // diff = จำนวนนาทีที่ผ่านมา
  if (diff < 60) return `${diff} นาทีที่แล้ว`;
  if (diff < 1440) return `${Math.floor(diff / 60)} ชั่วโมงที่แล้ว`;
  return `${Math.floor(diff / 1440)} วันที่แล้ว`;
}

/**
 * formatTH — แปลง timestamp เป็นข้อความภาษาไทย (th-TH locale)
 * แสดง: "19 พ.ค. 2568 14:32:11" (24 ชม. ไม่ใช้ AM/PM)
 * @param {string} ts - ISO timestamp string
 * @returns {string} เวลาไทย หรือ ts เดิมถ้าแปลงไม่ได้
 */
function formatTH(ts) {
  try {
    return new Date(ts).toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  } catch { return ts; }
}

// ── Component หลัก (Incidents) ────────────────────────────────────────────────────
export default function Incidents() {
  const { t, isGeneralView, conn } = useApp();
  const liveEnabled = conn.status !== CONN_STATUS.DISCONNECTED; // ปุ่มซิงค์ disabled ถ้าไม่เชื่อมต่อ

  // incidents: รายการทั้งหมด — เริ่มจาก MOCK แล้วเขียนทับด้วยข้อมูลจาก API
  const [incidents,      setIncidents]      = useState([]);
  const [loading,        setLoading]        = useState(false);
  const [loadError,      setLoadError]      = useState(false);  // true = เรียก /api/logs ไม่สำเร็จ

  // selectedEvent: event ที่คลิกเปิด ThreatInspectModal (null = ไม่มี modal เปิดอยู่)
  const [selectedEvent,  setSelectedEvent]  = useState(null);

  // ── Filter & Pagination State ──
  const [filterStatus,   setFilterStatus]   = useState('ALL');       // กรองตามสถานะ Triage
  const [statusMap,      setStatusMap]      = useState({});          // { id: 'OPEN'|'INVESTIGATING'|'MITIGATED' }
  const [auditLogs,      setAuditLogs]      = useState([]);  // บันทึกการดำเนินการ
  const [severityFilter, setSeverityFilter] = useState('ALL');       // กรองระดับความรุนแรง
  const [typeFilter,     setTypeFilter]     = useState('ALL');       // กรองประเภทการโจมตี
  const [dateFilter,     setDateFilter]     = useState('');          // ISO prefix filter ('YYYY-MM-DD')
  const [page,           setPage]           = useState(1);           // หน้าปัจจุบัน
  const [updatingId,     setUpdatingId]     = useState(null);        // ID ที่กำลัง update (loading)
  const [search,         setSearch]         = useState('');          // ค้นหา IP / ประเภท / โมเดล / ผู้รับผิดชอบ
  const [assignees,      setAssignees]      = useState({});          // { event_id: username }
  const [selected,       setSelected]       = useState(() => new Set()); // event id ที่ติ๊กเลือกไว้ (bulk action)
  const [notice,         setNotice]         = useState('');          // ข้อความแจ้งผลการดำเนินการ/ข้อผิดพลาด

  const PAGE_SIZE = 10; // ❗ เปลี่ยนตรงนี้เพื่อปรับจำนวนรายการต่อหน้า

  useEffect(() => {
    fetchAlerts();
    fetchStatuses();
    fetchAuditLogs();
    fetchAssignees();
  }, []);

  // event ใหม่จาก /ws/feed → รีเฟรชรายการและสถานะอัตโนมัติ (ไม่ต้องกดซิงค์)
  useLiveEvents(() => { fetchAlerts({ silent: true }); fetchStatuses(); fetchAssignees(); }, { enabled: liveEnabled });

  async function fetchAssignees() {
    try {
      const data = await (await fetch('/api/incidents/assignees')).json();
      if (data.ok) setAssignees(data.data);
    } catch { }
  }

  async function fetchAlerts({ silent = false } = {}) {
    if (!silent) setLoading(true);
    setLoadError(false);
    try {
      const res = await fetch('/api/logs?limit=200&alerts_only=true');
      const data = await res.json();
      if (!data.ok) throw new Error('logs');
      setIncidents(data.data);
    } catch { setLoadError(true); setIncidents([]); }
    finally { setLoading(false); }
  }

  async function fetchStatuses() {
    try {
      const res = await fetch('/api/incidents/statuses');
      const data = await res.json();
      if (data.ok) setStatusMap(data.data);
    } catch { }
  }

  async function fetchAuditLogs() {
    try {
      const res = await fetch('/api/audit-log?limit=50');
      const data = await res.json();
      if (data.ok) setAuditLogs(data.data);
    } catch { }
  }

  /**
   * updateIncidentStatus — อัปเดต triage status ของ event ผ่าน API PATCH /api/incidents/:id
   * Flow: OPEN → INVESTIGATING → MITIGATED (เมื่อ MITIGATED: block IP และเล่นเสียง success)
   * General User ไม่สามารถทำได้ (isGeneralView guard)
   * @param {number} eventId    - ID ของ event
   * @param {string} sourceIp   - Source IP สำหรับ block เมื่อ MITIGATED
   * @param {string} newStatus  - สถานะใหม่ ('INVESTIGATING' | 'MITIGATED')
   * @param {string} actionName - ชื่อการดำเนินการ สำหรับบันทึกใน audit log
   */
  async function updateIncidentStatus(eventId, sourceIp, newStatus, actionName) {
    if (isGeneralView) return; // guard: ห้าม General User
    playSound('click');
    setUpdatingId(eventId); // แสดง loading indicator บนปุ่มของ event นั้น
    try {
      const res = await fetch(`/api/incidents/${eventId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, source_ip: sourceIp, action_name: actionName }),
      });
      if (res.status === 401 || res.status === 403) { setNotice('ต้องเข้าสู่ระบบด้วยบัญชี admin จึงจะเปลี่ยนสถานะได้'); return; }
      const data = await res.json();
      if (!data.ok) { setNotice(data.error || 'เปลี่ยนสถานะไม่สำเร็จ'); return; }
      setNotice('');
      setStatusMap((prev) => ({ ...prev, [eventId]: newStatus })); // อัปเดต local state ทันที
      if (newStatus === 'MITIGATED') playSound('success');          // เปิดเสียงเมื่อ block สำเร็จ
      fetchAuditLogs();  // reload audit log เพื่อเห็นบันทึกใหม่
    } catch { }
    finally { setUpdatingId(null); } // ซ่อน loading indicator
  }

  /** bulkUpdate — เปลี่ยนสถานะ incident ที่ติ๊กเลือกไว้ทั้งหมด (ทีละรายการตามลำดับ) */
  async function bulkUpdate(newStatus, actionName) {
    if (isGeneralView || selected.size === 0) return;
    playSound('click');
    let done = 0;
    for (const id of selected) {
      const item = incidents.find(i => i.id === id);
      if (!item || getStatus(item) === newStatus) continue;
      try {
        const res = await fetch(`/api/incidents/${id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: newStatus, source_ip: item.source_ip, action_name: actionName }),
        });
        if (res.status === 401 || res.status === 403) { setNotice('ต้องเข้าสู่ระบบด้วยบัญชี admin จึงจะเปลี่ยนสถานะได้'); break; }
        if ((await res.json()).ok) { done++; setStatusMap(prev => ({ ...prev, [id]: newStatus })); }
      } catch { break; }
    }
    if (done > 0) { setNotice(`เปลี่ยนสถานะ ${done} รายการแล้ว`); playSound('success'); fetchAuditLogs(); }
    setSelected(new Set());
  }

  /** exportCSV — ส่งออกรายการที่กรองอยู่ทั้งหมด (ไม่ใช่แค่หน้าปัจจุบัน) */
  function exportCSV() {
    playSound('click');
    const headers = ['id', 'timestamp', 'severity', 'status', 'attack_class', 'model_name', 'confidence', 'source_ip', 'dst_ip', 'dst_port', 'protocol', 'assignee'];
    const lines = filtered.map(i => [i.id, i.timestamp, getSev(i), getStatus(i), i.attack_class, i.model_name, i.confidence, i.source_ip, i.dst_ip, i.dst_port, i.protocol, assignees[i.id]]
      .map(v => JSON.stringify(v ?? '')).join(','));
    const blob = new Blob(['\ufeff' + [headers.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'cybershield_incidents.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  /**
   * getStatus — ดึง triage status ของ event จาก statusMap (API)
   * fallback: item.status (field ใน data) → 'OPEN' (ค่า default)
   */
  function getStatus(item) {
    return statusMap[item.id] || item.status || 'OPEN';
  }

  /**
   * getSev — ดึง Severity key ของ event
   * - ถ้ามี sevKey ใน data ใช้อันนั้นเลย
   * - ถ้าไม่มี คำนวณจาก confidence (threshold เดียวกับ Dashboard)
   */
  function getSev(item) {
    return item.sevKey || (item.confidence >= 0.95 ? 'CRITICAL' : item.confidence >= 0.9 ? 'HIGH' : item.confidence >= 0.8 ? 'MEDIUM' : 'LOW');
  }

  const sevCounts = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0, INFO: 0 };
  incidents.forEach(item => { const k = getSev(item); if (sevCounts[k] !== undefined) sevCounts[k]++; });
  const total = incidents.length;
  // "แจ้งเตือนวิกฤตที่เปิดอยู่" ต้องกรองทั้ง status=OPEN และ severity=CRITICAL — ของเดิมนับแค่ status
  // ทำให้ตัวเลขไม่ตรงกับ "แจ้งเตือนวิกฤต" ของ Dashboard (ซึ่งนับ CRITICAL ล้วนไม่สนสถานะ)
  const openCriticalCount = incidents.filter(i => getStatus(i) === 'OPEN' && getSev(i) === 'CRITICAL').length;
  const invCount = incidents.filter(i => getStatus(i) === 'INVESTIGATING').length;
  const mitCount = incidents.filter(i => getStatus(i) === 'MITIGATED').length;

  const filterTabs = ['ทั้งหมด', 'เปิดอยู่', 'กำลังตรวจสอบ', 'แก้ไขแล้ว'];
  const filterKeys = ['ALL', 'OPEN', 'INVESTIGATING', 'MITIGATED'];

  const ATTACK_TYPES = [...new Set(incidents.map(i => i.attack_class))].sort();

  const filtered = incidents.filter(item => {
    const stMatch = filterStatus === 'ALL' || getStatus(item) === filterStatus;
    const sevMatch = severityFilter === 'ALL' || getSev(item) === severityFilter;
    const typeMatch = typeFilter === 'ALL' || item.attack_class === typeFilter;
    const dateMatch = !dateFilter || item.timestamp.startsWith(dateFilter);
    const q = search.trim().toLowerCase();
    const searchMatch = !q || [item.source_ip, item.dst_ip, item.attack_class, item.model_name, assignees[item.id], `evt-${item.id}`]
      .some(v => String(v ?? '').toLowerCase().includes(q));
    return stMatch && sevMatch && typeMatch && dateMatch && searchMatch;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* ── ส่วนหัวหน้า ── */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2>ศูนย์เหตุการณ์และการดำเนินการ</h2>
          <p className="text-muted" style={{ margin: 0, marginTop: 4, fontSize: 13.5 }}>จัดลำดับความสำคัญ ยืนยันการแจ้งเตือน ติดตามการเชื่อมต่อเครือข่าย และบันทึกการดำเนินการ</p>
        </div>
        {/* ซิงค์แจ้งเตือน: User เห็นแต่ disabled + tooltip; ต้องเปิดเชื่อมต่อสดด้วยเพราะพึ่งข้อมูลสด */}
        <button
          className="btn btn-outline"
          onClick={() => { if (!isGeneralView && liveEnabled) { playSound('click'); fetchAlerts(); } }}
          disabled={isGeneralView || !liveEnabled}
          title={isGeneralView ? 'คุณไม่มีสิทธิ์ดำเนินการนี้' : !liveEnabled ? 'ขาดการเชื่อมต่ออยู่ — เชื่อมต่อสดก่อนจึงจะซิงค์ได้' : undefined}
          style={{ opacity: (isGeneralView || !liveEnabled) ? 0.45 : 1, cursor: (isGeneralView || !liveEnabled) ? 'not-allowed' : 'pointer' }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
          <span style={{ marginLeft: 8 }}>ซิงค์ตัวแจ้งเตือน</span>
        </button>
      </div>

      {notice && (
        <div className="card" style={{ padding: '10px 18px', borderLeft: '3px solid var(--accent)', fontSize: 13.5, fontWeight: 600, display: 'flex', justifyContent: 'space-between' }}>
          <span>{notice}</span>
          <button onClick={() => setNotice('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}>×</button>
        </div>
      )}

      {loadError && (
        <div className="card" style={{ padding: '12px 18px', borderLeft: '3px solid #f87171', color: '#f87171', fontSize: 13.5, fontWeight: 600 }}>
          เชื่อมต่อ API ไม่ได้ — ไม่สามารถโหลดรายการเหตุการณ์ (ไม่แสดงข้อมูลตัวอย่าง)
        </div>
      )}

      {/* ── การ์ดสถิติ 3 ใบด้านบน ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        <div className="card elev-sm" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#f87171', lineHeight: 1.1 }}>{openCriticalCount}</div>
            <div style={{ fontWeight: 600, fontSize: 13.5, marginTop: 6 }}>แจ้งเตือนวิกฤตที่เปิดอยู่</div>
            <div className="text-muted" style={{ fontSize: 11.5, marginTop: 2 }}>ต้องดำเนินการทันที</div>
          </div>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(239,68,68,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f87171' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          </div>
        </div>
        <div className="card elev-sm" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#fbbf24', lineHeight: 1.1 }}>{invCount}</div>
            <div style={{ fontWeight: 600, fontSize: 13.5, marginTop: 6 }}>อยู่ระหว่างตรวจสอบ</div>
            <div className="text-muted" style={{ fontSize: 11.5, marginTop: 2 }}>รอการวิเคราะห์เพิ่มเติม</div>
          </div>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(234,179,8,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fbbf24' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          </div>
        </div>
        <div className="card elev-sm" style={{ padding: '20px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 36, fontWeight: 800, color: '#4ade80', lineHeight: 1.1 }}>{mitCount}</div>
            <div style={{ fontWeight: 600, fontSize: 13.5, marginTop: 6 }}>แก้ไข/กักกันแล้ว</div>
            <div className="text-muted" style={{ fontSize: 11.5, marginTop: 2 }}>ใน 24 ชั่วโมงที่ผ่านมา</div>
          </div>
          <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(34,197,94,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4ade80' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z"></path><polyline points="9 12 11 14 15 10"></polyline></svg>
          </div>
        </div>
      </div>

      {/* ── ส่วนกลาง: Donut Chart + Audit Log ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* การ์ด Donut Chart */}
        <div className="card elev-sm" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div className="card-title" style={{ fontSize: 14.5 }}>ภัยคุกคามตามระดับความรุนแรง</div>
            <div className="text-muted" style={{ fontSize: 11.5 }}>คัดกรองเหตุการณ์ที่ต้องดำเนินการ แยกตามระดับความรุนแรง</div>
          </div>

          {/* ปุ่มเลือก Filter สถานะ */}
          <div style={{ display: 'flex', gap: 8 }}>
            {filterTabs.map((tab, i) => (
              <button key={tab} onClick={() => { setFilterStatus(filterKeys[i]); setPage(1); }}
                style={{
                  padding: '6px 14px', borderRadius: 999, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                  background: filterStatus === filterKeys[i] ? 'var(--accent)' : 'var(--gray-chip-bg)',
                  color: filterStatus === filterKeys[i] ? '#fff' : 'var(--text-secondary)',
                }}>
                {tab}
              </button>
            ))}
          </div>

          {/* Donut Chart + คำอธิบายสี */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <DonutChart counts={sevCounts} total={total} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
              {Object.entries(SEV_CONFIG).map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 999, background: v.color, display: 'inline-block' }} />
                    {v.label}
                  </span>
                  <span style={{ fontWeight: 700 }}>{sevCounts[k]} <span className="text-muted" style={{ fontWeight: 400, fontSize: 12 }}>({((sevCounts[k]/(total || 1))*100).toFixed(0)}%)</span></span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* การ์ด Audit Log */}
        <div className="card elev-sm" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div className="card-title" style={{ fontSize: 14.5 }}>บันทึกการดำเนินการของผู้ปฏิบัติงาน</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {auditLogs.map((log, i) => (
              <div key={log.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '14px 0', borderBottom: i < auditLogs.length - 1 ? '1px solid var(--border-soft)' : 'none' }}>
                <div style={{ width: 32, height: 32, borderRadius: 10, background: log.bg || 'var(--row-head-bg)', color: log.color || 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <AuditIcon type={log.icon} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>{log.action}</div>
                  <div className="text-muted" style={{ fontSize: 11.5, marginTop: 3 }}>โดย {log.username}</div>
                </div>
                <div className="text-muted" style={{ fontSize: 11, flexShrink: 0, marginTop: 2 }}>{timeAgo(log.timestamp)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── ตารางรายการเหตุการณ์ ── */}
      <div className="card elev-sm" style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* ส่วนควบคุมด้านบนของตาราง */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="card-title" style={{ fontSize: 14.5, margin: 0 }}>รายการเหตุการณ์ล่าสุด</div>
            <span style={{ background: 'var(--gray-chip-bg)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 999 }}>{filtered.length} รายการ</span>
          </div>
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <ThaiDatePicker value={dateFilter} onChange={v => { setDateFilter(v); setPage(1); }} />
            <select style={{ fontSize: 12, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border-soft)', background: 'var(--row-head-bg)', color: 'var(--text-secondary)', cursor: 'pointer' }}
              value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1); }}>
              <option value="ALL">ทุกประเภท</option>
              {ATTACK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--row-head-bg)', padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border-soft)' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              <input value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} placeholder="ค้นหา IP, ประเภท, โมเดล, ผู้รับผิดชอบ..." style={{ border: 'none', background: 'transparent', color: 'var(--text)', outline: 'none', fontSize: 12, width: 170 }} />
            </div>
            <button onClick={exportCSV} disabled={filtered.length === 0} title="ส่งออกรายการที่กรองอยู่เป็น CSV" style={{ background: 'var(--row-head-bg)', border: '1px solid var(--border-soft)', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </button>
          </div>
        </div>

        {/* แถบ bulk action (admin เท่านั้น) */}
        {!isGeneralView && selected.size > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: 'var(--row-head-bg)', fontSize: 13 }}>
            <strong>เลือกแล้ว {selected.size} รายการ</strong>
            <button className="btn btn-secondary" onClick={() => bulkUpdate('INVESTIGATING', STATUS_FLOW.OPEN.action)}>เริ่มตรวจสอบ</button>
            <button className="btn btn-secondary" onClick={() => bulkUpdate('MITIGATED', STATUS_FLOW.INVESTIGATING.action)}>แก้ไข/กักกัน</button>
            <button className="btn btn-outline" onClick={() => setSelected(new Set())}>ยกเลิก</button>
          </div>
        )}

        {/* เนื้อหาตาราง */}
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-soft)' }}>
                {['__sel','เวลา','ระดับความรุนแรง','ประเภทเหตุการณ์','รายละเอียด','แหล่งที่มา','เป้าหมาย','สถานะ','ผู้รับผิดชอบ','การดำเนินการ'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11.5, fontWeight: 600, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                    {h === '__sel'
                      ? <input type="checkbox" disabled={isGeneralView} title="เลือกทั้งหน้า"
                          checked={paginated.length > 0 && paginated.every(i => selected.has(i.id))}
                          onChange={e => setSelected(prev => { const n = new Set(prev); paginated.forEach(i => e.target.checked ? n.add(i.id) : n.delete(i.id)); return n; })} />
                      : <>{h}{h === 'การดำเนินการ' ? ' ' : ''}{h === 'การดำเนินการ' && <InfoHelp id="incActions" />}</>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 && (
                <tr><td colSpan={10} className="text-muted" style={{ padding: '36px 16px', textAlign: 'center', fontSize: 13.5 }}>
                  {loadError ? 'เชื่อมต่อ API ไม่ได้' : loading ? 'กำลังโหลด...' : incidents.length === 0 ? 'ยังไม่มีเหตุการณ์ที่ตรวจพบ' : 'ไม่พบเหตุการณ์ที่ตรงกับตัวกรอง'}
                </td></tr>
              )}
              {paginated.map((item, i) => {
                const st = getStatus(item);
                const sevKey = getSev(item);
                const sev = SEV_CONFIG[sevKey] || SEV_CONFIG.LOW;
                const statusCfg = STATUS_CONFIG[st] || STATUS_CONFIG.OPEN;
                return (
                  <tr key={item.id}
                    style={{ borderBottom: '1px solid var(--border-soft)', cursor: 'pointer', transition: 'background .15s' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--row-head-bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => { playSound('click'); setSelectedEvent(item); }}>
                    <td style={{ padding: '14px 14px', verticalAlign: 'middle' }} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" disabled={isGeneralView} checked={selected.has(item.id)}
                        onChange={e => setSelected(prev => { const n = new Set(prev); e.target.checked ? n.add(item.id) : n.delete(item.id); return n; })} />
                    </td>
                    <td style={{ padding: '14px 14px', verticalAlign: 'top' }}>
                      <div style={{ fontSize: 12.5, fontWeight: 600, whiteSpace: 'nowrap' }}>{formatTH(item.timestamp).split(' ').slice(0,2).join(' ')}</div>
                      <div style={{ fontSize: 11.5, fontWeight: 600, marginTop: 1, color: 'var(--text)' }}>{formatTH(item.timestamp).split(' ')[2]}</div>
                      <div className="text-muted" style={{ fontSize: 11, marginTop: 2 }}>{timeAgo(item.timestamp)}</div>
                    </td>
                    <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                      <span style={{ background: sev.bg, color: sev.color, fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 999 }}>{sev.label}</span>
                    </td>
                    <td style={{ padding: '14px 14px', verticalAlign: 'middle', fontWeight: 600, fontSize: 13 }}>{item.attack_class}</td>
                    <td style={{ padding: '14px 14px', verticalAlign: 'top', maxWidth: 200 }}>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>Confidence {(item.confidence * 100).toFixed(1)}%</div>
                      <div className="text-muted" style={{ fontSize: 11, marginTop: 2, fontStyle: 'italic' }}>ตรวจพบโดย {item.model_name}{item.protocol ? ` · ${item.protocol}` : ''}</div>
                    </td>
                    <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className="mono" style={{ fontSize: 12.5 }}>{item.source_ip}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                      <span className="mono" style={{ fontSize: 12.5 }}>{item.dst_ip ? `${item.dst_ip}${item.dst_port != null ? ':' + item.dst_port : ''}` : '—'}</span>
                    </td>
                    <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, background: statusCfg.dotBg, padding: '5px 10px', borderRadius: 999, width: 'fit-content' }}>
                        {statusCfg.check
                          ? <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={statusCfg.dot} strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                          : <span style={{ width: 8, height: 8, borderRadius: 999, background: statusCfg.dot, display: 'inline-block' }} />
                        }
                        <span style={{ color: statusCfg.dot }}>{statusCfg.label}</span>
                      </span>
                    </td>
                    <td style={{ padding: '14px 14px', verticalAlign: 'middle', fontSize: 12.5 }}>{assignees[item.id] || <span className="text-muted">—</span>}</td>
                    <td style={{ padding: '14px 14px', verticalAlign: 'middle' }} onClick={e => e.stopPropagation()}>
                      {/* ผู้ใช้ทั่วไปเห็นปุ่มแต่ถูกปิดการใช้งาน (disabled); Admin ทำงานได้ปกติ */}
                      <div style={{ display: 'flex', gap: 8 }}>
                        {STATUS_FLOW[st] && (
                          <button
                            style={{
                              fontSize: 12, padding: '6px 14px', borderRadius: 8,
                              border: '1px solid var(--border-soft)',
                              background: st === 'OPEN' ? 'rgba(234,179,8,.12)' : 'rgba(34,197,94,.12)',
                              color: isGeneralView ? 'var(--text-tertiary)' : (st === 'OPEN' ? '#fbbf24' : '#4ade80'),
                              cursor: (isGeneralView || updatingId === item.id) ? 'not-allowed' : 'pointer',
                              opacity: (isGeneralView || updatingId === item.id) ? 0.5 : 1,
                              fontWeight: 600, whiteSpace: 'nowrap',
                            }}
                            disabled={isGeneralView || updatingId === item.id}
                            title={isGeneralView ? 'คุณไม่มีสิทธิ์ดำเนินการนี้' : undefined}
                            onClick={() => updateIncidentStatus(item.id, item.source_ip, STATUS_FLOW[st].next, STATUS_FLOW[st].action)}
                          >
                            {updatingId === item.id ? '...' : STATUS_FLOW[st].label}
                          </button>
                        )}
                        <button
                          style={{
                            fontSize: 12, padding: '6px 14px', borderRadius: 8,
                            border: '1px solid var(--border-soft)',
                            background: 'var(--row-head-bg)',
                            color: isGeneralView ? 'var(--text-tertiary)' : 'var(--text)',
                            cursor: isGeneralView ? 'not-allowed' : 'pointer',
                            opacity: isGeneralView ? 0.5 : 1,
                            display: 'flex', alignItems: 'center', gap: 6,
                          }}
                          disabled={isGeneralView}
                          title={isGeneralView ? 'คุณไม่มีสิทธิ์ดำเนินการนี้' : undefined}
                          onClick={isGeneralView ? undefined : () => { playSound('click'); setSelectedEvent(item); }}
                        >
                          รายละเอียด
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* การเลื่อนหน้า (Pagination) */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 6, marginTop: 8 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border-soft)', background: 'transparent', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? .4 : 1, color: 'var(--text)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          {Array.from({ length: Math.min(totalPages, 10) }, (_, i) => i + 1).map(n => (
            <button key={n} onClick={() => setPage(n)}
              style={{ padding: '6px 11px', borderRadius: 8, border: '1px solid var(--border-soft)', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                background: page === n ? 'var(--accent)' : 'transparent', color: page === n ? '#fff' : 'var(--text)' }}>
              {n}
            </button>
          ))}
          {totalPages > 10 && <span style={{ color: 'var(--text-tertiary)' }}>...</span>}
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border-soft)', background: 'transparent', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? .4 : 1, color: 'var(--text)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"></polyline></svg>
          </button>
        </div>
      </div>

      {selectedEvent && <ThreatInspectModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </div>
  );
}
