// ─────────────────────────────────────────────────────────────────────────────
// pages/Dashboard.jsx — หน้าหลัก (Dashboard) ภาพรวมความปลอดภัย
//
// ประกอบด้วย:
//   - Stat Cards: สถานะระบบ, จำนวนเหตุการณ์, แจ้งเตือนวิกฤต, แก้ไขแล้ว
//   - Network Chart: กราฟความเร็วแพ็กเก็ตเครือข่ายแบบ real-time (SVG line chart พร้อมกราฟ 3 เส้น)
//   - Summary Table: รายการเหตุการณ์ล่าสุดจาก API (ใช้ mock ถ้ายังไม่มีข้อมูล)
//   - Donut Chart: สัดส่วนระดับความรุนแรง + Bar Chart: การแจ้งเตือนรายสัปดาห์
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState, useRef } from 'react'
import InfoHelp from '../components/InfoHelp'
import ThreatInspectModal from '../components/ThreatInspectModal'
import { useApp } from '../context/AppContext'
import { relativeTimeTh } from '../utils/time'

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
  const MAX = Math.max(...values)
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
 * (ข้อมูลใน popover เป็น static demo — ใน production ให้ดึงจาก notification API)
 */
function BellButton() {
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
        <span style={{ position: 'absolute', top: 6, right: 6, width: 7, height: 7, borderRadius: 999, background: '#f87171', border: '2px solid var(--card-bg)' }}></span>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: 'var(--card-bg)', border: '1px solid var(--border-soft)', borderRadius: 12, boxShadow: 'var(--shadow)', zIndex: 99, width: 340, padding: '14px 16px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: 'rgba(251,191,36,.12)', color: '#fbbf24', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          </div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.4 }}>
              พบพฤติกรรมการเข้าสู่ระบบที่ผิดปกติ
            </div>
            <div className="text-muted" style={{ fontSize: 12, marginTop: 3 }}>
              Suspicious Activity (srv-auth-07, 198.51.100.4)
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { t } = useApp()

  // ── ข้อมูลสำหรับกราฟเครือข่าย Real-time SVG Line Chart ───────────────────────────
  const CHART_BUCKETS = 26   // ⚡ จำนวน data point ในกราฟ (ยิ่งมาก = กราฟทอดยาวขึ้น)
  const BUCKET_MS = 2000     // ⚡ อัปเดตทุก 2 วินาที (ลด = เร็ว, เพิ่ม = ช้า)

  // ฟังก์ชันสร้างข้อมูลเริ่มต้นแบบสุ่ม (base = ค่าเฉลี่ย, vol = ความสั่น)
  const generateInitialSeries = (base, vol) => Array(CHART_BUCKETS).fill(0).map(() => Math.max(0, base + (Math.random() * vol - vol / 2)))

  // สาม series: แต่ละตัวคือ sliding window ของ CHART_BUCKETS ค่า
  // ⚡ แก้ค่า base → เส้นสูง/ต่ำลง, แก้ vol → สั่นมาก/น้อย
  const [safeHistory,   setSafeHistory]   = useState(() => generateInitialSeries(1800, 400)) // เส้นเขียว (ทราฟฟิกปกติ)
  const [threatHistory, setThreatHistory] = useState(() => generateInitialSeries(200,  100))  // เส้นแดง (ภัยคุกคาม)
  const [watchHistory,  setWatchHistory]  = useState(() => generateInitialSeries(60,   40))   // เส้นส้ม (เฝ้าระวัง)

  // เลื่อนกราฟทุก BUCKET_MS — ตัดค่าแรกออกแล้วเพิ่มค่าใหม่ด้านขวา
  useEffect(() => {
    const interval = setInterval(() => {
      // safe: ค่าเฉลี่ย 1800, สั่น +-200 ต่อ step, ต่ำสุด 1000 pps
      setSafeHistory(prev   => [...prev.slice(1), Math.max(1000, prev[prev.length - 1] + (Math.random() * 400 - 200))])
      // threat: ค่าเฉลี่ย 200, สั่น +-75 ต่อ step, ต่ำสุด 0
      setThreatHistory(prev => [...prev.slice(1), Math.max(0,    prev[prev.length - 1] + (Math.random() * 150 - 75))])
      // watch: ค่าเฉลี่ย 60, สั่น +-30 ต่อ step, ต่ำสุด 0
      setWatchHistory(prev  => [...prev.slice(1), Math.max(0,    prev[prev.length - 1] + (Math.random() * 60 - 30))])
    }, BUCKET_MS)
    return () => clearInterval(interval)  // cleanup: หยุด interval เมื่อ component unmount
  }, [])

  // ── คำนวณสำหรับ SVG Line Chart ───────────────────────────────────────────────
  const chartW = 640, chartH = 148  // ขนาด SVG canvas (px) — ยืดด้วย CSS preserveAspectRatio
  const maxVal = 4000               // ⚡ ค่าสูงสุดของแกน Y (pps) — แก้เพื่อปรับสเกลกราฟ
  const stepX = chartW / (CHART_BUCKETS - 1)  // ระยะห่างแนวนอนแต่ละจุดในกราฟ (px)

  // เปลี่ยน array ค่า → SVG path string (M x,y L x,y ...)
  const createPath = (data) => data
    .map((v, i) => [i * stepX, chartH - (v / maxVal) * chartH])  // ค่า → พิกัด x,y
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
    .join(' ')

  const safePath    = createPath(safeHistory)    // เส้นเขียว (ปกติ)
  const safeAreaPath = `${safePath} L${chartW},${chartH} L0,${chartH} Z`  // พื้นที่ใต้เส้น (gradient fill)
  const threatPath  = createPath(threatHistory)  // เส้นแดง (ภัยคุกคาม)
  const watchPath   = createPath(watchHistory)   // เส้นส้ม (เฝ้าระวัง)

  // เส้นแนวนอนแนวตั้ง Y (gridlines): 0%, 25%, 50%, 75%, 100% ของ maxVal
  const gridLines = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    y: chartH * f,
    label: f === 1 ? '0' : Math.round(maxVal * (1 - f) / 1000) + 'K'  // label: 4K, 3K, 2K, 1K, 0
  }))

  // คำนวณพิกัด (x, y) ทุกจุดในแต่ละ series (ใช้วาง dot ที่โคนสุด)
  const safePoints   = safeHistory.map((v, i)   => [i * stepX, chartH - (v / maxVal) * chartH])
  const threatPoints = threatHistory.map((v, i) => [i * stepX, chartH - (v / maxVal) * chartH])
  const watchPoints  = watchHistory.map((v, i)  => [i * stepX, chartH - (v / maxVal) * chartH])

  // จุดสุดท้ายของแต่ละเส้น — ใช้วาง dot เอา circle ไว้ที่ปลายเส้นด้านขวา
  const [lastSafeX,   lastSafeY]   = safePoints[safePoints.length - 1]
  const [lastThreatX, lastThreatY] = threatPoints[threatPoints.length - 1]
  const [lastWatchX,  lastWatchY]  = watchPoints[watchPoints.length - 1]

  // ── State Dropdown (ช่วงเวลา, หน่วยวัด, filter สรุป) ────────────────────────────
  // ⚡ เพิ่ม/ลบตัวเลือกใน Dropdown → ปาก dropdown เปลี่ยนทันที
  const [timeRange,     setTimeRange]     = useState('24h')  // ช่วงเวลาที่เลือก
  const [unitKey,       setUnitKey]       = useState('pps')  // หน่วยวัดกราฟ
  const [summaryFilter, setSummaryFilter] = useState('all')  // ตัวกรองตารางสรุป

  const TIME_OPTIONS   = [{ key: '1h', label: '1 ชั่วโมง' }, { key: '24h', label: '24 ชั่วโมง' }, { key: '7d', label: '7 วัน' }, { key: '30d', label: '30 วัน' }]
  const UNIT_OPTIONS   = [{ key: 'pps', label: 'pps (แพ็กเก็ต/วินาที)' }, { key: 'bps', label: 'bps (กิโล/วินาที)' }, { key: 'count', label: 'จำนวนแพ็กเก็ตรวม' }]
  const FILTER_OPTIONS = [{ key: 'all', label: 'ทั้งหมด' }, { key: 'critical', label: 'วิกฤต' }, { key: 'high', label: 'สูง' }, { key: 'medium', label: 'ปานกลาง' }, { key: 'low', label: 'ต่ำ' }]

  // ดึง label ปัจจุบันจาก state เพื่อแสดงในปุ่ม Dropdown
  const summaryLabel = FILTER_OPTIONS.find(o => o.key === summaryFilter)?.label || 'ทั้งหมด'
  const timeLabel    = TIME_OPTIONS.find(o => o.key === timeRange)?.label || '24 ชั่วโมง'
  const unitLabel    = UNIT_OPTIONS.find(o => o.key === unitKey)?.label || 'pps (แพ็กเก็ต/วินาที)'

  // ── Fallback Data (ข้อมูลเอีย เมื่อ API ยังไม่มีข้อมูล) ─────────────────────────────────
  // ⚡ แก้ข้อมูลที่นี่ → ตารางด้านล่างเปลี่ยนทันที (เมื่อ API ยังไม่มีข้อมูล)
  const FALLBACK_INCIDENTS = [
    { time: '2 วินาทีที่แล้ว', type: 'SQL Injection', desc: 'ตรวจพบ SQL Injection attempt on login endpoint', source: '192.168.1.45', target: 'srv-db-01', sevColor: '#f87171', sev: 'วิกฤต', statusBg: 'rgba(34,197,94,.12)', statusColor: '#4ade80', status: 'แก้ไขแล้ว' },
    { time: '5 นาทีที่แล้ว',  type: 'Brute Force',   desc: 'Multiple failed login attempts detected', source: '45.33.22.11', target: 'srv-web-02', sevColor: '#fb923c', sev: 'สูง', statusBg: 'rgba(234,179,8,.12)', statusColor: '#fbbf24', status: 'กำลังตรวจสอบ' },
    { time: '12 นาทีที่แล้ว', type: 'Port Scan',    desc: 'Sequential port scanning detected on DMZ', source: '112.54.33.2', target: 'dmz-fw-01', sevColor: '#fbbf24', sev: 'ปานกลาง', statusBg: 'rgba(148,163,184,.1)', statusColor: '#94a3b8', status: 'บล็อกแล้ว' },
  ]

  // ── ดึงข้อมูลจริงจาก Backend (API) ─────────────────────────────────────────────
  const [incidents,    setIncidents]    = useState([])    // events จาก /api/logs (alert only)
  const [statusMap,    setStatusMap]    = useState({})    // { event_id: 'OPEN'|'INVESTIGATING'|'MITIGATED' }
  const [selectedEvent, setSelectedEvent] = useState(null) // event ที่คลิกเปิด ThreatInspectModal

  useEffect(() => {
    fetchIncidents()  // ดึง events ที่เป็น alert
    fetchStatuses()   // ดึง triage status ของแต่ละ event
  }, [])

  // ดึง alert events 200 รายการล่าสุด
  async function fetchIncidents() {
    try {
      const res = await fetch('/api/logs?limit=200&alerts_only=true')
      const data = await res.json()
      if (data.ok) setIncidents(data.data)
    } catch { /* ถ้า fetch ไม่เสร็จ ใช้ FALLBACK_INCIDENTS ได้เลย */ }
  }

  // ดึง triage status ของทุก event จาก incident_status
  async function fetchStatuses() {
    try {
      const res = await fetch('/api/incidents/statuses')
      const data = await res.json()
      if (data.ok) setStatusMap(data.data)  // data.data = { "1": "MITIGATED", ... }
    } catch { }
  }

  // ดึงสถานะของ event หนึ่ง — ถ้าไม่มีใน statusMap ใช้ 'OPEN' เป็นค่าเริ่มต้น
  function getStatus(item) { return statusMap[item.id] || 'OPEN' }

  // ── คำนวณตัวเลขสำหรับ Stat Cards ───────────────────────────────────────────
  const hasRealIncidents = incidents.length > 0  // true = มีข้อมูลจาก API

  // ⚡ ตัวเลข Stat Cards: ถ้ามี API ใช้สด — ถ้าไม่มีใช้ตัวเลข fallback นี้
  const totalIncidents    = hasRealIncidents ? incidents.length : 7
  const criticalIncidents = hasRealIncidents
    ? incidents.filter(i => getSevKey(i.confidence) === 'CRITICAL').length
    : 3  // ตัวเลขสำรอง
  const resolvedIncidents = hasRealIncidents
    ? incidents.filter(i => getStatus(i) === 'MITIGATED').length
    : 12  // ตัวเลขสำรอง

  // เรียงจากใหม่ → เก่า และเอา 5 อันดับแรกเพื่อแสดงในตาราง
  const latestIncidents = [...incidents]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 5)

  // ── Style helper: Dropdown trigger button (pill shape) ───────────────────────────
  // ใช้กับ spread operator: {...pillBtn(), extraStyle} เพื่อ override บางค่า
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
          <h2 style={{ margin: '0 0 4px', fontSize: 24, fontWeight: 800 }}>ยินดีต้อนรับกลับ, admin 👋</h2>
          <p className="text-muted" style={{ margin: 0, fontSize: 13.5 }}>ภาพรวมสถานะความปลอดภัยของระบบและกิจกรรมล่าสุด</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* ช่องค้นหา */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 10, border: '1px solid var(--border-soft)', background: 'var(--card-bg)', width: 260 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input placeholder="ค้นหา IP, เหตุการณ์, หรือตั้งต่างๆ..." style={{ border: 'none', background: 'transparent', color: 'var(--text)', fontSize: 13, outline: 'none', width: '100%' }} />
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

          {/* ปุ่มกระดิ่งแจ้งเตือน */}
          <BellButton />
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
          <div style={{ fontSize: 22, fontWeight: 800, color: '#4ade80' }}>ปลอดภัย</div>
          <div className="text-muted" style={{ fontSize: 11.5, marginTop: 5 }}>ทุกระบบทำงานปกติ</div>
        </div>

        {/* เหตุการณ์ทั้งหมด */}
        <div className="card elev-sm" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
            เหตุการณ์ทั้งหมด
          </div>
          <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)' }}>{totalIncidents}</div>
          <div className="text-muted" style={{ fontSize: 11.5, marginTop: 5 }}>เหตุการณ์ที่ต้องติดตาม</div>
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
          <div className="text-muted" style={{ fontSize: 11.5, marginTop: 5 }}>ใน 24 ชั่วโมง</div>
        </div>

        {/* สถานะโดยรวม */}
        <div className="card elev-sm" style={{ padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fb923c" strokeWidth="2"><path d="M20.42 4.58a5.4 5.4 0 0 0-7.65 0l-.77.78-.77-.78a5.4 5.4 0 0 0-7.65 0C1.46 6.7 1.33 10.28 4 13l8 8 8-8c2.67-2.72 2.54-6.3.42-8.42z"></path></svg>
            สถานะโดยรวม
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#4ade80' }}>ออนไลน์</div>
          <div className="text-muted" style={{ fontSize: 11.5, marginTop: 5 }}>พร้อมใช้งาน</div>
        </div>
      </div>

      {/* ── กราฟเครือข่ายหลัก ── */}
      <div className="card elev-sm" style={{ padding: '20px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14.5, display: 'flex', alignItems: 'center', gap: 7 }}>
              ความเร็วแพ็กเก็ตเครือข่ายแบบสด <InfoHelp id="packetSpeed" />
            </div>
            <div className="text-muted" style={{ fontSize: 11.5, marginTop: 3 }}>ปริมาณทราฟฟิกเครือข่ายย้อนหลัง 24 ชั่วโมง แยกตามระดับความเสี่ยงที่ตรวจพบ</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {/* คำอธิบายสีกราฟ (Legend) */}
            {[['#4ade80', 'ปกติ / ไม่เป็นภัย'], ['#f87171', 'ภัยคุกคาม'], ['#fb923c', 'เฝ้าระวัง']].map(([color, label]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>
                <span style={{ width: 8, height: 8, borderRadius: 999, background: color, display: 'inline-block' }}></span>
                {label}
              </div>
            ))}
            {/* Dropdown เลือกหน่วยวัด */}
            <Dropdown
              selectedKey={unitKey}
              items={UNIT_OPTIONS}
              onSelect={setUnitKey}
              trigger={(open) => (
                <button style={{ ...pillBtn(), fontSize: 12, padding: '6px 12px' }}>
                  {unitLabel}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: open ? 'rotate(180deg)' : '', transition: 'transform .2s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
              )}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', paddingBottom: 20, width: 28, textAlign: 'right' }}>
            {gridLines.map((g, i) => <span key={i} style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>{g.label}</span>)}
          </div>
          <div style={{ flex: 1 }}>
            <svg width="100%" height="148" viewBox={`0 0 ${chartW} ${chartH}`} style={{ display: 'block' }} preserveAspectRatio="none">
              <defs>
                <linearGradient id="safeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#4ade80" stopOpacity="0.15" />
                  <stop offset="100%" stopColor="#4ade80" stopOpacity="0" />
                </linearGradient>
              </defs>
              {gridLines.map((g, i) => <line key={i} x1="0" y1={g.y} x2={chartW} y2={g.y} stroke="var(--border-soft)" strokeWidth="1" />)}
              <path d={safeAreaPath} fill="url(#safeGrad)" stroke="none" />
              <path d={safePath} fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'd 0.4s ease-out' }} />
              <path d={watchPath} fill="none" stroke="#fb923c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'd 0.4s ease-out' }} />
              <path d={threatPath} fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'd 0.4s ease-out' }} />
              <circle cx={lastSafeX} cy={lastSafeY} r="3" fill="#4ade80" />
              <circle cx={lastWatchX} cy={lastWatchY} r="3" fill="#fb923c" />
              <circle cx={lastThreatX} cy={lastThreatY} r="3" fill="#f87171" />
            </svg>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
              {['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'].map(t => (
                <span key={t} style={{ fontSize: 10.5, color: 'var(--text-tertiary)' }}>{t}</span>
              ))}
            </div>
          </div>
        </div>
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
            <div className="text-muted" style={{ fontSize: 11, marginBottom: 14 }}>สัดส่วนเหตุการณ์ที่ตรวจพบวันนี้ แยกตามประเภทการโจมตีโจมตี</div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <DonutChart data={[
                { value: 34, color: '#6366f1', label: 'DoS' },
                { value: 28, color: '#22d3ee', label: 'Intrusion' },
                { value: 20, color: '#f97316', label: 'Brute Force' },
                { value: 10, color: '#f43f5e', label: 'SQL Injection' },
                { value: 8,  color: '#a78bfa', label: 'อื่นๆ' },
              ]} size={112} strokeWidth={20} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[['#6366f1', 'DoS', '34%'], ['#22d3ee', 'Intrusion', '28%'], ['#f97316', 'Brute Force', '20%'], ['#f43f5e', 'SQL Injection', '10%'], ['#a78bfa', 'อื่นๆ', '8%']].map(([c, l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: c, display: 'inline-block', flexShrink: 0 }}></span>
                    {l}
                  </span>
                  <span style={{ fontWeight: 700 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* การ์ด 2: ความรุนแรง */}
          <div className="card elev-sm" style={{ padding: '18px 20px' }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 3 }}>ความรุนแรง</div>
            <div className="text-muted" style={{ fontSize: 11, marginBottom: 14 }}>จำนวนเหตุการณ์ที่เปิดอยู่ แยกตามระดับความรุนแรง</div>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
              <DonutChart data={[
                { value: 3,  color: '#f43f5e', label: 'วิกฤต' },
                { value: 8,  color: '#f97316', label: 'สูง' },
                { value: 15, color: '#eab308', label: 'ปานกลาง' },
                { value: 23, color: '#22c55e', label: 'ต่ำ' },
              ]} size={112} strokeWidth={20} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[['#f43f5e', 'วิกฤต', 3], ['#f97316', 'สูง', 8], ['#eab308', 'ปานกลาง', 15], ['#22c55e', 'ต่ำ', 23]].map(([c, l, v]) => (
                <div key={l} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, alignItems: 'center' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <span style={{ width: 9, height: 9, borderRadius: 3, background: c, display: 'inline-block', flexShrink: 0 }}></span>
                    {l}
                  </span>
                  <span style={{ fontWeight: 700 }}>{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* การ์ด 3: แหล่งที่มา */}
          <div className="card elev-sm" style={{ padding: '18px 20px' }}>
            <div style={{ fontWeight: 700, fontSize: 13.5, marginBottom: 3 }}>แหล่งที่มา</div>
            <div className="text-muted" style={{ fontSize: 11, marginBottom: 24 }}>สัดส่วนแหล่งของทราฟฟิกที่ตรวจพบเหตุการณ์</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {[
                { icon: <path d="M2 7h20M5 7V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2m3 0v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7z" />, color: '#4ade80', label: 'ภายในเครือข่าย', val: '45%' },
                { icon: <><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></>, color: '#60a5fa', label: 'ภายนอก', val: '35%' },
                { icon: <><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></>, color: '#fb923c', label: 'ไม่ทราบ', val: '20%' },
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
              <div style={{ fontWeight: 700, fontSize: 13.5 }}>แนวโน้ม 24 ชั่วโมง</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 700, color: 'var(--accent)', background: 'rgba(99,102,241,.1)', padding: '3px 8px', borderRadius: 6 }}>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline><polyline points="16 7 22 7 22 13"></polyline></svg>
                พีค 42 ครั้ง
              </div>
            </div>
            <div className="text-muted" style={{ fontSize: 11, marginBottom: 12 }}>จำนวนเหตุการณ์ที่ตรวจพบต่อช่วง 2 ชั่วโมง ย้อนหลัง 24 ชั่วโมง</div>
            <BarChart values={[12, 18, 14, 28, 16, 22, 18, 38, 42, 34, 26, 32]} />
          </div>
        </div>

        {/* ── ตารางรายการเหตุการณ์ล่าสุด ── */}
        <div className="card elev-sm" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-soft)' }}>
                {['เวลา', 'ประเภท', 'รายละเอียด', 'แหล่งที่มา', 'เป้าหมาย', 'ความรุนแรง', 'สถานะ'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 11.5, fontWeight: 600, color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {hasRealIncidents ? latestIncidents.map((item) => {
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
                    <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 12.5, color: 'var(--text-tertiary)' }}>—</td>
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
              }) : FALLBACK_INCIDENTS.map((ev, i) => (
                <tr key={i} style={{ borderBottom: i < FALLBACK_INCIDENTS.length - 1 ? '1px solid var(--border-soft)' : 'none', transition: 'background .15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--row-head-bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: 12.5, whiteSpace: 'nowrap' }}>{ev.time}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ background: 'var(--gray-chip-bg)', color: 'var(--text-secondary)', fontSize: 12, fontWeight: 700, padding: '4px 11px', borderRadius: 999, whiteSpace: 'nowrap' }}>{ev.type}</span>
                  </td>
                  <td style={{ padding: '14px 16px', fontWeight: 500, color: 'var(--text)' }}>{ev.desc}</td>
                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 12.5 }}>{ev.source}</td>
                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 12.5 }}>{ev.target}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 12.5, color: ev.sevColor, whiteSpace: 'nowrap' }}>
                      <span style={{ width: 8, height: 8, borderRadius: 999, background: ev.sevColor, display: 'inline-block', flexShrink: 0 }}></span>
                      {ev.sev}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ background: ev.statusBg, color: ev.statusColor, fontSize: 12, fontWeight: 600, padding: '4px 11px', borderRadius: 999, whiteSpace: 'nowrap' }}>{ev.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {selectedEvent && <ThreatInspectModal event={selectedEvent} onClose={() => setSelectedEvent(null)} />}
    </div>
  )
}
