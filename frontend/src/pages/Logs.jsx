// ─────────────────────────────────────────────────────────────────────────────
// pages/Logs.jsx — หน้าดูเอกสารเหตุการณ์ทั้งหมด (Security Event Logs)
//
// ประกอบด้วย:
//   - ตาราง log พร้อม filter (attack type, severity, status, model, date range) + search
//   - คลิกแถวเปิด ThreatInspectModal เพื่อดูรายละเอียด
//   - Pagination แบบ 10 รายการต่อหน้า
//   - Export CSV: ส่งออก log เป็นไฟล์ CSV สำหรับการวิเคราะห์ต่อ
//   - ดึงข้อมูลจาก API (/api/logs) + /api/incidents/statuses (ไม่มี mock — ถ้าว่างแสดง empty state)
//   - เพิ่มเข้า Incidents เมื่อกด "Triage Event" บน alert row
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import ThreatInspectModal from '../components/ThreatInspectModal'
import InfoHelp from '../components/InfoHelp'
import { playSound } from '../utils/sound'
import { useLiveEvents } from '../hooks/useLiveEvents'
import { useApp } from '../context/AppContext'

// ── สี badge ของระดับความรุนแรง (Severity) ──────────────────────────────────
// ⚡ แก้สีที่นี่ → badge ในตาราง Log เปลี่ยนทันที
// bg = สีพื้นหลัง badge (rgba), color = สีตัวอักษร
const SEV_CONFIG = {
  CRITICAL: { label: 'วิกฤต',    bg: 'rgba(239,68,68,.15)',  color: '#f87171' }, // แดง
  HIGH:     { label: 'สูง',      bg: 'rgba(249,115,22,.15)', color: '#fb923c' }, // ส้ม
  MEDIUM:   { label: 'ปานกลาง', bg: 'rgba(234,179,8,.15)',  color: '#fbbf24' }, // เหลือง
  LOW:      { label: 'ต่ำ',      bg: 'rgba(34,197,94,.12)',  color: '#4ade80' }, // เขียว
}

// ── สี badge ของสถานะ (Status) ───────────────────────────────────────────────
// ⚡ แก้ label ภาษาไทยที่นี่ → เห็นผลทันทีในตาราง
const STATUS_CONFIG = {
  BLOCKED:       { label: 'บล็อกแล้ว',    bg: 'rgba(239,68,68,.08)',  color: '#f87171' }, // แดง
  INVESTIGATING: { label: 'กำลังตรวจสอบ', bg: 'rgba(251,191,36,.1)',  color: '#fbbf24' }, // เหลือง
  MITIGATED:     { label: 'แก้ไขแล้ว',    bg: 'rgba(74,222,128,.1)',  color: '#4ade80' }, // เขียว
  OPEN:          { label: 'เปิดอยู่',      bg: 'rgba(239,68,68,.1)',   color: '#f87171' }, // แดง
}

// ── สี badge ของประเภทการโจมตี (Attack Type) ─────────────────────────────────
// ⚡ เพิ่ม attack type ใหม่ที่นี่ → badge จะมีสีแทนสี default
const ATTACK_PILL = {
  'SQL Injection':       { bg: 'rgba(239,68,68,.15)',   color: '#f87171' }, // แดง
  'Brute Force':         { bg: 'rgba(249,115,22,.15)',  color: '#fb923c' }, // ส้ม
  'DDoS':                { bg: 'rgba(239,68,68,.15)',   color: '#f87171' }, // แดง
  'Port Scan':           { bg: 'rgba(234,179,8,.15)',   color: '#fbbf24' }, // เหลือง
  'Suspicious Activity': { bg: 'rgba(148,163,184,.12)', color: '#94a3b8' }, // เทา
  'R2L':                 { bg: 'rgba(234,179,8,.15)',   color: '#fbbf24' }, // เหลือง
  'U2R':                 { bg: 'rgba(249,115,22,.15)',  color: '#fb923c' }, // ส้ม
  'DoS':                 { bg: 'rgba(239,68,68,.15)',   color: '#f87171' }, // แดง
  'SQLi':                { bg: 'rgba(239,68,68,.15)',   color: '#f87171' }, // ชื่อ class จริงจากโมเดล
  'BruteForce':          { bg: 'rgba(249,115,22,.15)',  color: '#fb923c' }, // ชื่อ class จริงจากโมเดล
}

// ── Thai Date Picker (Date Range) ───────────────────────────────────────
const TH_MONTHS_L = ['มกราคม','กุมภาพันธ์','มีนาคม','เมษายน','พฤษภาคม','มิถุนายน','กรกฎาคม','สิงหาคม','กันยายน','ตุลาคม','พฤศจิกายน','ธันวาคม'];
const TH_MONTHS_S = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
const TH_DOW = ['จันทร์','อังคาร','พุธ','พฤหัส','ศุกร์','เสาร์','อาทิตย์'];

/**
 * ThaiDP — Thai Date Picker (compact version สำหรับ Logs.jsx)
 * คล้ายกับ ThaiDatePicker ใน Incidents.jsx แต่ compact กว่า เพราะใช้ใน filter date range
 * @param {string} value     - ISO string 'YYYY-MM-DD' (วันที่เลือก)
 * @param {function} onChange - callback ส่ง ISO string กลับ
 * @param {string} placeholder - ข้อความในปุ่มเมื่อยังไม่มีค่า
 * @param {string} [minDate]   - ISO string เพื่อจำกัดวันที่เริ่มต้น (disabled วันที่ก่อนนั้น)
 */
function ThaiDP({ value, onChange, placeholder = 'วันที่…', minDate }) {
  const [open, setOpen] = React.useState(false);
  const [pv, setPv] = React.useState('day'); // 'day'|'month'|'year'
  const [view, setView] = React.useState(() => value ? new Date(value + 'T00:00:00') : new Date());
  const [input, setInput] = React.useState(() => {
    if (!value) return '';
    const d = new Date(value + 'T00:00:00');
    return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()+543}`;
  });
  const ref = React.useRef(null);
  React.useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  React.useEffect(() => {
    if (!value) { setInput(''); return; }
    const d = new Date(value + 'T00:00:00');
    setInput(`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()+543}`);
  }, [value]);

  const yr = view.getFullYear(), mo = view.getMonth(), byr = yr + 543;
  const startOff = (new Date(yr, mo, 1).getDay() + 6) % 7;
  const dim = new Date(yr, mo + 1, 0).getDate();
  const sel = value ? new Date(value + 'T00:00:00') : null;
  const isSel = (d) => sel && d === sel.getDate() && mo === sel.getMonth() && yr === sel.getFullYear();
  const isMin = (d) => { if (!minDate) return false; return new Date(yr, mo, d) < new Date(minDate + 'T00:00:00'); };
  const isToday2 = (d) => { const t = new Date(); return d===t.getDate()&&mo===t.getMonth()&&yr===t.getFullYear(); };
  const yrStart = Math.floor((yr-543)/12)*12;
  const yrs = Array.from({length:12},(_,i)=>yrStart+i+543);

  function commit(day) {
    const d = new Date(yr, mo, day);
    if (minDate && d < new Date(minDate + 'T00:00:00')) return;
    onChange(d.toISOString().slice(0,10));
    setInput(`${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()+543}`);
    setOpen(false); setPv('day');
  }
  function parseIn(raw) {
    const p = raw.replace(/-/g,'/').trim().split('/');
    if (p.length!==3) return null;
    const [dd,mm,yy] = p.map(Number);
    if ([dd,mm,yy].some(isNaN)) return null;
    const cy = yy>2500?yy-543:yy;
    if (mm<1||mm>12||dd<1||dd>31||cy<1900||cy>2200) return null;
    const d = new Date(cy,mm-1,dd);
    return d.getMonth()===mm-1?d:null;
  }
  function onInputChange(e) {
    let r = e.target.value.replace(/[^0-9/]/g,'');
    if (r.length===2&&!r.includes('/')) r+='/';
    if (r.length===5&&r.split('/').length===2) r+='/';
    if (r.length>10) r=r.slice(0,10);
    setInput(r);
    const d = parseIn(r);
    if (d) { onChange(d.toISOString().slice(0,10)); setView(d); }
  }
  function onKD(e) {
    if (e.key==='Enter') { const d=parseIn(input); if(d){onChange(d.toISOString().slice(0,10));setView(d);setOpen(false);} }
    if (e.key==='Escape') setOpen(false);
  }
  const nb = { background:'none',border:'none',cursor:'pointer',color:'var(--text-secondary)',padding:'3px 7px',borderRadius:6,fontSize:17,lineHeight:1 };
  const hb = (cur) => ({ background:'none',border:'none',cursor:'pointer',fontWeight:700,fontSize:13,color:'var(--text)',padding:'2px 8px',borderRadius:6,transition:'background .12s' });

  return (
    <div ref={ref} style={{position:'relative',flex:1}}>
      <button onClick={()=>{
        // sync view → selected date on open so highlight is always visible
        if (value) setView(new Date(value + 'T00:00:00'));
        setOpen(o=>!o); setPv('day');
      }}
        style={{display:'flex',alignItems:'center',gap:8,padding:'9px 12px',borderRadius:8,width:'100%',
          border:`1.5px solid ${open?'var(--accent)':'var(--border-soft)'}`,
          background:'var(--row-head-bg)',color:value?'var(--text)':'var(--text-secondary)',
          cursor:'pointer',fontSize:13,fontWeight:value?600:400,transition:'border-color .15s',textAlign:'left'}}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
        </svg>
        <span style={{flex:1}}>{value ? input : placeholder}</span>
        {value && <span onClick={e=>{e.stopPropagation();onChange('');setInput('');}} style={{opacity:.5,fontSize:14}}>✕</span>}
      </button>
      {open && (
        <div style={{position:'absolute',top:'calc(100% + 6px)',left:0,zIndex:300,
          background:'var(--card-bg)',border:'1px solid var(--border-soft)',
          borderRadius:14,boxShadow:'0 8px 32px rgba(0,0,0,.2)',padding:14,minWidth:276}}>
          {/* text input */}
          <div style={{marginBottom:10,display:'flex',alignItems:'center',gap:8,
            background:'var(--row-head-bg)',border:'1px solid var(--border-soft)',
            borderRadius:7,padding:'6px 10px'}}>
            <input value={input} onChange={onInputChange} onKeyDown={onKD}
              placeholder="วว/ดด/ปปปป (พ.ศ.)"
              style={{border:'none',background:'transparent',outline:'none',fontSize:12.5,color:'var(--text)',flex:1,fontFamily:'inherit'}} />
          </div>
          {pv==='day'&&(<>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
              <button style={nb} onClick={()=>setView(new Date(yr,mo-1,1))}>&#8249;</button>
              <div style={{display:'flex',gap:4}}>
                <button style={hb()} onMouseEnter={e=>e.currentTarget.style.background='var(--row-head-bg)'} onMouseLeave={e=>e.currentTarget.style.background='none'} onClick={()=>setPv('month')}>{TH_MONTHS_L[mo]}</button>
                <button style={{...hb(),color:'var(--text-secondary)',fontWeight:500}} onMouseEnter={e=>e.currentTarget.style.background='var(--row-head-bg)'} onMouseLeave={e=>e.currentTarget.style.background='none'} onClick={()=>setPv('year')}>{byr}</button>
              </div>
              <button style={nb} onClick={()=>setView(new Date(yr,mo+1,1))}>&#8250;</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2,marginBottom:3}}>
              {TH_DOW.map(d=><div key={d} style={{textAlign:'center',fontSize:9.5,fontWeight:600,color:'var(--text-tertiary)',padding:'1px 0'}}>{d}</div>)}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',gap:2}}>
              {Array(startOff).fill(null).map((_,i)=><div key={'e'+i}/>)}
              {Array(dim).fill(null).map((_,i)=>{
                // s = isSelected: วันที่ user เลือกจริงๆ จาก prop value เท่านั้น
                // t = isToday: วันนี้ของระบบ — เป็นคนละ state กับ s อย่างเด็ดขาด
                const day=i+1, s=isSel(day), t=isToday2(day), dis=isMin(day);
                return <button key={day} onClick={()=>commit(day)} disabled={dis}
                  style={{
                    position:'relative',
                    width:'100%', aspectRatio:'1', borderRadius:7, cursor:dis?'not-allowed':'pointer',
                    fontSize:12, fontWeight:s?700:400, opacity:dis?.3:1,
                    transition:'background .12s, border-color .12s',
                    // selected: สีฟ้าจาง — ไม่มีส่วนเกี่ยวกับ isToday เลย
                    border: s ? '1px solid rgba(37,99,235,0.20)' : '1px solid transparent',
                    background: s ? 'rgba(37,99,235,0.12)' : 'transparent',
                    color: s ? '#2563EB' : 'var(--text)',
                  }}
                  onMouseEnter={e=>{if(!s&&!dis)e.currentTarget.style.background='var(--row-head-bg)';}}
                  onMouseLeave={e=>{if(!s&&!dis)e.currentTarget.style.background='transparent';}}
                >
                  {day}
                  {/* วันนี้: แสดงเพียง dot เล็ก ๆ ข้างล่าง — ไม่ใช้ background เด็ดขาด */}
                  {t && !s && (
                    <span style={{
                      position:'absolute', bottom:2, left:'50%', transform:'translateX(-50%)',
                      width:3, height:3, borderRadius:'50%',
                      background:'var(--text-tertiary)', display:'block',
                    }}/>
                  )}
                </button>;
              })}
            </div>
          </>)}
          {pv==='month'&&(<>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
              <button style={nb} onClick={()=>setView(new Date(yr-1,mo,1))}>&#8249;</button>
              <button style={hb()} onMouseEnter={e=>e.currentTarget.style.background='var(--row-head-bg)'} onMouseLeave={e=>e.currentTarget.style.background='none'} onClick={()=>setPv('year')}>{byr}</button>
              <button style={nb} onClick={()=>setView(new Date(yr+1,mo,1))}>&#8250;</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:5}}>
              {TH_MONTHS_S.map((m,i)=>{
                // isSelM: เดือนที่ user เลือกจริงๆ จาก prop value เท่านั้น
                // ต้องเช็คทั้ง month index และ year กับ view ปัจจุบัน
                const isSelM = sel && sel.getMonth()===i && sel.getFullYear()===yr;
                // ห้ามใช้ mo (viewMonth) เป็น selected state
                return <button key={i}
                  onClick={()=>{setView(new Date(yr,i,1));setPv('day');}}
                  style={{
                    padding:'9px 4px',borderRadius:7,cursor:'pointer',
                    fontSize:12.5,fontWeight:isSelM?700:500,
                    transition:'background .12s,border-color .12s,color .12s',
                    border: isSelM ? '1px solid rgba(37,99,235,0.20)' : '1px solid transparent',
                    background: isSelM ? 'rgba(37,99,235,0.12)' : 'transparent',
                    color: isSelM ? '#2563EB' : 'var(--text)',
                  }}
                  onMouseEnter={e=>{
                    if(!isSelM){e.currentTarget.style.background='var(--row-head-bg)';e.currentTarget.style.borderColor='var(--border-soft)';}
                  }}
                  onMouseLeave={e=>{
                    if(!isSelM){e.currentTarget.style.background='transparent';e.currentTarget.style.borderColor='transparent';}
                  }}>{m}</button>;
              })}
            </div>
          </>)}
          {pv==='year'&&(<>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
              <button style={nb} onClick={()=>setView(new Date(yr-12,mo,1))}>&#8249;</button>
              <span style={{fontWeight:700,fontSize:13,color:'var(--text)'}}>{yrs[0]}–{yrs[yrs.length-1]}</span>
              <button style={nb} onClick={()=>setView(new Date(yr+12,mo,1))}>&#8250;</button>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:5}}>
              {yrs.map(by=>{
                // isViewY: ปีที่ view กำลัง navigate อยู่ (subtle outline เพื่อ UX)
                const isViewY = (by-543)===yr;
                // isSelY: ปีของวันที่ที่ user เลือกจริงๆ จาก prop value
                const isSelY = sel && (by-543)===sel.getFullYear();
                return <button key={by} onClick={()=>{setView(new Date(by-543,mo,1));setPv('month');}}
                  style={{
                    padding:'9px 4px',borderRadius:7,cursor:'pointer',
                    fontSize:12.5,transition:'background .12s',
                    border: isSelY
                      ? '1px solid rgba(37,99,235,0.20)'
                      : isViewY ? '1px solid var(--border-soft)' : '1px solid transparent',
                    background: isSelY ? 'rgba(37,99,235,0.12)' : 'transparent',
                    color: isSelY ? '#2563EB' : 'var(--text)',
                    fontWeight: isSelY ? 700 : isViewY ? 600 : 500,
                  }}
                  onMouseEnter={e=>{if(!isSelY)e.currentTarget.style.background='var(--row-head-bg)';}}
                  onMouseLeave={e=>{if(!isSelY)e.currentTarget.style.background='transparent';}}>{by}</button>;
              })}
            </div>
          </>)}
        </div>
      )}
    </div>
  );
}

/**
 * formatTH — แปลง timestamp เป็นข้อความภาษาไทย (th-TH)
 * แสดงวัน/เดือน/ปี เวลาแบบ 24 ชม. (ไม่ใช้ AM/PM)
 * @param {string} ts - ISO timestamp string
 * @returns {string} ข้อความวันที่ภาษาไทย เช่น "19 พ.ค. 2568 14:32:11"
 */
function formatTH(ts) {
  try { return new Date(ts).toLocaleString('th-TH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) }
  catch { return ts }
}

// ฟิลด์ที่ Exclude ได้ (ชื่อต้องตรง exclude_<field> ของ GET /api/logs)
const EXCLUDE_FIELDS = ['attack_class', 'source_ip']
const EXCLUDE_LABEL = { attack_class: 'ไม่รวมประเภท', source_ip: 'ไม่รวมแหล่งที่มา' }

/**
 * CellFilter — ปุ่ม "กรองเข้า (+)" / "กรองออก (−)" ข้างค่าในตาราง (โผล่เมื่อ hover แถวหรือโฟกัสด้วยคีย์บอร์ด)
 * หยุด click ไม่ให้ทะลุไปเปิด modal ของแถว
 */
function CellFilter({ field, value, onInclude, onExclude }) {
  const stop = (fn) => (e) => { e.stopPropagation(); fn(field, value) }
  return (
    <span className="cell-filter">
      <button type="button" onClick={stop(onInclude)} aria-label={`กรองเฉพาะ ${value}`} title="กรองเฉพาะค่านี้">+</button>
      <button type="button" onClick={stop(onExclude)} aria-label={`ไม่รวม ${value}`} title="ไม่รวมค่านี้">−</button>
    </span>
  )
}

/**
 * Logs — หน้าดู Security Event Logs ทั้งหมด (Search, Filter, Paginate, Export)
 */
export default function Logs() {
  const { t } = useApp()
  const navigate = useNavigate()
  // filter ทั้งหมดผูกกับ URL: ?model=&attack_class=&severity=&status=&source_ip=&q=&from=&to=&exclude_attack_class=&exclude_source_ip=
  // (drill-down จาก Dashboard ใช้ชุดเดียวกัน, ก๊อป URL ส่งให้คนอื่นแล้วเห็นมุมมองเดียวกัน)
  const [params, setParams] = useSearchParams()

  // logs: ดึงจาก /api/logs จริง (ไม่มี mock) — เติม ref / sevKey / statusKey ให้ตารางใช้
  const [logs, setLogs] = useState([])   // เฉพาะหน้าปัจจุบัน (server-side paging)
  const [total, setTotal] = useState(0)     // จำนวนทั้งหมดที่ตรง filter
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // ── Pagination ──
  const [page, setPage] = useState(1) // หน้าปัจจุบัน (เริ่มที่ 1)

  // ── Modal ──
  const [selectedEvent, setSelectedEvent] = useState(null) // event ที่คลิกเปิด ThreatInspectModal

  // ── Filter State — ตัวกรองทั้งหมดใช้ตรวจ logic ใน filtered array ───────────────
  const [searchQuery,    setSearchQuery]    = useState(params.get('q') || '')  // ค้นหา: source_ip, attack_class, model, ref
  const [modelFilter,    setModelFilter]    = useState(params.get('model') || '')  // โมเดล (Intrusion/Flow/Injection LSTM)
  const [attackFilter,   setAttackFilter]   = useState(params.get('attack_class') || '')  // ประเภทการโจมตี
  const [severityFilter, setSeverityFilter] = useState(params.get('severity') || '')  // ระดับความรุนแรง (CRITICAL/HIGH/MEDIUM/LOW)
  const [statusFilter,   setStatusFilter]   = useState(params.get('status') || '')  // สถานะ (BLOCKED/INVESTIGATING/MITIGATED)
  const [sourceIpFilter, setSourceIpFilter] = useState(params.get('source_ip') || '')  // กรอง Source IP
  const [dateFrom,       setDateFrom]       = useState(params.get('from') || '')  // วันที่เริ่มต้น (YYYY-MM-DD)
  const [dateTo,         setDateTo]         = useState(params.get('to') || '')  // วันที่สิ้นสุด (YYYY-MM-DD)
  // ค่าที่ "กรองออก" (Exclude) แยกตามฟิลด์ — กดปุ่ม − ข้างค่าในตาราง
  const [excludes, setExcludes] = useState(() => Object.fromEntries(
    EXCLUDE_FIELDS.map(f => [f, (params.get(`exclude_${f}`) || '').split(',').filter(Boolean)])
  ))

  const [pageSize, setPageSize] = useState(10) // รายการต่อหน้า (เลือกได้ที่ท้ายตาราง)
  const [live, setLive] = useState(true)        // รีเฟรชอัตโนมัติเมื่อมี event ใหม่ (เฉพาะหน้า 1)
  const [classOptions, setClassOptions] = useState([]) // ประเภทการโจมตีทั้งหมดที่เคยพบ (จาก /api/stats)

  // search ดีเลย์ 300ms เพื่อไม่ยิง API ทุกตัวอักษร
  const [debouncedQ, setDebouncedQ] = useState(searchQuery.trim())
  useEffect(() => {
    const id = setTimeout(() => { setDebouncedQ(searchQuery.trim()); setPage(1) }, 300)
    return () => clearTimeout(id)
  }, [searchQuery])

  // filter ทั้งหมด → query string ของ /api/logs (กรองฝั่ง server)
  function buildParams() {
    const p = new URLSearchParams()
    if (modelFilter)    p.set('model_name', modelFilter === 'injection' ? 'sqli' : modelFilter) // option "injection" = model_name "sqli" ใน DB
    if (attackFilter)   p.set('attack_class', attackFilter)
    if (severityFilter) p.set('severity', severityFilter)
    if (statusFilter)   p.set('status', statusFilter)
    if (sourceIpFilter) p.set('source_ip', sourceIpFilter)
    if (debouncedQ)     p.set('q', debouncedQ)
    if (dateFrom)       p.set('since', dateFrom.slice(0, 10))
    if (dateTo)         p.set('until', dateTo.slice(0, 10) + 'T23:59:59')
    for (const f of EXCLUDE_FIELDS) if (excludes[f].length) p.set(`exclude_${f}`, excludes[f].join(','))
    return p
  }

  // ── Filter / Exclude จากค่าในตาราง (แบบ Cloudflare) ──
  // ค่าเดียวกันอยู่ได้ฝั่งเดียว: Filter ค่าที่เคย Exclude = เอาออกจาก Exclude (และกลับกัน)
  function filterFor(field, value) {
    playSound('click')
    setExcludes(ex => ({ ...ex, [field]: ex[field].filter(v => v !== value) }))
    if (field === 'attack_class') setAttackFilter(value)
    if (field === 'source_ip') setSourceIpFilter(value)
    setPage(1)
  }
  function filterOut(field, value) {
    playSound('click')
    if (field === 'attack_class' && attackFilter === value) setAttackFilter('')
    if (field === 'source_ip' && sourceIpFilter === value) setSourceIpFilter('')
    setExcludes(ex => ex[field].includes(value) ? ex : { ...ex, [field]: [...ex[field], value] })
    setPage(1)
  }
  function removeExclude(field, value) {
    setExcludes(ex => ({ ...ex, [field]: ex[field].filter(v => v !== value) })); setPage(1)
  }

  // filter ที่ใช้อยู่ → ชิปเหนือผลลัพธ์ (กด × ลบทีละอัน)
  const chips = [
    modelFilter    && { id: 'model',    label: 'โมเดล',        value: modelFilter,    clear: () => setModelFilter('') },
    attackFilter   && { id: 'attack',   label: 'ประเภท',       value: attackFilter,   clear: () => setAttackFilter('') },
    sourceIpFilter && { id: 'ip',       label: 'แหล่งที่มา',    value: sourceIpFilter, clear: () => setSourceIpFilter('') },
    severityFilter && { id: 'sev',      label: 'ความรุนแรง',    value: SEV_CONFIG[severityFilter]?.label || severityFilter, clear: () => setSeverityFilter('') },
    statusFilter   && { id: 'status',   label: 'สถานะ',        value: STATUS_CONFIG[statusFilter]?.label || statusFilter, clear: () => setStatusFilter('') },
    debouncedQ     && { id: 'q',        label: 'ค้นหา',        value: debouncedQ,     clear: () => setSearchQuery('') },
    (dateFrom || dateTo) && { id: 'date', label: 'ช่วงเวลา',   value: `${dateFrom || '…'} – ${dateTo || '…'}`, clear: () => { setDateFrom(''); setDateTo('') } },
    ...EXCLUDE_FIELDS.flatMap(f => excludes[f].map(v => ({
      id: `x-${f}-${v}`, exclude: true, label: EXCLUDE_LABEL[f], value: v, clear: () => removeExclude(f, v),
    }))),
  ].filter(Boolean)

  // เขียน filter ลง URL (replace ไม่เพิ่ม history ทุกครั้งที่พิมพ์) เพื่อแชร์/รีเฟรชแล้วได้มุมมองเดิม
  useEffect(() => {
    const p = new URLSearchParams()
    if (modelFilter)    p.set('model', modelFilter)
    if (attackFilter)   p.set('attack_class', attackFilter)
    if (severityFilter) p.set('severity', severityFilter)
    if (statusFilter)   p.set('status', statusFilter)
    if (sourceIpFilter) p.set('source_ip', sourceIpFilter)
    if (debouncedQ)     p.set('q', debouncedQ)
    if (dateFrom)       p.set('from', dateFrom)
    if (dateTo)         p.set('to', dateTo)
    for (const f of EXCLUDE_FIELDS) if (excludes[f].length) p.set(`exclude_${f}`, excludes[f].join(','))
    setParams(p, { replace: true })
  }, [modelFilter, attackFilter, severityFilter, statusFilter, sourceIpFilter, debouncedQ, dateFrom, dateTo, excludes])

  function decorate(rows, statusMap) {
    return rows.map(e => ({
      ...e,
      ref: `EVT-${e.id}`,
      sevKey: e.confidence >= 0.95 ? 'CRITICAL' : e.confidence >= 0.9 ? 'HIGH' : e.confidence >= 0.8 ? 'MEDIUM' : 'LOW',
      statusKey: statusMap[e.id] || 'OPEN',
    }))
  }

  async function loadLogs({ silent = false } = {}) {
    if (!silent) setLoading(true)
    setError(false)
    try {
      const p = buildParams()
      p.set('limit', pageSize); p.set('offset', (page - 1) * pageSize)
      const [logRes, stRes] = await Promise.all([fetch(`/api/logs?${p}`), fetch('/api/incidents/statuses')])
      const logData = await logRes.json()
      if (!logData.ok) throw new Error('logs')
      let statusMap = {}
      try { const st = await stRes.json(); if (st.ok) statusMap = st.data } catch { /* ไม่มี status = OPEN */ }
      setLogs(decorate(logData.data, statusMap)); setTotal(logData.total)
    } catch {
      setError(true); setLogs([]); setTotal(0)
    } finally { setLoading(false) }
  }

  // ดึงทุกแถวที่ตรง filter (วนทีละ 500) สำหรับ Export — ไม่ใช่แค่หน้าปัจจุบัน
  async function fetchAllFiltered() {
    const out = []
    const stRes = await fetch('/api/incidents/statuses').then(r => r.json()).catch(() => null)
    const statusMap = stRes?.ok ? stRes.data : {}
    for (let offset = 0; offset < 20000; offset += 500) {
      const p = buildParams(); p.set('limit', 500); p.set('offset', offset)
      const d = await fetch(`/api/logs?${p}`).then(r => r.json())
      if (!d.ok) break
      out.push(...decorate(d.data, statusMap))
      if (out.length >= d.total || d.data.length < 500) break
    }
    return out
  }

  useEffect(() => {
    loadLogs()
  }, [page, pageSize, modelFilter, attackFilter, severityFilter, statusFilter, sourceIpFilter, debouncedQ, dateFrom, dateTo, excludes])

  // ตัวเลือกประเภทการโจมตี = ทุก class ที่เคยพบ (ไม่ใช่แค่ที่อยู่ในหน้าปัจจุบัน)
  useEffect(() => {
    fetch('/api/stats').then(r => r.json()).then(d => { if (d.ok) setClassOptions(d.data.by_class.map(c => c.key)) }).catch(() => {})
  }, [])

  // event ใหม่จาก /ws/feed → รีเฟรชเงียบๆ (เฉพาะเปิด live และอยู่หน้า 1)
  useLiveEvents(() => loadLogs({ silent: true }), { enabled: live && page === 1 })

  /**
   * handleExportCSV — ส่งออก log ที่ filter แล้วเป็นไฟล์ .csv
   * สร้าง Blob แล้ว trigger download ผ่าน anchor element ชั่วคราว
   */
  async function handleExportCSV() {
    playSound('click')
    const all = await fetchAllFiltered()
    const headers = ['id', 'ref', 'attack_class', 'source_ip', 'dst_ip', 'dst_port', 'protocol', 'bytes', 'sensor', 'sevKey', 'statusKey', 'model_name', 'confidence', 'timestamp']
    const rows = [headers.join(','), ...all.map(r => headers.map(h => JSON.stringify(r[h] ?? '')).join(','))].join('\n')
    const blob = new Blob([rows], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'cybershield_logs.csv'
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    playSound('success')
  }

  /**
   * handleExportJSON — ส่งออก log ที่ filter แล้วเป็นไฟล์ .json
   * สร้าง data URI แล้ว trigger download ผ่าน anchor element
   */
  async function handleExportJSON() {
    playSound('click')
    const all = await fetchAllFiltered()
    const url = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(all, null, 2))
    const a = document.createElement('a'); a.href = url; a.download = 'cybershield_logs.json'
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
    playSound('success')
  }

  /**
   * clearFilters — รีเซ็ต filter ทั้งหมดและกลับไปหน้า 1
   */
  function clearFilters() {
    playSound('click')
    setSearchQuery(''); setModelFilter(''); setAttackFilter('')
    setSeverityFilter(''); setStatusFilter(''); setSourceIpFilter('')
    setDateFrom(''); setDateTo('')
    setExcludes(Object.fromEntries(EXCLUDE_FIELDS.map(f => [f, []])))
    setPage(1) // reset pagination
  }

  // กรอง/แบ่งหน้าทำฝั่ง server แล้ว — logs คือหน้าปัจจุบันที่ตรง filter, total คือจำนวนทั้งหมด
  const filtered = logs
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const paginated  = logs

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* ── Header ── */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 40, height: 40, borderRadius: 12, background: 'rgba(99,102,241,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          </div>
          <div>
            <h2 style={{ margin: 0 }}>บันทึกเหตุการณ์</h2>
            <p className="text-muted" style={{ margin: 0, marginTop: 3, fontSize: 13 }}>ค้นหา ดู และส่งออกบันทึกเหตุการณ์ทั้งหมด</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-outline" onClick={handleExportCSV} disabled={total === 0} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            ส่งออก CSV
          </button>
          <button className="btn btn-outline" onClick={handleExportJSON} disabled={total === 0} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>
            ส่งออก JSON
          </button>
          <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            รีเฟรช
          </button>
        </div>
      </div>

      {/* ── Filters Card ── */}
      <div className="card elev-sm" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Search Bar */}
        <div style={{ position: 'relative' }}>
          <svg style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)', pointerEvents: 'none' }} width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="ค้นหา IP, ประเภทการโจมตี หรือรหัสอ้างอิง..."
            style={{ width: '100%', padding: '11px 16px 11px 42px', border: '1px solid var(--border-soft)', borderRadius: 10, background: 'var(--row-head-bg)', color: 'var(--text)', fontSize: 13.5, outline: 'none', boxSizing: 'border-box' }} />
        </div>

        {/* Row 1 */}
        <div className="logs-filter-grid logs-filter-grid-2">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-tertiary)' }}>โหมดทั้งหมด</label>
            <select value={modelFilter} onChange={e => { setModelFilter(e.target.value); setPage(1) }}
              style={{ padding: '9px 12px', border: '1px solid var(--border-soft)', borderRadius: 8, background: 'var(--row-head-bg)', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}>
              <option value="">โหมดทั้งหมด</option>
              <option value="intrusion">Intrusion LSTM (NSL-KDD)</option>
              <option value="flow">Flow LSTM (CSE-CIC-IDS2018)</option>
              <option value="flow_rules">Rate rules (flow_rules)</option>
              <option value="injection">Injection LSTM (SQLi)</option>
              <option value="sqli_rules">SQLi signature rules (sqli_rules)</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 5 }}>ประเภทการโจมตีทั้งหมด <InfoHelp id="attackType" /></label>
            <select value={attackFilter} onChange={e => { setAttackFilter(e.target.value); setPage(1) }}
              style={{ padding: '9px 12px', border: '1px solid var(--border-soft)', borderRadius: 8, background: 'var(--row-head-bg)', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}>
              <option value="">ประเภทการโจมตีทั้งหมด</option>
              {[...new Set([...classOptions, ...(attackFilter ? [attackFilter] : [])])].sort().map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Row 2 */}
        <div className="logs-filter-grid logs-filter-grid-3">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-tertiary)' }}>ช่วงเวลา</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ThaiDP value={dateFrom} onChange={v => {
                setDateFrom(v);
                if (v && !dateTo) {
                  const today = new Date().toISOString().slice(0, 10);
                  setDateTo(today);
                }
                setPage(1);
              }} placeholder="วันเริ่มต้น…" />
              <span style={{ color: 'var(--text-tertiary)', fontWeight: 500, fontSize: 13, flexShrink: 0 }}>–</span>
              <ThaiDP value={dateTo} onChange={v => { setDateTo(v); setPage(1); }} placeholder="วันสิ้นสุด…" minDate={dateFrom} />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-tertiary)' }}>ความรุนแรง</label>
            <select value={severityFilter} onChange={e => { setSeverityFilter(e.target.value); setPage(1) }}
              style={{ padding: '9px 12px', border: '1px solid var(--border-soft)', borderRadius: 8, background: 'var(--row-head-bg)', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}>
              <option value="">ทั้งหมด</option>
              <option value="CRITICAL">วิกฤต</option>
              <option value="HIGH">สูง</option>
              <option value="MEDIUM">ปานกลาง</option>
              <option value="LOW">ต่ำ</option>
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-tertiary)' }}>สถานะ</label>
            <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
              style={{ padding: '9px 12px', border: '1px solid var(--border-soft)', borderRadius: 8, background: 'var(--row-head-bg)', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}>
              <option value="">ทั้งหมด</option>
              <option value="INVESTIGATING">กำลังตรวจสอบ</option>
              <option value="MITIGATED">แก้ไขแล้ว</option>
              <option value="OPEN">เปิดอยู่</option>
            </select>
          </div>
        </div>

        {/* Row 3 */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--text-tertiary)' }}>แหล่งที่มา</label>
            <input value={sourceIpFilter} onChange={e => { setSourceIpFilter(e.target.value); setPage(1) }} placeholder="ระบุ IP Address"
              style={{ padding: '9px 12px', border: '1px solid var(--border-soft)', borderRadius: 8, background: 'var(--row-head-bg)', color: 'var(--text)', fontSize: 13, outline: 'none' }} />
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={clearFilters} style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid var(--border-soft)', background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>
            ล้างตัวกรอง
          </button>
          <button className="btn btn-primary" onClick={() => setPage(1)} style={{ padding: '9px 24px', display: 'flex', alignItems: 'center', gap: 6 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            ค้นหา
          </button>
        </div>
      </div>

      {/* ── Results Table ── */}
      <div className="card elev-sm" style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* filter ที่ใช้อยู่ — กด × ลบทีละอัน, ชิปเส้นประ = กรองออก */}
        {chips.length > 0 && (
          <div className="filter-chips" role="list" aria-label="ตัวกรองที่ใช้อยู่">
            {chips.map(c => (
              <span key={c.id} role="listitem" className={`filter-chip${c.exclude ? ' exclude' : ''}`}>
                <span className="filter-chip-label">{c.label}</span>
                <span className="filter-chip-value mono">{c.value}</span>
                <button type="button" aria-label={`ลบตัวกรอง ${c.label} ${c.value}`} onClick={() => { playSound('click'); c.clear(); setPage(1) }}>×</button>
              </span>
            ))}
            {chips.length > 1 && <button type="button" className="filter-chips-clear" onClick={clearFilters}>ล้างทั้งหมด</button>}
          </div>
        )}
        <div style={{ fontSize: 14.5, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 10 }}>
          ผลการค้นหา
          <span style={{ background: 'var(--accent)', color: '#fff', fontSize: 12, fontWeight: 700, padding: '2px 10px', borderRadius: 999 }}>{total} รายการ</span>
          <label style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 500, color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input type="checkbox" checked={live} onChange={e => setLive(e.target.checked)} />
            อัปเดตสด (หน้า 1)
          </label>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner"></div></div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-tertiary)', fontSize: 14 }}>
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: 12, opacity: .4 }}><rect x="5" y="3" width="14" height="18" rx="1"></rect><line x1="8" y1="8" x2="16" y2="8"></line><line x1="8" y1="12" x2="16" y2="12"></line><line x1="8" y1="16" x2="11" y2="16"></line></svg>
            <div>{error ? 'เชื่อมต่อ API ไม่ได้ — ไม่สามารถโหลดบันทึกเหตุการณ์' : total === 0 && chips.length === 0 ? 'ยังไม่มีเหตุการณ์ที่ตรวจพบ' : 'ไม่พบข้อมูล'}</div>
            <button onClick={clearFilters} style={{ marginTop: 14, padding: '8px 18px', borderRadius: 8, border: '1px solid var(--border-soft)', background: 'transparent', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 13 }}>ล้างตัวกรอง</button>
          </div>
        ) : (
          <>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border-soft)' }}>
                    {['เวลา', 'รหัสอ้างอิง', 'ประเภทการโจมตี', 'แหล่งที่มา', 'ความรุนแรง', 'สถานะ'].map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 11.5, fontWeight: 600, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((log, i) => {
                    const sev = SEV_CONFIG[log.sevKey] || SEV_CONFIG.LOW
                    const st = STATUS_CONFIG[log.statusKey] || STATUS_CONFIG.OPEN
                    const atk = ATTACK_PILL[log.attack_class] || { bg: 'var(--row-head-bg)', color: 'var(--text-secondary)' }
                    return (
                      <tr key={log.id} style={{ borderBottom: '1px solid var(--border-soft)', cursor: 'pointer', transition: 'background .15s' }}
                        onMouseEnter={e => e.currentTarget.style.background = 'var(--row-head-bg)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        onClick={() => { playSound('click'); setSelectedEvent(log) }}>
                        <td style={{ padding: '14px 14px', verticalAlign: 'top' }}>
                          <div style={{ fontSize: 12.5, fontWeight: 600 }}>{formatTH(log.timestamp).split(' ').slice(0,2).join(' ')}</div>
                          <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 1 }}>{formatTH(log.timestamp).split(' ')[2]}</div>
                        </td>
                        <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                          <span className="mono" style={{ fontSize: 12.5, fontWeight: 600 }}>{log.ref}</span>
                        </td>
                        <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                          <span style={{ background: atk.bg, color: atk.color, fontSize: 12.5, fontWeight: 700, padding: '5px 12px', borderRadius: 999 }}>{log.attack_class}</span>
                          <CellFilter field="attack_class" value={log.attack_class} onInclude={filterFor} onExclude={filterOut} />
                        </td>
                        <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                          <span className="mono" style={{ fontSize: 12.5 }}>{log.source_ip}</span>
                          <CellFilter field="source_ip" value={log.source_ip} onInclude={filterFor} onExclude={filterOut} />
                        </td>
                        <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                          <span style={{ background: sev.bg, color: sev.color, fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 999, display: 'flex', alignItems: 'center', gap: 6, width: 'fit-content' }}>
                            <span style={{ width: 6, height: 6, borderRadius: 999, background: sev.color, display: 'inline-block', flexShrink: 0 }} />
                            {sev.label}
                          </span>
                        </td>
                        <td style={{ padding: '14px 14px', verticalAlign: 'middle' }}>
                          <span style={{ background: st.bg, color: st.color, fontSize: 12, fontWeight: 600, padding: '5px 12px', borderRadius: 999 }}>{st.label}</span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--text-secondary)' }}>
                <span>แสดง</span>
                <select value={pageSize} onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }} style={{ padding: '5px 10px', border: '1px solid var(--border-soft)', borderRadius: 6, background: 'var(--row-head-bg)', color: 'var(--text)', fontSize: 13 }}>
                  <option>10</option><option>25</option><option>50</option>
                </select>
                <span>รายการต่อหน้า</span>
              </div>
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {/* ← Prev */}
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                  style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border-soft)', background: 'transparent',
                    cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? .35 : 1, color: 'var(--text)' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
                </button>

                {/* Page numbers — windowed: first, ...left-gap..., cur±2, ...right-gap..., last */}
                {(() => {
                  const delta = 2;
                  const range = [];
                  const rangeWithDots = [];
                  let l;
                  for (let i = 1; i <= totalPages; i++) {
                    if (i === 1 || i === totalPages || (i >= page - delta && i <= page + delta)) {
                      range.push(i);
                    }
                  }
                  for (const i of range) {
                    if (l) {
                      if (i - l === 2) rangeWithDots.push(l + 1);
                      else if (i - l > 2) rangeWithDots.push('…');
                    }
                    rangeWithDots.push(i);
                    l = i;
                  }
                  return rangeWithDots.map((item, idx) =>
                    item === '…'
                      ? <span key={'dot' + idx} style={{ padding: '0 4px', color: 'var(--text-tertiary)', fontSize: 13 }}>…</span>
                      : <button key={item} onClick={() => setPage(item)}
                          style={{ minWidth: 34, padding: '6px 8px', borderRadius: 8,
                            border: `1px solid ${page === item ? 'var(--accent)' : 'var(--border-soft)'}`,
                            fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            background: page === item ? 'var(--accent)' : 'transparent',
                            color: page === item ? '#fff' : 'var(--text)',
                            transition: 'background .12s, border-color .12s',
                          }}>
                          {item}
                        </button>
                  );
                })()}

                {/* → Next */}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                  style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border-soft)', background: 'transparent',
                    cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? .35 : 1, color: 'var(--text)' }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {selectedEvent && <ThreatInspectModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </div>
  )
}
