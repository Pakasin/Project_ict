// ─────────────────────────────────────────────────────────────────────────────
// components/ThreatInspectModal.jsx — Modal แสดงรายละเอียดภัยคุกคาม
//
// เปิดจาก: Dashboard, Incidents, Logs — เมื่อคลิก "ตรวจสอบ" / "Inspect" บนแถวเหตุการณ์
// แสดง: confidence score, attack class, model ที่ตรวจพบ, Source IP, timestamp
// Action (Admin เท่านั้น): Block & Quarantine IP, Export JSON Evidence
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect } from 'react';
import { playSound } from '../utils/sound';
import { useApp } from '../context/AppContext';

/**
 * ThreatInspectModal — Modal ตรวจสอบภัยคุกคามแบบละเอียด
 * @param {object} event   - ข้อมูล event/log ที่ต้องการตรวจสอบ (จาก API หรือ mock)
 * @param {function} onClose - callback ปิด modal
 */
export default function ThreatInspectModal({ event, onClose }) {
  const { isGeneralView } = useApp();

  // ถ้าไม่มี event (modal ยังไม่ถูกเปิด) ไม่ต้อง render อะไร
  if (!event) return null;

  // ── State ของ Modal ──
  const [quarantined, setQuarantined] = useState(false);     // IP ถูก quarantine แล้วหรือยัง
  const [actionLoading, setActionLoading] = useState(false); // loading ระหว่างกด Block IP
  const [actionMessage, setActionMessage] = useState('');    // ข้อความผลลัพธ์หลังทำ action
  const [detail, setDetail] = useState(null);                 // /api/events/{id}: event เต็ม + notes + assignee + related
  const [noteText, setNoteText] = useState('');               // ข้อความบันทึกที่กำลังพิมพ์
  const [assigneeText, setAssigneeText] = useState('');       // ผู้รับผิดชอบที่กำลังพิมพ์

  // ── รายละเอียดเต็มของ event (dst/proto/bytes, บันทึก, ผู้รับผิดชอบ, events จาก IP เดียวกัน) ──
  async function loadDetail() {
    if (!event.id) return;
    try {
      const d = await (await fetch(`/api/events/${event.id}`)).json();
      if (d.ok) { setDetail(d.data); setAssigneeText(d.data.assignee || ''); }
    } catch { /* ไม่มี detail ก็แสดงเท่าที่มี */ }
  }
  useEffect(() => { loadDetail(); }, [event.id]);

  async function postJson(url, method, body) {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (res.status === 401 || res.status === 403) { setActionMessage('ต้องเข้าสู่ระบบด้วยบัญชี admin'); return false; }
    const d = await res.json();
    if (!d.ok) setActionMessage(d.error || 'ดำเนินการไม่สำเร็จ');
    return !!d.ok;
  }

  async function handleAddNote() {
    if (isGeneralView || !noteText.trim()) return;
    playSound('click');
    if (await postJson(`/api/incidents/${event.id}/notes`, 'POST', { note: noteText })) { setNoteText(''); loadDetail(); }
  }

  async function handleAssign() {
    if (isGeneralView) return;
    playSound('click');
    if (await postJson(`/api/incidents/${event.id}/assignee`, 'PUT', { assignee: assigneeText })) { setActionMessage('บันทึกผู้รับผิดชอบแล้ว'); loadDetail(); }
  }

  const ev = detail?.event || event;   // ใช้ข้อมูลจาก API เมื่อมี (มี dst/proto/bytes) ไม่งั้นใช้ที่ส่งมา

  // ── ตรวจสอบสถานะ Quarantine จาก API (SQLite blocked_ips table) ──
  // ใช้ข้อมูลจาก Server แทน localStorage เพื่อความสอดคล้องข้ามหน้าและข้ามอุปกรณ์
  useEffect(() => {
    let cancelled = false;
    // ดึงรายการ IP ที่ถูกบล็อกทั้งหมด แล้วเช็คว่า source_ip ของ event นี้อยู่ในนั้นไหม
    fetch('/api/blocked-ips')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data.ok) {
          setQuarantined(data.data.some((row) => row.ip === event.source_ip));
        }
      })
      .catch(() => {}); // ถ้า API ล้มเหลว ให้แสดง "ยังไม่ได้ quarantine" (safe default)
    return () => { cancelled = true; }; // cleanup: ป้องกัน state update หลัง unmount
  }, [event.source_ip]);

  // ── ประเมินระดับความรุนแรง: is_alert flag หรือ confidence >= 80% ──
  const isAlert = event.is_alert || event.confidence >= 0.8;

  /**
   * handleQuarantine — บล็อก Source IP ผ่าน API แล้วอัปเดตสถานะ
   * General User ไม่สามารถทำ action นี้ได้ (isGeneralView guard)
   */
  async function handleQuarantine() {
    if (isGeneralView) return; // General User ห้ามทำ action นี้
    playSound('click');
    setActionLoading(true);
    try {
      // ส่ง POST /api/blocked-ips เพื่อเพิ่ม IP เข้า blacklist
      const res = await fetch('/api/blocked-ips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip: event.source_ip }),
      });
      const data = await res.json();
      if (data.ok) {
        setQuarantined(true);
        setActionMessage(`Source IP ${event.source_ip} quarantined across edge firewalls.`);
        playSound('success'); // เสียงสำเร็จ
      } else {
        setActionMessage('Failed to quarantine IP.');
      }
    } catch {
      setActionMessage('Failed to quarantine IP.'); // กรณี network error
    } finally {
      setActionLoading(false);
    }
  }

  /**
   * handleExportJson — Export ข้อมูล event เป็นไฟล์ JSON
   * ทุก role สามารถทำได้ เพราะเป็น read-only action
   */
  function handleExportJson() {
    playSound('click');
    // สร้าง data URL ของ JSON แล้วสร้าง <a> ชั่วคราวเพื่อ trigger download
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(detail ? { ...detail.event, assignee: detail.assignee, notes: detail.notes } : event, null, 2));
    const a = document.createElement('a');
    a.setAttribute('href', dataStr);
    a.setAttribute('download', `cybershield_event_${event.id || event.timestamp}.json`);
    document.body.appendChild(a); a.click(); a.remove();
    playSound('success');
  }

  /**
   * formatTime — แปลง timestamp เป็น string ภาษาไทย (วัน/เดือน/ปี เวลา)
   */
  function formatTime(timestamp) {
    try { return new Date(timestamp).toLocaleString('th-TH', { hour12: false }) } catch { return timestamp || 'N/A' }
  }

  return (
    // Backdrop — คลิกพื้นหลังเพื่อปิด modal
    <div className="dialog-backdrop" onClick={onClose}>
      {/* การ์ด modal — ธีม blueprint (มุมตกแต่ง) */}
      <div className="dialog card blueprint elev-lg" onClick={(e) => e.stopPropagation()}>
        {/* มุมตกแต่งสไตล์ blueprint */}
        <i className="corner tl"></i><i className="corner tr"></i><i className="corner bl"></i><i className="corner br"></i>

        {/* ── ส่วนหัว Modal: ไอคอน + หัวข้อ + เลข Ref + ปุ่มปิด ── */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* ไอคอนแสดงระดับ: "!" สีแดง = ภัยคุกคาม, "OK" สีเขียว = ปลอดภัย */}
            <div className={`modal-icon ${isAlert ? 'icon-alert' : 'icon-safe'}`}>{isAlert ? '!' : 'OK'}</div>
            <div>
              <h3 style={{ margin: 0 }}>Threat Inspection</h3>
              <span className="text-muted" style={{ fontSize: 12 }}>Ref: #{event.id || event.event_id || 'LIVE'}</span>
            </div>
          </div>
          {/* ปุ่มปิด modal */}
          <button className="modal-close-btn" onClick={() => { playSound('click'); onClose(); }}>×</button>
        </div>

        {/* ── Banner แสดง Confidence Score และ Attack Class ── */}
        {/* สีแดง = ภัยคุกคาม, สีเขียว = ปลอดภัย */}
        <div className={`risk-banner ${isAlert ? 'banner-alert' : 'banner-safe'}`}>
          <div>
            <span className="risk-value mono">{(event.confidence * 100).toFixed(1)}%</span>
            <span className="risk-label">Threat Confidence</span>
          </div>
          <div>
            <div className="risk-attack-class">{event.attack_class || 'Unknown'}</div>
            <div className="text-muted" style={{ fontSize: 12 }}>
              {/* badge ชื่อโมเดล LSTM ที่ตรวจพบ */}
              Detected by <span className={`event-model-badge ${event.model_name}`}>{event.model_name}</span> model
            </div>
          </div>
        </div>

        {/* ── Grid รายละเอียด: Source IP, Timestamp, Alert Status, Model Architecture ── */}
        <div className="modal-details-grid">
          <div className="detail-box"><span className="detail-label">Source IP</span><span className="mono">{event.source_ip}</span></div>
          <div className="detail-box"><span className="detail-label">Timestamp</span><span className="mono">{formatTime(event.timestamp)}</span></div>
          <div className="detail-box">
            <span className="detail-label">Alert Status</span>
            {/* badge แสดงระดับความเสี่ยง: HIGH PRIORITY (แดง) หรือ MONITORED (เขียว) */}
            <span className={`tag ${isAlert ? 'tag-danger' : 'tag-accent'}`} style={{ width: 'fit-content' }}>{isAlert ? 'HIGH PRIORITY' : 'MONITORED'}</span>
          </div>
          <div className="detail-box">
            <span className="detail-label">Model Architecture</span>
            <span className="mono">
              {/* แสดง dataset ที่ใช้ train model ตามชื่อโมเดล */}
              {event.model_name === 'intrusion' ? 'NSL-KDD SimpleRNN (41 feats)' :
               event.model_name === 'flow' ? 'CIC-IDS2018 LSTM v2 (52 feats)' :
               event.model_name === 'flow_rules' ? 'Rate rules (no ML model)' : 'Deep Embedding LSTM (SQLi)'}
            </span>
          </div>
        </div>

        {/* ── รายละเอียดเครือข่าย (มีเมื่อ sensor ส่ง dst/proto/bytes มา) ── */}
        {(ev.dst_ip || ev.dst_port != null || ev.protocol || ev.bytes != null || ev.sensor) && (
          <div className="modal-details-grid">
            {ev.dst_ip && <div className="detail-box"><span className="detail-label">Destination</span><span className="mono">{ev.dst_ip}{ev.dst_port != null ? `:${ev.dst_port}` : ''}</span></div>}
            {ev.protocol && <div className="detail-box"><span className="detail-label">Protocol</span><span className="mono">{ev.protocol}</span></div>}
            {ev.bytes != null && <div className="detail-box"><span className="detail-label">Bytes</span><span className="mono">{ev.bytes.toLocaleString()}</span></div>}
            {ev.sensor && <div className="detail-box"><span className="detail-label">Sensor</span><span className="mono">{ev.sensor}</span></div>}
          </div>
        )}

        {/* ── ผู้รับผิดชอบ + บันทึกของ operator ── */}
        {detail && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div className="card-title">Assignee &amp; Notes</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input value={assigneeText} onChange={(e) => setAssigneeText(e.target.value)} disabled={isGeneralView}
                placeholder="ผู้รับผิดชอบ (username)" style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border-soft)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: 13 }} />
              <button className="btn btn-secondary" onClick={handleAssign} disabled={isGeneralView}>มอบหมาย</button>
            </div>
            {detail.notes.length === 0
              ? <div className="text-muted" style={{ fontSize: 12.5 }}>ยังไม่มีบันทึก</div>
              : detail.notes.map((n) => (
                <div key={n.id} style={{ fontSize: 12.5, padding: '8px 10px', borderRadius: 8, background: 'var(--row-head-bg)' }}>
                  <div className="text-muted" style={{ fontSize: 11, marginBottom: 2 }}>{n.username} · {formatTime(n.timestamp)}</div>
                  <div style={{ whiteSpace: 'pre-wrap' }}>{n.note}</div>
                </div>
              ))}
            {!isGeneralView && (
              <div style={{ display: 'flex', gap: 8 }}>
                <input value={noteText} onChange={(e) => setNoteText(e.target.value)} maxLength={2000}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleAddNote(); }}
                  placeholder="เพิ่มบันทึก..." style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid var(--border-soft)', background: 'var(--card-bg)', color: 'var(--text)', fontSize: 13 }} />
                <button className="btn btn-secondary" onClick={handleAddNote} disabled={!noteText.trim()}>เพิ่ม</button>
              </div>
            )}
          </div>
        )}

        {/* ── เหตุการณ์อื่นจาก Source IP เดียวกัน ── */}
        {detail && detail.related.length > 0 && (
          <div>
            <div className="card-title" style={{ marginBottom: 'var(--space-2)' }}>เหตุการณ์อื่นจาก {ev.source_ip} ({detail.related.length})</div>
            <div style={{ maxHeight: 130, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
              {detail.related.map((r) => (
                <div key={r.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, gap: 10 }}>
                  <span className="mono">EVT-{r.id}</span>
                  <span style={{ flex: 1 }}>{r.attack_class}</span>
                  <span className="text-muted">{(r.confidence * 100).toFixed(0)}%</span>
                  <span className="text-muted">{formatTime(r.timestamp)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── ส่วน Actions: Block & Quarantine IP, Export JSON ── */}
        <div>
          <div className="card-title" style={{ marginBottom: 'var(--space-2)' }}>Active Containment &amp; Actions</div>
          {/* แสดงข้อความผลลัพธ์หลังจากทำ action */}
          {actionMessage && <div className="action-feedback">{actionMessage}</div>}
          <div className="action-buttons-group">
            {/* Block & Quarantine IP — General User เห็นแต่ปุ่ม disabled + tooltip ไทย */}
            <button
              className={`btn ${quarantined ? 'btn-secondary' : 'btn-danger'}`}
              onClick={handleQuarantine}
              disabled={quarantined || actionLoading || isGeneralView}
              title={isGeneralView ? 'คุณไม่มีสิทธิ์ดำเนินการนี้' : undefined}
              style={isGeneralView ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
            >
              {actionLoading ? '...' : quarantined ? 'IP Quarantined' : `Block & Quarantine ${event.source_ip}`}
            </button>
            {/* Export JSON — ทุก role ทำได้ เป็นการ export ข้อมูลเพื่อการสืบสวน */}
            <button className="btn btn-secondary" onClick={handleExportJson}>Export JSON Evidence</button>
          </div>
        </div>
      </div>
    </div>
  );
}
