// ─────────────────────────────────────────────────────────────────────────────
// utils/time.js — ฟังก์ชันช่วยแปลงเวลาเป็นภาษาไทย
// ใช้แสดงในป้าย Sidebar badge ("อัปเดตล่าสุดเมื่อ: ...")
// เพื่อบอกว่าข้อมูลล่าสุดถูกรับมานานแค่ไหนแล้ว
// ─────────────────────────────────────────────────────────────────────────────

/**
 * แปลง timestamp (milliseconds) ให้เป็นข้อความภาษาไทยแบบ relative
 * เช่น "เมื่อสักครู่", "30 วินาทีที่แล้ว", "5 นาทีที่แล้ว", "2 ชั่วโมงที่แล้ว"
 *
 * @param {number} timestamp - เวลาในหน่วย milliseconds (จาก Date.now())
 * @returns {string} ข้อความเวลาภาษาไทย
 */
export function relativeTimeTh(timestamp) {
  // ถ้าไม่มี timestamp คืนค่า '-'
  if (!timestamp) return '-'

  // คำนวณจำนวนวินาทีที่ผ่านมาตั้งแต่ timestamp นั้น
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000))

  // น้อยกว่า 8 วินาที → "เมื่อสักครู่" (ดูเป็น real-time)
  if (seconds < 8) return 'เมื่อสักครู่'

  // 8–59 วินาที → "XX วินาทีที่แล้ว"
  if (seconds < 60) return `${seconds} วินาทีที่แล้ว`

  // 1–59 นาที → "XX นาทีที่แล้ว"
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`

  // 1+ ชั่วโมง → "XX ชั่วโมงที่แล้ว"
  const hours = Math.floor(minutes / 60)
  return `${hours} ชั่วโมงที่แล้ว`
}
