// ─────────────────────────────────────────────────────────────────────────────
// pages/Dashboard.jsx — หน้าหลัก (Dashboard) ภาพรวมความปลอดภัย
//
// ประกอบด้วย:
//   - Stat Cards: สถานะระบบ, จำนวนเหตุการณ์, แจ้งเตือนวิกฤต, แก้ไขแล้ว
//   - Network Chart: กราฟความเร็วแพ็กเก็ตเครือข่ายแบบ real-time (SVG line chart พร้อมกราฟ 3 เส้น)
//   - Summary Table: รายการเหตุการณ์ล่าสุดจาก API (ไม่มี mock — ว่างแสดง empty state)
//   - Donut Chart: สัดส่วนระดับความรุนแรง + Bar Chart: การแจ้งเตือนรายสัปดาห์
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import InfoHelp from '../components/InfoHelp'
import ThreatInspectModal from '../components/ThreatInspectModal'
import { useApp } from '../context/AppContext'
import { relativeTimeTh } from '../utils/time'
import { useLiveEvents } from '../hooks/useLiveEvents'

// ── Config ระดับความรุนแรง (Severity) ───────────────────────────────────────
// ⚡ แก้ชื่อหรือสีที่นี่ → เห็นผลทันทีในตารางเหตุการณ์และตารางสุดท้าย
// ต้องใช้ค่า confidence เดียวกับ Incidents.jsx (ไม่งั้นจะแสดงไม่ตรงกัน)
const SEV_CONFIG = {
  CRITICAL: { label: 'วิกฤต',    color: '#f87171' },  // confidence >= 95% — สีแดง
  HIGH:     { label: 'สูง',      color: '#fb923c' },  // confidence >= 90% — สีส้ม
  MEDIUM:   { label: 'ปานกลาง', color: '#fbbf24' }, // confidence >= 80% — สีเหลือง
  LOW:      { label: 'ต่ำ',      color: '#4ade80' },  // confidence < 80%  — สีเขียว
}

// ── Config สถานะเหตุการณ์ (Status) ───────────────────────────────────────
// ⚡ แก้ label ภาษาไทยหรือสีที่นี่ → badge สถานะในตารางเปลี่ยนทันที
const STATUS_CONFIG = {
  OPEN:          { label: 'เปิดอยู่',      bg: 'rgba(239,68,68,.12)',   color: '#f87171' }, // แดง
  INVESTIGATING: { label: 'กำลังตรวจสอบ', bg: 'rgba(234,179,8,.12)',   color: '#fbbf24' }, // เหลือง
  MITIGATED:     { label: 'แก้ไขแล้ว',    bg: 'rgba(34,197,94,.12)',   color: '#4ade80' }, // เขียว
}

// ── ฟังก์ชันแปลง confidence (0.0-1.0) → Severity key ─────────────────────
// ⚡ แก้ค่า threshold ที่นี่ → ระดับความรุนแรงในตารางเปลี่ยนทันที
// ตารางสุดท้ายและตัวเลข Stat Card ใช้ฟังก์ชันนี้ทั้งหมด
function getSevKey(confidence) {
  // >= 0.95 → CRITICAL, >= 0.90 → HIGH, >= 0.80 → MEDIUM, < 0.80 → LOW
  return confidence >= 0.95 ? 'CRITICAL' : confidence >= 0.9 ? 'HIGH' : confidence >= 0.8 ? 'MEDIUM' : 'LOW'
}

// ค่า <input type="datetime-local"> = 'YYYY-MM-DDTHH:mm' เวลาท้องถิ่น
const toInput = (d) => {
  const p = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

// ── RankList — อันดับ Top-N แบบแท่งแนวนอน (Top sources / targets / ports / protocol) ───
function RankList({ title, hint, items, color = '#f87171', mono = true, onClick, emptyText = 'ยังไม่มีข้อมูล' }) {
  return (
    <div className="card elev-sm" style={{ padding: '18px 20px' }}>
      <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 3 }}>{title}</div>
      <div className="text-muted" style={{ fontSize: 11, marginBottom: 14 }}>{hint}</div>
      {items.length === 0 ? (
        <div className="text-muted" style={{ textAlign: 'center', padding: '24px 0', fontSize: 12.5 }}>{emptyText}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map(({ key, count }) => (
            <div key={key} onClick={onClick ? () => onClick(key) : undefined} style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: onClick ? 'pointer' : 'default' }}>
              <span style={{ fontFamily: mono ? 'monospace' : 'inherit', fontSize: 12.5, width: 130, flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{key}</span>
              <div style={{ flex: 1, height: 8, borderRadius: 999, background: 'var(--border-soft)', overflow: 'hidden' }}>
                <div style={{ width: `${(count / items[0].count) * 100}%`, height: '100%', background: color }}></div>
              </div>
              <span style={{ fontWeight: 700, fontSize: 12.5, width: 44, textAlign: 'right' }}>{count}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Donut Chart — แสดงสัดส่วนระดับความรุนแรงแบบวงแหวน ─────────────────────────────────
function DonutChart({ data, size = 120, strokeWidth = 16 }) {
  const [hovered, setHovered] = useState(null)
  const center = size / 2
  const radius = center - strokeWidth / 2
  const circumference = 2 * Math.PI * radius
  const total = data.reduce((sum, d) => sum + d.value, 0)
  const GAP_DEG = 3.5 // องศาช่องว่างระหว่างแต่ละส่วน
  const GAP_ARC = (GAP_DEG / 360) * circumference

  // สร้าง segments พร้อมช่องว่างระหว่างกัน
  let segments = []
  let cumulative = 0
  data.forEach((d, i) => {
    if (d.value === 0) return
    const arcLen = (d.value / total) * circumference
    const drawn = Math.max(0, arcLen - GAP_ARC)
    segments.push({ ...d, i, arcLen, drawn, offset: cumulative })
    cumulative += arcLen
  })

  const hoveredItem = hovered !== null ? data[hovered] : null
  const hoveredPct = hoveredItem ? Math.round((hoveredItem.value / total) * 100) : null

  return (
    <div style={{ width: size, height: size, position: 'relative' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* วงกลมพื้นหลัง (Track) */}
        <circle cx={center} cy={center} r={radius} fill="none" stroke="var(--border-soft)" strokeWidth={strokeWidth} />
        {segments.map(({ color, drawn, offset, i, label }) => (
          <circle key={i} cx={center} cy={center} r={radius} fill="none"
            stroke={hovered === null || hovered === i ? color : `${color}55`}
            strokeWidth={hovered === i ? strokeWidth + 3 : strokeWidth}
            strokeDasharray={`${drawn} ${circumference}`}
            strokeDashoffset={-offset}
            strokeLinecap="butt"
            style={{ transition: 'stroke-opacity .2s, stroke-width .15s', cursor: 'pointer' }}
            transform={`rotate(-90 ${center} ${center})`}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          />
        ))}
      </svg>
      {/* ป้ายกำกับตรงกลางวงแหวน */}
      {hoveredItem ? (
        <div style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', pointerEvents: 'none'
        }}>
          <span style={{ fontSize: size * 0.18, fontWeight: 800, color: hoveredItem.color, lineHeight: 1 }}>{hoveredPct}%</span>
          <span style={{ fontSize: size * 0.1, color: 'var(--text-secondary)', marginTop: 2, fontWeight: 600, textAlign: 'center', maxWidth: size * 0.7 }}>{hoveredItem.label}</span>
        </div>
      ) : null}
    </div>
  )
}

// ── Bar Chart — กราฟแท่งแยกปริมาณ Alert รายสัปดาห์ (คลิก pin แต่ละแถวได้) ─────────────────────
function BarChart({ values }) {
  const [hovered, setHovered] = useState(null)
  const [pinned, setPinned] = useState(null)
  const MAX = Math.max(1, ...values)
  const active = pinned !== null ? pinned : hovered

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* แถบกราฟแท่ง */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', gap: 5, padding: '0 2px', minHeight: 0 }}>
        {values.map((v, i) => {
          const isMax = v === MAX
          const isActive = active === i
          const pct = (v / MAX) * 100
          return (
            <div
              key={i}
              style={{ flex: 1, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative', cursor: 'pointer' }}
              onMouseEnter={() => { if (pinned === null) setHovered(i) }}
              onMouseLeave={() => { if (pinned === null) setHovered(null) }}
              onClick={() => setPinned(pinned === i ? null : i)}
            >
              {/* ป้ายแสดงค่าเมื่อ hover */}
              {isActive && (
                <div style={{
                  position: 'absolute', bottom: `${pct}%`, left: '50%',
                  transform: 'translate(-50%, -6px)',
                  background: isMax ? '#6366f1' : 'var(--card-bg)',
                  color: isMax ? '#fff' : 'var(--text)',
                  border: `1.5px solid ${isMax ? '#6366f1' : 'var(--border-soft)'}`,
                  borderRadius: 7, padding: '3px 7px',
                  fontSize: 11, fontWeight: 800, whiteSpace: 'nowrap',
                  boxShadow: '0 2px 8px rgba(0,0,0,.15)',
                  zIndex: 10, pointerEvents: 'none',
                }}>
                  {v} ครั้ง
                  {/* ลูกศรชี้ลงใต้ป้าย */}
                  <span style={{
                    position: 'absolute', top: '100%', left: '50%',
                    transform: 'translateX(-50%)',
                    width: 0, height: 0,
                    borderLeft: '5px solid transparent',
                    borderRight: '5px solid transparent',
                    borderTop: `5px solid ${isMax ? '#6366f1' : 'var(--border-soft)'}`,
                  }} />
                </div>
              )}
              {/* แท่งกราฟ */}
              <div style={{
                width: '100%',
                height: `${pct}%`,
                borderRadius: '6px 6px 3px 3px',
                background: isMax
                  ? 'linear-gradient(180deg,#818cf8,#6366f1)'
                  : isActive
                    ? 'linear-gradient(180deg,rgba(99,102,241,.8),rgba(99,102,241,.5))'
                    : 'linear-gradient(180deg,rgba(99,102,241,.45),rgba(99,102,241,.2))',
                boxShadow: isMax ? '0 0 10px rgba(99,102,241,.55)' : isActive ? '0 0 6px rgba(99,102,241,.35)' : 'none',
                transform: isActive ? 'scaleX(1.08)' : 'scaleX(1)',
                transition: 'height .4s ease, background .2s, transform .15s, box-shadow .2s',
              }} />
            </div>
          )
        })}
      </div>
      {/* แกน X (ป้ายเวลาด้านล่าง) */}
      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid var(--border-soft)', marginTop: 8 }}>
        {['-24 ชม.', '-12 ชม.', 'ตอนนี้'].map(l => <span key={l} style={{ fontSize: 10.5, color: 'var(--text-tertiary)', fontWeight: 500 }}>{l}</span>)}
      </div>
    </div>
  )
}

// ── Dropdown ────────────────────────────────────────────────────────────────────
/**
 * Dropdown — Component dropdown menu ทั่วไป
 * ใช้เลือก: ช่วงเวลา, หน่วยวัด, และ filter ตารางสรุป
 * @param {function} trigger    - render prop สำหรับปุ่ม trigger (รับ boolean open)
 * @param {Array} items         - รายการ { key, label } ใน dropdown
 * @param {function} onSelect   - callback เมื่อเลือก item (รับ key)
 * @param {string} selectedKey  - key ที่เลือกอยู่ (ใช้ bold + สีเน้น)
 * @param {string} [tooltip]    - แสดง tooltip เหนือ dropdown เมื่อ open
 */
function Dropdown({ trigger, items, onSelect, selectedKey, tooltip }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // ปิด dropdown เมื่อคลิกนอก component
  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {tooltip && open && (
        <div style={{ position: 'absolute', bottom: 'calc(100% + 8px)', right: 0, background: 'var(--card-bg)', border: '1px solid var(--border-soft)', borderRadius: 8, padding: '8px 12px', fontSize: 12, whiteSpace: 'nowrap', boxShadow: 'var(--shadow)', zIndex: 100, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          {tooltip}
        </div>
      )}
      <div onClick={() => setOpen(o => !o)}>{trigger(open)}</div>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, background: 'var(--card-bg)', border: '1px solid var(--border-soft)', borderRadius: 10, boxShadow: 'var(--shadow)', zIndex: 99, minWidth: 140, overflow: 'hidden' }}>
          {items.map(item => (
            <div key={item.key} onClick={() => { onSelect(item.key); setOpen(false) }}
              style={{ padding: '10px 16px', fontSize: 13, cursor: 'pointer', fontWeight: item.key === selectedKey ? 700 : 400, background: item.key === selectedKey ? 'rgba(99,102,241,.1)' : 'transparent', color: item.key === selectedKey ? 'var(--accent)' : 'var(--text)', transition: 'background .12s' }}
              onMouseEnter={e => { if (item.key !== selectedKey) e.currentTarget.style.background = 'var(--row-head-bg)' }}
              onMouseLeave={e => { if (item.key !== selectedKey) e.currentTarget.style.background = 'transparent' }}>
              {item.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Bell Notification ──────────────────────────────────────────────────────────
/**
 * BellButton — ปุ่มกระดิ่งแจ้งเตือนมุมบนขวาของ Dashboard
 * แสดง dot แดงเมื่อมีการแจ้งเตือนใหม่ และเปิด popover เมื่อคลิก
 * (แสดง alert ล่าสุด 5 รายการจาก /api/logs)
 */
function BellButton({ alerts = [] }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  // ปิด popover เมื่อคลิกนอก component
  useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ width: 38, height: 38, borderRadius: 10, border: '1px solid var(--border-soft)', background: 'var(--card-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', position: 'relative' }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
        </svg>
        {alerts.length > 0 && <span style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: 999, background: '#f87171', border: '2px solid var(--card-bg)' }}></span>}
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: 'var(--card-bg)', border: '1px solid var(--border-soft)', borderRadius: 12, boxShadow: 'var(--shadow)', zIndex: 99, width: 340, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 10 , flexDirection: 'column' }}>
          {alerts.length === 0 ? (
            <div className="text-muted" style={{ fontSize: 12.5 }}>ยังไม่มีการแจ้งเตือน</div>
          ) : alerts.map(a => (
            <div key={a.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
              <div style={{ width: 8, height: 8, borderRadius: 999, background: SEV_CONFIG[getSevKey(a.confidence)].color, marginTop: 5, flexShrink: 0 }}></div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.4 }}>{a.attack_class}</div>
                <div className="text-muted" style={{ fontSize: 12, marginTop: 3 }}>
                  {a.source_ip} · {(a.confidence * 100).toFixed(1)}% · {relativeTimeTh(new Date(a.timestamp).getTime())}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { t, auth } = useApp()
  const navigate = useNavigate()
  // drill-down: เปิดหน้า Logs พร้อม filter ที่ตรงกับสิ่งที่คลิก
  const drill = (qs) => navigate(`/logs?${new URLSearchParams(qs)}`)
  const [search, setSearch] = useState('')  // ค้นหาในตารางเหตุการณ์ล่าสุด (IP / ประเภท / โมเดล)

  // ── State Dropdown (ช่วงเวลา, หน่วยวัด, filter สรุป) ────────────────────────────
  // ⚡ เพิ่ม/ลบตัวเลือกใน Dropdown → ปาก dropdown เปลี่ยนทันที
  const [timeRange,     setTimeRange]     = useState('24h')  // ช่วงเวลาที่เลือก
  const [summaryFilter, setSummaryFilter] = useState('all')  // ตัวกรองตารางสรุป
  const [customFrom, setCustomFrom] = useState(() => toInput(new Date(Date.now() - 86400e3))) // ช่วงกำหนดเอง: เริ่ม
  const [customTo,   setCustomTo]   = useState(() => toInput(new Date()))                       // ช่วงกำหนดเอง: สิ้นสุด

  const TIME_OPTIONS   = [{ key: '1h', label: '1 ชั่วโมง' }, { key: '24h', label: '24 ชั่วโมง' }, { key: '7d', label: '7 วัน' }, { key: '30d', label: '30 วัน' }, { key: 'custom', label: 'กำหนดเอง' }]
  const FILTER_OPTIONS = [{ key: 'all', label: 'ทั้งหมด' }, { key: 'critical', label: 'วิกฤต' }, { key: 'high', label: 'สูง' }, { key: 'medium', label: 'ปานกลาง' }, { key: 'low', label: 'ต่ำ' }]

  // ดึง label ปัจจุบันจาก state เพื่อแสดงในปุ่ม Dropdown
  const summaryLabel = FILTER_OPTIONS.find(o => o.key === summaryFilter)?.label || 'ทั้งหมด'
  const timeLabel    = TIME_OPTIONS.find(o => o.key === timeRange)?.label || '24 ชั่วโมง'

  // ── ดึงข้อมูลจริงจาก Backend (API) — ไม่มี mock/fallback ───────────────────
  const [incidents,    setIncidents]    = useState([])    // events จาก /api/logs (alert only)
  const [statusMap,    setStatusMap]    = useState({})    // { event_id: 'OPEN'|'INVESTIGATING'|'MITIGATED' }
  const [stats,        setStats]        = useState(null)  // ผลจาก /api/stats (null = ยังไม่โหลด)
  const [apiError,     setApiError]     = useState(false) // true = เรียก API ไม่ได้
  const [selectedEvent, setSelectedEvent] = useState(null) // event ที่คลิกเปิด ThreatInspectModal

  // timeRange → ช่วงเวลา (ms) และความกว้าง bucket ของ timeline (นาที)
  const RANGE_CFG = { '1h': { ms: 3600e3, bucket: 5 }, '24h': { ms: 86400e3, bucket: 120 }, '7d': { ms: 7 * 86400e3, bucket: 720 }, '30d': { ms: 30 * 86400e3, bucket: 2880 } }
  const isCustom = timeRange === 'custom'
  const customOk = isCustom && !!customFrom && !!customTo && new Date(customTo) > new Date(customFrom)
  const customMs = customOk ? new Date(customTo) - new Date(customFrom) : 86400e3
  // กำหนดเอง: bucket ให้ได้ ~48 จุดบนกราฟ (API รับ 1–1440 นาที)
  const rangeCfg = isCustom
    ? { ms: customMs, bucket: Math.min(1440, Math.max(1, Math.ceil(customMs / 60000 / 48))) }
    : (RANGE_CFG[timeRange] || RANGE_CFG['24h'])
  const winStart = isCustom ? new Date(customFrom).getTime() : Date.now() - rangeCfg.ms
  const winEnd   = isCustom ? new Date(customTo).getTime() : null

  // sensors บันทึกเวลาเป็น local ISO ไม่มี timezone → ต้องส่ง since ในรูปแบบเดียวกัน
  function localIso(d) {
    const p = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
  }

  useEffect(() => {
    loadAll()
    // ช่วงรีเฟรชจาก Settings > การแสดงผล (วินาที, ค่าเริ่มต้น 15) — event สดรีเฟรชทันทีผ่าน useLiveEvents อยู่แล้ว
    let sec = 15
    try { sec = Math.max(5, Number(localStorage.getItem('cybershield_refresh_interval')) || 15) } catch { /* ใช้ค่าเริ่มต้น */ }
    const id = setInterval(loadAll, sec * 1000)
    return () => clearInterval(id)
  }, [timeRange, customFrom, customTo])

  async function loadAll() {
    if (isCustom && !customOk) return  // ช่วงเวลาที่กำหนดยังไม่ถูกต้อง (สิ้นสุดต้องหลังเริ่มต้น)
    const since = encodeURIComponent(localIso(new Date(winStart)))
    const until = winEnd ? `&until=${encodeURIComponent(localIso(new Date(winEnd)))}` : ''
    try {
      const [sRes, lRes, stRes] = await Promise.all([
        fetch(`/api/stats?since=${since}${until}&bucket=${rangeCfg.bucket}`),
        fetch(`/api/logs?limit=200&alerts_only=true&since=${since}${until}`),
        fetch('/api/incidents/statuses'),
      ])
      const sData = await sRes.json()
      const lData = await lRes.json()
      if (!sData.ok || !lData.ok) throw new Error('api')
      setStats(sData.data)
      setIncidents(lData.data)
      try { const st = await stRes.json(); if (st.ok) setStatusMap(st.data) } catch { /* ไม่มี status = OPEN */ }
      setApiError(false)
    } catch {
      setApiError(true)
    }
  }

  // event ใหม่จาก /ws/feed → รีเฟรชทันที (ช่วงกำหนดเองที่ผ่านมาแล้วไม่ต้อง)
  useLiveEvents(() => loadAll(), { enabled: !isCustom })

  // ดึงสถานะของ event หนึ่ง — ถ้าไม่มีใน statusMap ใช้ 'OPEN' เป็นค่าเริ่มต้น
  function getStatus(item) { return statusMap[item.id] || 'OPEN' }

  // ── ตัวเลข Stat Cards: มาจาก /api/stats ตรงๆ (0 ถ้ายังไม่มีข้อมูล) ───────────
  const totalIncidents    = stats?.totals.alerts ?? 0
  const criticalIncidents = stats?.by_severity.CRITICAL ?? 0
  const resolvedIncidents = stats?.totals.resolved ?? 0

  // เรียงจากใหม่ → เก่า และเอา 5 อันดับแรกเพื่อแสดงในตาราง
  const q = search.trim().toLowerCase()
  const latestIncidents = incidents
    .filter(i => summaryFilter === 'all' || getSevKey(i.confidence).toLowerCase() === summaryFilter)
    .filter(i => !q || [i.source_ip, i.attack_class, i.model_name].some(v => String(v ?? '').toLowerCase().includes(q)))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 5)
  // BellButton: 5 รายการล่าสุดโดยไม่ผ่านตัวกรอง/ค้นหา
  const latestAlerts = [...incidents].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, 5)

  // ── กราฟ events ตามเวลา (SVG line) จาก stats.timeline ─────────────────────
  const timeline = stats?.timeline ?? []
  const chartW = 640, chartH = 148
  const maxVal = Math.max(1, ...timeline.map(b => Math.max(b.alerts, b.normal)))
  const stepX = timeline.length > 1 ? chartW / (timeline.length - 1) : chartW
  const toPath = (key) => timeline
    .map((b, i) => `${i === 0 ? 'M' : 'L'}${(i * stepX).toFixed(1)},${(chartH - (b[key] / maxVal) * chartH).toFixed(1)}`)
    .join(' ')
  const safePath = toPath('normal'), threatPath = toPath('alerts')
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(f => ({ y: chartH * f, label: String(Math.round(maxVal * (1 - f))) }))
  const fmtTick = (iso) => {
    const d = new Date(iso)
    return rangeCfg.ms <= 86400e3
      ? d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
  }
  const tickLabels = timeline.length === 0 ? [] : [0, 0.25, 0.5, 0.75, 1].map(f => fmtTick(timeline[Math.round((timeline.length - 1) * f)].t))

  // ── Donut / แหล่งที่มา / แท่ง จาก stats ───────────────────────────────────
  const CLASS_COLORS = ['#6366f1', '#22d3ee', '#f97316', '#f43f5e', '#a78bfa', '#eab308', '#22c55e']
  const classData = (stats?.by_class ?? []).map((c, i) => ({ value: c.count, color: CLASS_COLORS[i % CLASS_COLORS.length], label: c.key }))
  const sevData = [
    { value: stats?.by_severity.CRITICAL ?? 0, color: '#f43f5e', label: 'วิกฤต' },
    { value: stats?.by_severity.HIGH ?? 0,     color: '#f97316', label: 'สูง' },
    { value: stats?.by_severity.MEDIUM ?? 0,   color: '#eab308', label: 'ปานกลาง' },
    { value: stats?.by_severity.LOW ?? 0,      color: '#22c55e', label: 'ต่ำ' },
  ]
  const scope = stats?.source_scope ?? { internal: 0, external: 0, unknown: 0 }
  const scopeTotal = scope.internal + scope.external + scope.unknown
  const pct = (n, tot) => (tot ? Math.round((n / tot) * 100) + '%' : '0%')

  // แท่ง: แบ่ง timeRange เป็น 12 ช่วงเท่าๆ กัน นับ alerts ตามเวลา bucket
  const BAR_N = 12
  const barStart = winStart
  const barValues = Array(BAR_N).fill(0)
  timeline.forEach(b => {
    const idx = Math.min(BAR_N - 1, Math.max(0, Math.floor(((new Date(b.t).getTime() - barStart) / rangeCfg.ms) * BAR_N)))
    barValues[idx] += b.alerts
  })
  const barPeak = Math.max(...barValues)

  const sysCritical = criticalIncidents > 0

  // ── ส่งออกรายงานสรุป (CSV หลาย section) ────────────────────────────────────────
  function exportReport() {
    if (!stats) return
    const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
    const sec = (title, header, rows) => ['', esc(title), header.map(esc).join(','), ...rows.map(r => r.map(esc).join(','))]
    const lines = [
      `${esc('CyberShield — รายงานสรุป')}`,
      `${esc('ช่วงเวลา')},${esc(isCustom ? `${customFrom} ถึง ${customTo}` : timeLabel)}`,
      `${esc('สร้างเมื่อ')},${esc(new Date().toISOString())}`,
      ...sec('สรุป', ['รายการ', 'จำนวน'], [
        ['เหตุการณ์ทั้งหมด', stats.totals.events], ['แจ้งเตือน', stats.totals.alerts],
        ['ปกติ', stats.totals.normal], ['แก้ไขแล้ว', stats.totals.resolved ?? 0]]),
      ...sec('ความรุนแรง', ['ระดับ', 'จำนวน'], Object.entries(stats.by_severity)),
      ...sec('ประเภทการโจมตี', ['ประเภท', 'จำนวน'], stats.by_class.map(c => [c.key, c.count])),
      ...sec('โมเดล/กฎที่ตรวจพบ', ['โมเดล', 'จำนวน'], stats.by_model.map(c => [c.key, c.count])),
      ...sec('แหล่งโจมตีสูงสุด', ['IP', 'จำนวน'], stats.top_sources.map(c => [c.key, c.count])),
      ...sec('เป้าหมายสูงสุด', ['IP', 'จำนวน'], (stats.top_targets ?? []).map(c => [c.key, c.count])),
      ...sec('พอร์ตปลายทางสูงสุด', ['พอร์ต', 'จำนวน'], (stats.top_ports ?? []).map(c => [c.key, c.count])),
      ...sec('โปรโตคอล', ['โปรโตคอล', 'จำนวน'], (stats.by_protocol ?? []).map(c => [c.key, c.count])),
      ...sec('ไทม์ไลน์', ['เวลา', 'แจ้งเตือน', 'ปกติ'], stats.timeline.map(b => [b.t, b.alerts, b.normal])),
    ]
    const blob = new Blob(['\ufeff' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' }) // BOM ให้ Excel อ่านภาษาไทยถูก
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'cybershield_report.csv'
    document.body.appendChild(a); a.click(); document.body.removeChild(a)
  }

  // ── Style helper: Dropdown trigger button (pill shape) ───────────────────────────
  // ใช้กับ spread operator: {...pillBtn(), extraStyle} เพื่อ override บางค่า
  const inputStyle = { padding: '7px 10px', borderRadius: 10, border: '1px solid var(--border-soft)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: 12.5 }
  const pillBtn = (active) => ({
    display: 'flex', alignItems: 'center', gap: 7, padding: '8px 14px', borderRadius: 10,
    border: '1px solid var(--border-soft)', background: 'var(--card-bg)', cursor: 'pointer',
    fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* ── ส่วนหัวหน้า ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800 }}>ยินดีต้อนรับกลับ, {auth?.user || 'admin'} 👋</h2>
          <p className="text-muted" style={{ margin: 0, fontSize: 13.5 }}>ภาพรวมสถานะความปลอดภัยของระบบและกิจกรรมล่าสุด</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* ช่องค้นหา */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 10, border: '1px solid var(--border-soft)', background: 'var(--card-bg)', width: 260 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ค้นหา IP, ประเภท, โมเดล..." style={{ border: 'none', background: 'transparent', color: 'var(--text)', fontSize: 13, outline: 'none', width: '100%' }} />
          </div>

          {/* Dropdown เลือกช่วงเวลา */}
          <Dropdown
            selectedKey={timeRange}
            items={TIME_OPTIONS}
            onSelect={setTimeRange}
            trigger={(open) => (
              <button style={pillBtn()}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                {timeLabel}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: open ? 'rotate(180deg)' : '', transition: 'transform .2s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
            )}
          />

          {isCustom && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <input type="datetime-local" value={customFrom} max={customTo} onChange={e => setCustomFrom(e.target.value)} style={{ ...inputStyle, borderColor: customOk ? 'var(--border-soft)' : '#f87171' }} />
              <span className="text-muted">–</span>
              <input type="datetime-local" value={customTo} min={customFrom} onChange={e => setCustomTo(e.target.value)} style={{ ...inputStyle, borderColor: customOk ? 'var(--border-soft)' : '#f87171' }} />
            </div>
          )}

          {/* ส่งออกรายงาน */}
          <button className="no-print" style={pillBtn()} onClick={exportReport} disabled={!stats} title="ดาวน์โหลดรายงานสรุปเป็น CSV">CSV</button>
          <button className="no-print" style={pillBtn()} onClick={() => window.print()} title="พิมพ์ / บันทึกเป็น PDF">PDF</button>

          {/* ปุ่มกระดิ่งแจ้งเตือน */}
          <BellButton alerts={latestAlerts} />
        </div>
      </div>

      {/* ── การ์ดสถิติสรุป ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
        {/* สถานะระบบ */}
        <div className="card elev-sm" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: '#4ade80', display: 'inline-block' }}></span>
            สถานะระบบ
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: apiError ? '#fb923c' : sysCritical ? '#f87171' : '#4ade80' }}>{apiError ? 'ไม่ทราบสถานะ' : sysCritical ? 'พบภัยคุกคาม' : 'ปลอดภัย'}</div>
          <div className="text-muted" style={{ fontSize: 11.5, marginTop: 5 }}>{apiError ? 'ติดต่อ API ไม่ได้' : sysCritical ? `พบแจ้งเตือนวิกฤต ${criticalIncidents} รายการ` : `ไม่พบแจ้งเตือนวิกฤตใน${timeLabel}`}</div>
        </div>

        {/* เหตุการณ์ทั้งหมด */}
        <div className="card elev-sm" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            เหตุการณ์ทั้งหมด
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)' }}>{totalIncidents}</div>
          <div className="text-muted" style={{ fontSize: 11.5, marginTop: 5 }}>แจ้งเตือนใน{timeLabel}</div>
        </div>

        {/* แจ้งเตือนวิกฤต — highlighted */}
        <div style={{ padding: '18px 20px', borderRadius: 14, border: '1.5px solid rgba(239,68,68,.3)', background: 'rgba(239,68,68,.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: '#f87171', marginBottom: 10 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            แจ้งเตือนวิกฤต
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#f87171' }}>{criticalIncidents}</div>
          <div style={{ fontSize: 11.5, marginTop: 5, color: '#f87171', fontWeight: 600 }}>ต้องดำเนินการทันที</div>
        </div>

        {/* เหตุการณ์ที่แก้ไขแล้ว */}
        <div className="card elev-sm" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>
            เหตุการณ์ที่แก้ไขแล้ว
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)' }}>{resolvedIncidents}</div>
          <div className="text-muted" style={{ fontSize: 11.5, marginTop: 5 }}>ใน{timeLabel}</div>
        </div>

        {/* สถานะโดยรวม */}
        <div className="card elev-sm" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2"><path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"></path></svg>
            สถานะโดยรวม
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: apiError ? '#f87171' : '#4ade80' }}>{apiError ? 'ออฟไลน์' : 'ออนไลน์'}</div>
          <div className="text-muted" style={{ fontSize: 11.5, marginTop: 5 }}>{apiError ? 'เชื่อมต่อ backend ไม่ได้' : 'เชื่อมต่อ backend ได้'}</div>
        </div>
      </div>

      {/* ── กราฟเครือข่ายหลัก ── */}
      <div className="card elev-sm" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14.5, display: 'flex', alignItems: 'center', gap: 7 }}>
              เหตุการณ์ตามเวลา <InfoHelp id="packetSpeed" />
            </div>
            <div className="text-muted" style={{ fontSize: 11.5, marginTop: 3 }}>จำนวนเหตุการณ์ที่โมเดล/กฎตรวจจับได้ ย้อนหลัง {timeLabel} (นับต่อช่วงเวลา)</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* คำอธิบายสีกราฟ (Legend) */}
            {[['#4ade80', 'ปกติ / ไม่เป็นภัย'], ['#f87171', 'ภัยคุกคาม']].map(([color, label]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: color, display: 'inline-block' }}></span>
                {label}
              </div>
            ))}
          </div>
        </div>

        {timeline.length === 0 ? (
          <div className="text-muted" style={{ textAlign: 'center', padding: '48px 0', fontSize: 13.5 }}>
            {apiError ? 'เชื่อมต่อ API ไม่ได้' : `ยังไม่มีเหตุการณ์ใน${timeLabel}`}
          </div>
        ) : (
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: 20, width: 28, textAlign: 'right' }}>
            {gridLines.map((g, i) => <span key={i} style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>{g.label}</span>)}
          </div>
          <div style={{ flex: 1 }}>
            <svg width="100%" height="148" viewBox={`0 0 ${chartW} ${chartH}`} style={{ display: 'block' }} preserveAspectRatio="none">
              {gridLines.map((g, i) => <line key={i} x1="0" y1={g.y} x2={chartW} y2={g.y} stroke="var(--border-soft)" strokeWidth="1" />)}
              <path d={safePath} fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              <path d={threatPath} fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              {timeline.length === 1 && <>
                <circle cx={0} cy={chartH - (timeline[0].normal / maxVal) * chartH} r="3" fill="#4ade80" />
                <circle cx={0} cy={chartH - (timeline[0].alerts / maxVal) * chartH} r="3" fill="#f87171" />
              </>}
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              {tickLabels.map((t, i) => (
                <span key={i} style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
        )}
      </div>

      {/* ── ส่วนสรุปเหตุการณ์ ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>สรุปเหตุการณ์ & กิจกรรมล่าสุด</div>
          <Dropdown
            selectedKey={summaryFilter}
            items={FILTER_OPTIONS}
            onSelect={setSummaryFilter}
            tooltip={summaryFilter !== 'all' ? `กำลังกรองสรุปเหตุการณ์: ${summaryLabel}` : undefined}
            trigger={(open) => (
              <button style={{ ...pillBtn(), fontSize: 12.5, padding: '7px 14px' }}>
                {summaryLabel}
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: open ? 'rotate(180deg)' : '', transition: 'transform .2s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
              </button>
            )}
          />
        </div>

        {/* กริดการ์ดสรุป 4 ช่อง */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
          {/* การ์ด 1: ประเภทเหตุการณ์ */}
          <div className="card elev-sm" style={{ padding: '18px 20px' }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 3 }}>ประเภทเหตุการณ์</div>
            <div className="text-muted" style={{ fontSize: 11, marginBottom: 14 }}>สัดส่วนเหตุการณ์ที่ตรวจพบใน{timeLabel} แยกตามประเภทการโจมตี</div>
            {classData.length === 0 ? (
            <div className="text-muted" style={{ textAlign: 'center', padding: '36px 0', fontSize: 12.5 }}>{apiError ? 'เชื่อมต่อ API ไม่ได้' : 'ยังไม่มีข้อมูล'}</div>
            ) : (<>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <DonutChart data={classData} size={112} strokeWidth={20} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {classData.map(({ color: c, label: l, value: v }) => (
                <div key={l} onClick={() => drill({ attack_class: l })} title="ดูบันทึกเหตุการณ์ประเภทนี้" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, alignItems: 'center', cursor: 'pointer' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: c, display: 'inline-block', flexShrink: 0 }}></span>
                    {l}
                  </span>
                  <span style={{ fontWeight: 700 }}>{v}</span>
                </div>
              ))}
            </div>
            </>)}
          </div>

          {/* การ์ด 2: ความรุนแรง */}
          <div className="card elev-sm" style={{ padding: '18px 20px' }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 3 }}>ความรุนแรง</div>
            <div className="text-muted" style={{ fontSize: 11, marginBottom: 14 }}>จำนวนแจ้งเตือนใน{timeLabel} แยกตามระดับความรุนแรง</div>
            {totalIncidents === 0 ? (
            <div className="text-muted" style={{ textAlign: 'center', padding: '36px 0', fontSize: 12.5 }}>{apiError ? 'เชื่อมต่อ API ไม่ได้' : 'ยังไม่มีข้อมูล'}</div>
            ) : (<>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <DonutChart data={sevData} size={112} strokeWidth={20} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {sevData.map(({ color: c, label: l, value: v }) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: c, display: 'inline-block', flexShrink: 0 }}></span>
                    {l}
                  </span>
                  <span style={{ fontWeight: 700 }}>{v}</span>
                </div>
              ))}
            </div>
            </>)}
          </div>

          {/* การ์ด 3: แหล่งที่มา */}
          <div className="card elev-sm" style={{ padding: '18px 20px' }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 3 }}>แหล่งที่มา</div>
            <div className="text-muted" style={{ fontSize: 11, marginBottom: 24 }}>สัดส่วนแหล่งของทราฟฟิกที่ตรวจพบเหตุการณ์</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[
                { icon: <path d="M2 7h20M5 7V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2m3 0v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7z" />, color: '#4ade80', label: 'ภายในเครือข่าย', val: pct(scope.internal, scopeTotal) },
                { icon: <><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></>, color: '#60a5fa', label: 'ภายนอก', val: pct(scope.external, scopeTotal) },
                { icon: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></>, color: '#fb923c', label: 'ไม่ทราบ', val: pct(scope.unknown, scopeTotal) },
              ].map(({ icon, color, label, val }) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round">{icon}</svg>
                  </div>
                  <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{label}</div>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>{val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* การ์ด 4: แนวโน้ม 24 ชั่วโมง */}
          <div className="card elev-sm" style={{ padding: '18px 20px', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 3 }}>
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>แนวโน้มเหตุการณ์</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: 'var(--accent)', background: 'rgba(99,102,241,.1)', padding: '3px 8px', borderRadius: 6 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>
                พีค {barPeak} ครั้ง
              </div>
            </div>
            <div className="text-muted" style={{ fontSize: 11, marginBottom: 12 }}>จำนวนเหตุการณ์ที่ตรวจพบ แบ่ง 12 ช่วงเท่าๆ กัน ย้อนหลัง {timeLabel}</div>
            <BarChart values={barValues} />
          </div>
        </div>

        {/* ── Top-N: แหล่งโจมตี / เป้าหมาย / พอร์ต / โปรโตคอล (คลิก IP เพื่อดู Logs) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14 }}>
          <RankList title="แหล่งโจมตีสูงสุด" hint={`10 IP ต้นทางที่ก่อเหตุมากที่สุดใน${timeLabel} (คลิกเพื่อดูบันทึก)`}
            items={stats?.top_sources ?? []} onClick={(ip) => drill({ source_ip: ip })}
            emptyText={apiError ? 'เชื่อมต่อ API ไม่ได้' : 'ยังไม่มีข้อมูล'} />
          <RankList title="เป้าหมายสูงสุด" hint="IP ปลายทางที่ถูกโจมตีมากที่สุด" color="#fb923c"
            items={stats?.top_targets ?? []} emptyText="ยังไม่มีข้อมูลปลายทาง (sensor ต้องส่ง dst_ip)" />
          <RankList title="พอร์ตปลายทาง" hint="พอร์ตที่ถูกโจมตีมากที่สุด" color="#a78bfa" mono={false}
            items={stats?.top_ports ?? []} emptyText="ยังไม่มีข้อมูลพอร์ต" />
          <RankList title="โปรโตคอล" hint="สัดส่วนตามโปรโตคอลของเหตุการณ์ที่ตรวจพบ" color="#22d3ee" mono={false}
            items={stats?.by_protocol ?? []} emptyText="ยังไม่มีข้อมูลโปรโตคอล" />
        </div>

        {/* ── ตารางรายการเหตุการณ์ล่าสุด ── */}
        <div className="card elev-sm" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-soft)' }}>
                {['เวลา', 'ประเภท', 'รายละเอียด', 'แหล่งที่มา', 'ความรุนแรง', 'สถานะ'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11.5, fontWeight: 600, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {latestIncidents.length > 0 ? latestIncidents.map((item) => {
                const sevKey = getSevKey(item.confidence)
                const sev = SEV_CONFIG[sevKey]
                const status = STATUS_CONFIG[getStatus(item)]
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid var(--border-soft)', transition: 'background .15s', cursor: 'pointer' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--row-head-bg)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    onClick={() => setSelectedEvent(item)}>
                    <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: 12.5, whiteSpace: 'nowrap' }}>{relativeTimeTh(new Date(item.timestamp).getTime())}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span className={`event-model-badge ${item.model_name}`} style={{ fontSize: 12, fontWeight: 700, padding: '4px 11px', borderRadius: 999, whiteSpace: 'nowrap' }}>{item.attack_class || 'Unknown'}</span>
                    </td>
                    <td style={{ padding: '14px 16px', fontWeight: 500, color: 'var(--text)' }}>Confidence {(item.confidence * 100).toFixed(1)}% · ตรวจพบโดยโมเดล {item.model_name}</td>
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 12.5 }}>{item.source_ip}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 12.5, color: sev.color, whiteSpace: 'nowrap' }}>
                        <span style={{ width: 8, height: 8, borderRadius: 999, background: sev.color, display: 'inline-block', flexShrink: 0 }}></span>
                        {sev.label}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ background: status.bg, color: status.color, fontSize: 12, fontWeight: 600, padding: '4px 11px', borderRadius: 999, whiteSpace: 'nowrap' }}>{status.label}</span>
                    </td>
                  </tr>
                )
              }) : (
                <tr><td colSpan={6} className="text-muted" style={{ padding: '36px 16px', textAlign: 'center', fontSize: 13.5 }}>
                  {apiError ? 'เชื่อมต่อ API ไม่ได้ — ไม่สามารถโหลดเหตุการณ์' : (summaryFilter !== 'all' || q) ? 'ไม่พบเหตุการณ์ที่ตรงกับตัวกรอง' : `ยังไม่มีเหตุการณ์ใน${timeLabel}`}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {selectedEvent && <ThreatInspectModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </div>
  )
}
