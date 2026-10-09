// ─────────────────────────────────────────────────────────────────────────────
// components/MuteRules.jsx — กฎปิดเสียง alert (mute rules)
//
// ใช้ 2 ที่: หน้า Settings (กรอกเอง + รายการกฎ) และ modal ของ event (เติม IP/ประเภทจาก event ให้)
// ข้อจำกัดที่บังคับโดย backend (backend/routes/mute.py): ต้องมีวันหมดอายุ ≤ 30 วัน, ระบุ IP หรือประเภทอย่างน้อยหนึ่งอย่าง,
// กฎเฉพาะประเภท ≤ 7 วัน, ต้องใส่เหตุผล, admin เท่านั้น, ทุกการสร้าง/ลบลง audit log
// event ที่ตรงกฎยังถูกบันทึก (เห็นป้าย "ปิดเสียง" ใน Logs) แต่ไม่นับเป็น alert / ไม่ส่ง webhook
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useState } from 'react'
import { playSound } from '../utils/sound'

const INPUT = { padding: '8px 11px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: 13, fontFamily: 'inherit', minWidth: 0 }
const DAYS = [1, 3, 7, 14, 30]

async function api(path, options) {
  const res = await fetch(path, options)
  if (res.status === 401 || res.status === 403) return { ok: false, error: 'ต้องเข้าสู่ระบบด้วยบัญชี admin' }
  const d = await res.json().catch(() => ({}))
  if (res.ok) return { ok: true, data: d }
  return { ok: false, error: typeof d.detail === 'string' ? d.detail : 'ข้อมูลไม่ถูกต้อง' }
}

function fmt(ts) {
  try { return new Date(ts).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short', hour12: false }) } catch { return ts }
}

/**
 * MuteForm
 * @param {object} initial  { source_ip, attack_class } — ถ้ามี จะเป็นโหมด "จาก event" (เลือกขอบเขตได้) ไม่มี = กรอกเอง
 * @param {function} onCreated callback หลังสร้างสำเร็จ
 */
export function MuteForm({ initial, onCreated }) {
  const fromEvent = !!(initial && (initial.source_ip || initial.attack_class))
  const [scope, setScope] = useState('both')                       // both | ip | class (เฉพาะโหมดจาก event)
  const [ip, setIp] = useState(initial?.source_ip || '')
  const [cls, setCls] = useState(initial?.attack_class || '')
  const [days, setDays] = useState(7)
  const [reason, setReason] = useState('')
  const [msg, setMsg] = useState(null)                             // { ok, text }
  const [busy, setBusy] = useState(false)

  const effIp = fromEvent ? (scope === 'class' ? '' : initial.source_ip || '') : ip.trim()
  const effCls = fromEvent ? (scope === 'ip' ? '' : initial.attack_class || '') : cls.trim()
  const classOnly = !effIp && !!effCls
  const maxDays = classOnly ? 7 : 30
  const dayChoices = DAYS.filter((d) => d <= maxDays)
  const useDays = Math.min(days, maxDays)

  async function submit(e) {
    e.preventDefault()
    if (!effIp && !effCls) { setMsg({ ok: false, text: 'ระบุ IP หรือประเภทการโจมตีอย่างน้อยหนึ่งอย่าง' }); return }
    if (reason.trim().length < 3) { setMsg({ ok: false, text: 'ใส่เหตุผลอย่างน้อย 3 ตัวอักษร' }); return }
    playSound('click'); setBusy(true)
    const r = await api('/api/mute-rules', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_ip: effIp || null, attack_class: effCls || null, reason: reason.trim(), days: useDays }),
    })
    setBusy(false)
    if (r.ok) { playSound('success'); setMsg({ ok: true, text: `สร้างกฎแล้ว (หมดอายุใน ${useDays} วัน)` }); setReason(''); onCreated?.() }
    else setMsg({ ok: false, text: r.error })
  }

  return (
    <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }} aria-label="สร้างกฎปิดเสียง">
      {fromEvent ? (
        <fieldset style={{ border: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
          <legend style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>ปิดเสียงอะไร</legend>
          {[
            ['both', `${initial.source_ip} + ${initial.attack_class}`, 'เฉพาะการโจมตีประเภทนี้จากเครื่องนี้ (แนะนำ)'],
            ['ip', initial.source_ip, 'ทุกประเภทจากเครื่องนี้'],
            ['class', initial.attack_class, 'ประเภทนี้จากทุกเครื่อง — ตาบอดทั้งเครือข่าย จำกัด 7 วัน'],
          ].map(([v, label, hint]) => (
            <label key={v} style={{ display: 'flex', gap: 8, alignItems: 'baseline', fontSize: 13, cursor: 'pointer' }}>
              <input type="radio" name="mute-scope" checked={scope === v} onChange={() => setScope(v)} />
              <span><span className="mono" style={{ fontWeight: 600 }}>{label}</span> <span className="text-muted" style={{ fontSize: 12 }}>— {hint}</span></span>
            </label>
          ))}
        </fieldset>
      ) : (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input value={ip} onChange={(e) => setIp(e.target.value)} placeholder="IP เดียว เช่น 10.0.0.5 (เว้นว่าง = ทุก IP)" aria-label="IP ที่ปิดเสียง" style={{ ...INPUT, flex: '1 1 200px' }} />
          <input value={cls} onChange={(e) => setCls(e.target.value)} placeholder="ประเภท เช่น DoS (เว้นว่าง = ทุกประเภท)" aria-label="ประเภทการโจมตีที่ปิดเสียง" style={{ ...INPUT, flex: '1 1 200px' }} />
        </div>
      )}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        <label style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>นาน&nbsp;
          <select value={useDays} onChange={(e) => setDays(Number(e.target.value))} style={{ ...INPUT, padding: '7px 8px' }} aria-label="อายุกฎ (วัน)">
            {dayChoices.map((d) => <option key={d} value={d}>{d} วัน</option>)}
          </select>
        </label>
        <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="เหตุผล (จำเป็น) เช่น เครื่อง scan ภายในที่รู้จัก" maxLength={300}
          aria-label="เหตุผล" style={{ ...INPUT, flex: '1 1 220px' }} />
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? '...' : 'ปิดเสียง'}</button>
      </div>
      <div className="text-muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
        event ที่ตรงกฎยังถูกบันทึก (เห็นป้าย "ปิดเสียง" ใน Logs) แต่ไม่นับเป็น alert และไม่ส่ง webhook จนกว่ากฎจะหมดอายุหรือถูกลบ ไม่มีกฎถาวร
      </div>
      {msg && <div role="status" style={{ fontSize: 12.5, color: msg.ok ? 'var(--green)' : 'var(--red-text-mid)' }}>{msg.text}</div>}
    </form>
  )
}

/** รายการกฎที่ยังไม่หมดอายุ + ปุ่มลบ */
export function MuteRuleList({ refreshKey = 0 }) {
  const [rules, setRules] = useState(null)
  const [err, setErr] = useState('')

  async function load() {
    const r = await api('/api/mute-rules')
    if (r.ok) { setRules(r.data.data); setErr('') } else { setRules([]); setErr(r.error) }
  }
  useEffect(() => { load() }, [refreshKey])

  async function remove(id) {
    playSound('click')
    const r = await api(`/api/mute-rules/${id}`, { method: 'DELETE' })
    if (r.ok) load(); else setErr(r.error)
  }

  if (rules === null) return <div className="text-muted" style={{ fontSize: 13 }}>กำลังโหลด...</div>
  return (
    <div>
      {err && <div style={{ fontSize: 12.5, color: 'var(--red-text-mid)', marginBottom: 8 }}>{err}</div>}
      {rules.length === 0 && !err && <div className="text-muted" style={{ fontSize: 13, padding: '8px 0' }}>ไม่มีกฎที่ใช้งานอยู่ — ทุก alert ถูกนับตามปกติ</div>}
      {rules.map((r) => (
        <div key={r.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border-soft)', fontSize: 13 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div><span className="mono" style={{ fontWeight: 600 }}>{r.source_ip || 'ทุก IP'}</span> <span className="text-muted">·</span> <span style={{ fontWeight: 600 }}>{r.attack_class || 'ทุกประเภท'}</span></div>
            <div className="text-muted" style={{ fontSize: 12, overflowWrap: 'anywhere' }}>{r.reason} — โดย {r.created_by} · หมดอายุ {fmt(r.expires_at)}</div>
          </div>
          <button type="button" className="btn btn-outline btn-sm" onClick={() => remove(r.id)} aria-label={`ลบกฎ #${r.id}`}>ลบ</button>
        </div>
      ))}
    </div>
  )
}
