# เอกสารสรุป Frontend — CyberShield

เอกสารนี้อธิบายโค้ด React ทั้งหมดใน `frontend/src/` แบบละเอียด ครอบคลุมทุกไฟล์ ทุก state, ref, prop, ฟังก์ชัน, ค่าคงที่ (constant) และตัวแปรที่คำนวณระหว่าง render เพื่อให้ผู้ที่ไม่เคยอ่านโค้ดนี้มาก่อนเข้าใจการทำงานได้ทันที

> Stack: React 18 + React Router v6 (`BrowserRouter`), ไม่มี state library ภายนอก (ใช้ `Context API` ของ React เอง), เชื่อมต่อ backend ผ่าน `fetch()` (REST) และ `WebSocket` (`/ws/feed`)

## โครงสร้างไฟล์

```
frontend/src/
├── main.jsx                          จุดเริ่มต้นแอป (ReactDOM root)
├── App.jsx                           Router หลัก + AppShell (sidebar/layout) + auth state
├── index.css                         Design tokens (CSS custom properties) + ทุก class
├── context/
│   └── AppContext.jsx                Global state: theme, lang, preview role, help popover
├── i18n/
│   └── strings.js                    ข้อความสองภาษา (th/en) แบบ nested object
├── utils/
│   └── sound.js                      สังเคราะห์เสียงด้วย Web Audio API (ไม่มีไฟล์เสียงจริง)
├── components/
│   ├── AccessDeniedModal.jsx         Modal เตือนเมื่อ General User เข้าหน้า admin-only
│   ├── InfoHelp.jsx                  ปุ่ม "!" popover คำอธิบายศัพท์ (ใช้ทั่วทั้งแอป)
│   └── ThreatInspectModal.jsx        Modal แสดงรายละเอียด event + ปุ่ม quarantine/export
└── pages/
    ├── Dashboard.jsx                 หน้าแรก: live feed, กราฟ pps, สรุปสถิติ, admin panel
    ├── Analytics.jsx                 กราฟ distribution การโจมตี + ตาราง MITRE ATT&CK
    ├── Incidents.jsx                 คิวเหตุการณ์ที่ต้องจัดการ (admin) + audit log
    ├── Logs.jsx                      ตาราง log ทั้งหมด (filter/sort/export CSV-JSON)
    ├── Login.jsx                     หน้า sign in / sign up
    ├── Settings.jsx                  ตั้งค่า: profile, general, audio, display, role, firewall
    └── Test.jsx                      ทดสอบโมเดลด้วยมือ (SQLi / Intrusion / Flow)
```

การไหลของข้อมูล (frontend เท่านั้น): ทุกหน้าที่แสดง event สด (`Dashboard`) เปิด `WebSocket` ไปที่ `/ws/feed`; หน้าที่ต้องการข้อมูลย้อนหลัง (`Analytics`, `Incidents`, `Logs`) เรียก `GET /api/logs`; การกระทำที่เปลี่ยนสถานะ (`Incidents`, `Settings` firewall) เรียก `PATCH`/`POST`/`DELETE` ไปยัง FastAPI backend

---

## 1. `main.jsx`

จุดเริ่มต้นของแอป ไม่มี state ของตัวเอง

| รายการ | ชนิด | คำอธิบาย |
|---|---|---|
| `ReactDOM.createRoot(...)` | call | เมานต์แอปที่ `<div id="root">` ใน `index.html` |
| `<React.StrictMode>` | wrapper | เปิดโหมดตรวจสอบข้อผิดพลาดของ React (dev only, render ซ้ำ 2 ครั้ง) |
| `<BrowserRouter>` | wrapper | เปิดใช้ routing แบบ HTML5 history API (ไม่ใช่ hash) |

---

## 2. `App.jsx`

ไฟล์นี้มี 3 component: `AppShell` (sidebar + layout หลัก), `App` (default export, จัดการ auth), `ThemedRoot` (ครอบ theme)

### ค่าคงที่ระดับโมดูล

| ชื่อ | ค่า/ชนิด | คำอธิบาย |
|---|---|---|
| `ADMIN_ONLY_PATHS` | `['/analytics', '/incidents', '/logs']` | รายการเส้นทางที่ General User ห้ามเข้า ใช้เทียบกับ `location.pathname` เพื่อ guard route ทั้งตอนพิมพ์ URL ตรงๆ และตอน admin สลับไป preview general ระหว่างอยู่หน้านั้น |
| `ICONS` | object `{dashboard, analytics, incidents, logs, manualTest, settings}` | เก็บ SVG path data (`d` attribute) ของไอคอนแต่ละเมนูใน sidebar |

### `Icon({ d, size = 17 })`
คอมโพเนนต์เล็กสำหรับ render `<svg><path></svg>` — `d` คือ path data, `size` (default 17) กำหนดความกว้าง/สูง

### `AppShell({ auth, onLogout })`
Component หลักที่แสดง sidebar + เนื้อหาแต่ละหน้า (แสดงหลัง login สำเร็จเท่านั้น)

**ค่าที่ดึงจาก Context (`useApp()`):**
| ชื่อ | คำอธิบาย |
|---|---|
| `t` | dictionary ข้อความภาษาปัจจุบัน (จาก `STR[lang]`) |
| `previewAsGeneral` | boolean — admin กำลังดูตัวอย่างในมุมมอง General User หรือไม่ |
| `setPreviewAsGeneral` | setter ของค่าด้านบน |
| `isAdminActual` | boolean — บัญชีที่ล็อกอินจริงเป็น admin หรือไม่ (ไม่ขึ้นกับ preview) |
| `isGeneralView` | boolean — มุมมองปัจจุบันควรถูกจำกัดสิทธิ์แบบ General User หรือไม่ (จริงหรือกำลัง preview) |
| `setAccessDeniedOpen` | setter เปิด modal "ไม่มีสิทธิ์เข้าถึง" |

**State ภายใน:**
| ตัวแปร | ค่าเริ่มต้น | คำอธิบาย |
|---|---|---|
| `defcon` | `5` | ระดับ DEFCON ปัจจุบัน (1=วิกฤตสุด, 5=ปกติ) แสดงในแถบสถานะ sidebar; ลดเมื่อมี alert เข้ามาทาง WebSocket แล้วค่อยๆ ไต่กลับขึ้น |
| `activeAlertsCount` | `0` | จำนวน alert ที่กำลังแสดง badge (สูงสุด 99) เพิ่มเมื่อ WS ส่ง event ที่เป็น alert, ลดอัตโนมัติหลัง 15 วินาที |
| `viewMenuOpen` | `false` | เปิด/ปิดเมนู dropdown สลับมุมมอง Admin/General (view-switcher) |

**Refs:**
| ตัวแปร | คำอธิบาย |
|---|---|
| `wsRef` | เก็บ instance ของ `WebSocket` (`/ws/feed`) เพื่อปิดตอน unmount และเชื่อมต่อใหม่ได้ |
| `viewSwitcherRef` | เก็บ DOM node ของ dropdown สลับมุมมอง ใช้เช็คคลิกนอกกล่องเพื่อปิดเมนู |

**ตัวแปรอื่นจาก hook:**
| ตัวแปร | คำอธิบาย |
|---|---|
| `location` | จาก `useLocation()` — ใช้เช็ค `location.pathname` เทียบกับ `ADMIN_ONLY_PATHS` |
| `navigate` | จาก `useNavigate()` — ใช้เปลี่ยนหน้าไป `/` เมื่อปิด modal access-denied |
| `roleColor` | ค่าคงที่ `'var(--color-neutral-600)'` — สีของ label บทบาทผู้ใช้ใน sidebar footer |

**Effects (`useEffect`):**
1. **เชื่อมต่อ WebSocket ตอนโหลด** — เรียก `connectGlobalWebSocket()` ครั้งเดียว, cleanup ปิด `wsRef.current`
2. **Guard route admin-only** — เมื่อ `isGeneralView` หรือ `location.pathname` เปลี่ยน ถ้าอยู่ในหน้า admin-only ขณะเป็น general view → เปิด modal access-denied
3. **ปิด dropdown เมื่อคลิกนอกกล่อง/กด Escape** — ผูก/ถอด listener `mousedown`/`keydown` เฉพาะตอน `viewMenuOpen === true`

**ฟังก์ชัน:**
- `dismissAccessDenied()` — ปิด modal แล้ว `navigate('/')`
- `connectGlobalWebSocket()` — เปิด `WebSocket` ไปที่ `${ws|wss}://<host>/ws/feed`
  - `protocol` (ตัวแปรภายใน) — เลือก `wss:` ถ้าเพจเป็น https, ไม่งั้น `ws:`
  - `ws.onmessage`: parse JSON, ข้าม `type === 'ping'`; ถ้า `data.is_alert` หรือ `confidence >= 0.82` → เพิ่ม `activeAlertsCount`, ปรับ `defcon` (2 ถ้า confidence ≥0.92 พร้อมเสียง `critical`, ไม่งั้น 3 พร้อมเสียง `alert`), ตั้ง `setTimeout` 15 วิ ลด count และไต่ `defcon` กลับ (2→3→4→5)
  - `ws.onclose`: reconnect อัตโนมัติหลัง 4 วินาที (`setTimeout(connectGlobalWebSocket, 4000)`)

**JSX ที่น่าสนใจ:**
- Sidebar แสดงเมนู `Dashboard` เสมอ, เมนู `Analytics/Incidents/Logs` แสดงเฉพาะ `!isGeneralView`, เมนู `Manual Test`/`Settings` แสดงเสมอ
- แถว `nav-alert-pill` แสดง `activeAlertsCount` ข้างเมนู Incidents ถ้า > 0
- View-switcher (สลับ Admin ↔ General preview) แสดงเฉพาะเมื่อ `isAdminActual === true`
- `sidebar-user`: แสดงตัวอักษรแรกของ `auth.user` เป็น avatar, ชื่อเต็มจาก `auth.profile.name + lastname` (fallback เป็น `auth.user`), และ `auth.role`
- `<Routes>`: แม็ป path ไปยัง page component แต่ละตัว — เฉพาะ `Dashboard` ที่รับ prop `activeAlertsCount`

### `App()` (default export)

Component บนสุด จัดการสถานะ authentication และสลับระหว่าง `Login` กับ `AppShell`

**State:**
| ตัวแปร | ค่าเริ่มต้น | คำอธิบาย |
|---|---|---|
| `auth` | `{ checked: false, user: null, role: null, email: null }` | สถานะผู้ใช้ปัจจุบันทั้งหมด — `checked` บอกว่าตรวจสอบ auth เสร็จหรือยัง (กัน flash ของหน้า login), `user`/`role`/`email`/`profile` คือข้อมูลผู้ใช้ |

**ฟังก์ชัน:**
- `checkAuth()` (async, เรียกใน `useEffect` ตอน mount ครั้งเดียว):
  1. เช็ค `localStorage['cybershield_active_user']` ก่อน (บัญชี General User ที่สมัครเอง ไม่มี session จริงฝั่ง server)
  2. ถ้าไม่มี → เรียก `GET /api/me` เพื่อเช็ค session ของ admin จริงฝั่ง backend
  3. ถ้า `data.ok` → ตั้ง `auth` เป็นบทบาท `'SOC Lead Operator'`, email สมมติ `${username}@cybershield.th`, profile default `{name:'System', lastname:'Admin', phone:'-'}`
  4. ถ้าไม่มีทั้งคู่ หรือเกิด error → `auth.user = null` (แสดงหน้า Login)
- `handleLoginSuccess(username, role='General User', email=null, profile=null)` — เรียกจาก `Login.jsx` เมื่อ login/signup สำเร็จ; เล่นเสียง `success`, สร้าง `nextAuth`, เซฟลง `localStorage`, `navigate('/')`
- `updateProfile(nextProfile)` — merge ข้อมูลโปรไฟล์ใหม่เข้ากับของเดิม (ใช้จากหน้า `Settings`), sync ลง `localStorage`
- `handleLogout()` (async) — เล่นเสียง `click`, ลบ `localStorage['cybershield_active_user']`, เรียก `POST /api/logout` (สำหรับกรณี session จริง), เคลียร์ `auth`, `navigate('/')`

**เงื่อนไข render:**
- `!auth.checked` → แสดง spinner โหลด
- `!auth.user` → แสดง `<Login>`
- อื่นๆ → แสดง `<AppShell>`

### `ThemedRoot({ children })`
ครอบทุกอย่างด้วย `<div data-theme={theme}>` เพื่อให้ CSS เลือก dark/light theme ได้ (`theme` มาจาก `useApp()`)

---

## 3. `context/AppContext.jsx`

React Context ตัวเดียวของทั้งแอป เก็บ state ที่ต้องใช้ร่วมกันข้ามหน้า

### `AppProvider({ auth, updateProfile, children })`

**State:**
| ตัวแปร | ค่าเริ่มต้น | persist ที่ | คำอธิบาย |
|---|---|---|---|
| `theme` | `localStorage['cybershield_theme']` หรือ `'dark'` | `localStorage` | ธีมสี (`'dark'`/`'light'`) |
| `lang` | `localStorage['cybershield_lang']` หรือ `'th'` | `localStorage` | ภาษา (`'th'`/`'en'`) |
| `previewAsGeneral` | `false` | ไม่ persist | admin กำลัง preview เป็น general user อยู่หรือไม่ |
| `openHelpId` | `null` | ไม่ persist | id ของ `InfoHelp` popover ที่กำลังเปิดอยู่ (มีได้ทีละอันทั้งแอป) |
| `accessDeniedOpen` | `false` | ไม่ persist | เปิด/ปิด `AccessDeniedModal` |

**Effects:**
1. sync `theme` → `localStorage['cybershield_theme']` ทุกครั้งที่เปลี่ยน
2. sync `lang` → `localStorage['cybershield_lang']` ทุกครั้งที่เปลี่ยน
3. รีเซ็ต `previewAsGeneral` เป็น `false` ทุกครั้งที่ `auth?.user` เปลี่ยน (เช่นตอน logout/login ใหม่ ไม่ให้ preview ค้าง)

**ตัวแปรคำนวณ (derived):**
| ตัวแปร | สูตร | ความหมาย |
|---|---|---|
| `t` | `STR[lang] || STR.th` | dictionary ข้อความของภาษาปัจจุบัน |
| `isAdminActual` | `!!auth?.user && auth.role !== 'General User'` | บัญชีจริงเป็น admin หรือไม่ (ไม่สนใจ preview) |
| `isGeneralView` | `auth?.role === 'General User' \|\| (isAdminActual && previewAsGeneral)` | มุมมองปัจจุบันควรถูกจำกัดสิทธิ์หรือไม่ — ใช้ตัวนี้ทั่วทั้งแอปเพื่อ disable ปุ่ม/ซ่อนเมนู |

**`value`** — object ที่ส่งเข้า `AppContext.Provider` รวมทุกตัวแปร/setter ข้างบน บวก `auth`, `updateProfile` ที่รับมาจาก prop

### `useApp()`
custom hook, `useContext(AppContext)` — throw error ถ้าเรียกนอก `AppProvider`

---

## 4. `utils/sound.js`

สังเคราะห์เสียงแจ้งเตือนด้วย Web Audio API ล้วน (ไม่มีไฟล์ `.mp3`/`.wav`)

**ตัวแปรระดับโมดูล:**
| ชื่อ | คำอธิบาย |
|---|---|
| `audioCtx` | เก็บ instance เดียวของ `AudioContext` (lazy-init, ใช้ซ้ำทุกครั้งที่เล่นเสียง) |

**ฟังก์ชัน:**
- `getAudioContext()` — สร้าง `AudioContext`/`webkitAudioContext` ครั้งแรกที่เรียก, ถ้าอยู่ในสถานะ `suspended` (เบราว์เซอร์บล็อคจนกว่าจะมี user gesture) จะ `.resume()` ให้อัตโนมัติ
- `isSoundEnabled()` — อ่าน `localStorage['cybershield_sound_enabled']`, default `true` (เฉพาะค่า `'false'` เท่านั้นที่ปิดเสียง)
- `setSoundEnabled(enabled)` — เขียนค่า boolean ลง `localStorage`
- `getVolume()` — อ่าน `localStorage['cybershield_volume']` เป็น float, default `0.4`
- `setVolume(vol)` — เขียนค่า volume ลง `localStorage`
- `playSound(type = 'alert')` — จุดเข้าใช้งานหลัก รับ `type` เป็น `'alert' | 'critical' | 'click' | 'success'`:
  - ถ้าเสียงถูกปิดไว้ → return ทันที
  - สร้าง `ctx`, `vol` (volume), `gainNode`, `now` (`ctx.currentTime`) ใช้ร่วมกัน
  - **`click`**: oscillator sine ความถี่ 1400→400 Hz ใน 0.04 วิ (เสียง "ติ๊ก" สั้น)
  - **`alert`**: oscillator sawtooth 3 โน้ต (D5→A5→D5) ผ่าน low-pass filter (ไซเรนคู่)
  - **`critical`**: ลูป 3 รอบ oscillator square 960→480 Hz ผ่าน band-pass filter (พัลส์เร็ว จำลอง DEFCON 1)
  - **`success`**: ไล่โน้ต C5→E5→G5→C6 (chord ไล่ขึ้น สไตล์ sci-fi)
  - ทุกกรณี wrap ด้วย `try/catch` เพื่อไม่ให้ error ของ Web Audio ทำแอปพัง

---

## 5. Components

### 5.1 `components/AccessDeniedModal.jsx`

**Props:** `onDismiss` (function) — เรียกเมื่อผู้ใช้กดปิด/คลิก backdrop

**จาก context:** `t` (ข้อความ), `accessDeniedOpen` (boolean ควบคุมการแสดงผล — ถ้า `false` return `null` ทันที)

**ฟังก์ชันภายใน:** `handleDismiss()` — เล่นเสียง `click` แล้วเรียก `onDismiss()`

### 5.2 `components/InfoHelp.jsx`

ปุ่ม "!" ขนาดเล็กที่แสดง popover อธิบายศัพท์เทคนิค ใช้ซ้ำหลายสิบจุดทั่วแอป

**Props:** `id` (string) — key ที่ใช้ค้นหาใน `t.help[id]`

**ค่าคงที่โมดูล:**
| ชื่อ | ค่า | คำอธิบาย |
|---|---|---|
| `MARGIN` | `8` | ระยะขอบขั้นต่ำจากขอบจอ (กัน popover ล้นจอ) |
| `POP_WIDTH` | `280` | ความกว้างคงที่ของกล่อง popover (px) ใช้คำนวณตำแหน่ง |

**จาก context:** `t`, `openHelpId`, `setOpenHelpId` (state กลาง ให้เปิดได้ทีละอันทั้งแอป)

**Refs:** `btnRef` (ปุ่ม "!"), `popRef` (กล่อง popover — ใช้วัดความสูงจริง)

**State:** `pos` — `{ top, left }` ตำแหน่ง absolute ของ popover (เริ่มที่ `-9999` เพื่อไม่ให้ flash ที่มุมจอก่อนคำนวณเสร็จ)

**ตัวแปรคำนวณ:**
- `isOpen` = `openHelpId === id`
- `help` = `t.help?.[id]` — ถ้าไม่มี key นี้ในพจนานุกรม component จะ return `null` (ไม่ render ปุ่มเลย)

**Effect (ทำงานเมื่อ `isOpen` เปลี่ยน):**
- `measure()` — คำนวณตำแหน่ง popover จาก `getBoundingClientRect()` ของปุ่ม: เลื่อน `left` ไม่ให้ล้นขวา/ซ้าย, เลือกแสดงด้านล่างปุ่มก่อน (`fitsBelow`) ถ้าไม่พอที่ค่อยแสดงด้านบน, กันล้นบน/ล่างจอด้วย
- ผูก listener `scroll` (capture), `resize` เพื่อ re-measure, `mousedown` (ปิดถ้าคลิกนอก `[data-info-help]`), `keydown` (ปิดถ้ากด Escape)

### 5.3 `components/ThreatInspectModal.jsx`

Modal แสดงรายละเอียด event หนึ่งตัว (เปิดจากการคลิกแถวใน Dashboard/Incidents/Logs)

**Props:** `event` (object เหตุการณ์จาก backend), `onClose` (function)

**จาก context:** `isGeneralView` — ใช้ปิดการใช้งานปุ่ม quarantine

**Guard:** ถ้า `!event` → return `null`

**State:**
| ตัวแปร | ค่าเริ่มต้น | คำอธิบาย |
|---|---|---|
| `quarantined` | คำนวณจาก `localStorage['cybershield_blocked_ips']` — `true` ถ้า `event.source_ip` อยู่ในลิสต์แล้ว | สถานะว่า IP นี้ถูกบล็อคไปแล้วหรือยัง |
| `actionLoading` | `false` | กำลังยิง action quarantine อยู่หรือไม่ (จำลอง delay ด้วย `setTimeout`) |
| `actionMessage` | `''` | ข้อความ feedback หลัง quarantine สำเร็จ |

**ตัวแปรคำนวณ:** `isAlert` = `event.is_alert || event.confidence >= 0.8`

**ฟังก์ชัน:**
- `handleQuarantine()` — ถ้า `isGeneralView` return ทันที (ห้ามกระทำ); เล่นเสียง `click`, ตั้ง loading, จำลอง delay 800ms แล้วเขียน IP ลง `localStorage['cybershield_blocked_ips']` (⚠️ **หมายเหตุ**: เขียนเฉพาะ localStorage ฝั่ง frontend เท่านั้น ไม่ได้เรียก API `/api/blocked-ips` เหมือนหน้า Incidents/Settings — เป็นการจำลอง action แบบ demo), ตั้ง `quarantined = true`, สร้างข้อความ feedback, เล่นเสียง `success`
- `handleExportJson()` — สร้าง data URI จาก `JSON.stringify(event, null, 2)`, สร้าง `<a download>` ชั่วคราวแล้วคลิกเพื่อดาวน์โหลดไฟล์ `cybershield_event_<id หรือ timestamp>.json`
- `formatTime(timestamp)` — แปลงเป็น string ด้วย `toLocaleString('th-TH', {hour12:false})`, กัน error ด้วย try/catch

**เนื้อหาที่แสดง:** risk banner (confidence %, attack class, model ที่ตรวจจับ), grid รายละเอียด (source IP, timestamp, alert status, model architecture ตาม `model_name`), ปุ่ม action (quarantine/export)

---

## 6. Pages

### 6.1 `pages/Dashboard.jsx`

หน้าแรกของแอป แสดงฟีดสด + กราฟความเร็วแพ็กเก็ต + สรุปสถิติ + admin panel (เฉพาะ non-general)

**Props:** `activeAlertsCount = 0` (ส่งมาจาก `AppShell`, ใช้เฉพาะรับค่า ไม่ได้ใช้แสดงผลโดยตรงในไฟล์นี้ นอกจาก default)

**ค่าคงที่โมดูล:** `MODEL_SUMMARY_ICONS` — map `{total, alerts, intrusion, flow, sqli}` → `{path, cls, viewBox}` ของแต่ละไอคอนสถิติ

**จาก context:** `t`, `isGeneralView`, `previewAsGeneral`, `setPreviewAsGeneral`

**State:**
| ตัวแปร | ค่าเริ่มต้น | คำอธิบาย |
|---|---|---|
| `events` | `[]` | รายการ event ล่าสุด (สูงสุด 100 แถว) จาก WebSocket, เรียงใหม่สุดก่อน |
| `connected` | `false` | สถานะ WebSocket เชื่อมต่ออยู่หรือไม่ |
| `selectedEvent` | `null` | event ที่ถูกคลิกเพื่อเปิด `ThreatInspectModal` |
| `stats` | `{ total, alerts, intrusion, flow, sqli }` ทั้งหมด `0` | ตัวนับสะสมของแต่ละหมวดตั้งแต่เปิดหน้า |
| `ppsHistory` | array ยาว `CHART_BUCKETS` เติม `0` | จำนวน event ต่อ "ช่อง" เวลา (bucket) ใช้ plot กราฟเส้น |
| `lastUpdated` | `'--:--:--'` | เวลาล่าสุดที่ได้รับข้อมูลจาก WS |

**ค่าคงที่ภายในฟังก์ชัน component:**
| ชื่อ | ค่า | คำอธิบาย |
|---|---|---|
| `CHART_BUCKETS` | `26` | จำนวนแท่ง/จุดบนกราฟ |
| `BUCKET_MS` | `2000` | ความกว้างแต่ละ bucket (2 วินาที) |
| `WINDOW_MS` | `CHART_BUCKETS * BUCKET_MS` = 52000 | ช่วงเวลารวมที่กราฟแสดง (52 วินาทีย้อนหลัง) |

**Refs:**
- `wsRef` — instance WebSocket ของหน้านี้ (แยกจาก `AppShell`)
- `eventTimesRef` — array ของ epoch ms ของทุก event จริง (seed จาก `/api/logs` history + เติมสดจาก WS) ใช้คำนวณกราฟใหม่ทุกติ๊ก ไม่ใช้ตัวนับสะสมธรรมดา เพื่อให้กราฟสะท้อนการกระจายตัวจริงของ traffic ในหน้าต่างเวลาที่มองเห็น

**ฟังก์ชัน:**
- `recordEventTime(timestamp)` — แปลง timestamp เป็น epoch ms (fallback เป็น `Date.now()` ถ้า parse ไม่ได้) แล้ว push เข้า `eventTimesRef.current`
- `rebucketPpsHistory()` — กรอง `eventTimesRef.current` ให้เหลือเฉพาะที่อยู่ใน `WINDOW_MS` ล่าสุด, สร้าง array `buckets` ใหม่ 26 ช่อง, ไล่แต่ละ timestamp คำนวณว่าอยู่ช่องไหน (`idxFromEnd`, `idx`) แล้วนับเข้า bucket, สุดท้าย `setPpsHistory(buckets)`
- `fetchHistory()` (async) — เรียก `GET /api/logs?limit=200`, seed `eventTimesRef` จากผลลัพธ์แล้วเรียก `rebucketPpsHistory()`
- `connectWebSocket()` — เปิด WS ไปที่ `/ws/feed`; `onopen`→`connected=true`, `onclose`→`connected=false`+reconnect 3 วิ, `onmessage`: parse JSON (ข้าม ping), บันทึกเวลา event, prepend เข้า `events` (จำกัด 100), อัปเดต `lastUpdated`, อัปเดต `stats` ตาม `model_name`/`is_alert`
- `getConfidenceClass(confidence)` — คืน class ชื่อสี: `confidence-high` (≥0.85), `confidence-medium` (≥0.6), มิฉะนั้น `confidence-low`
- `formatTime(timestamp)` — `toLocaleTimeString('th-TH', {hour12:false})`

**Effects:**
1. mount: `connectWebSocket()` + `fetchHistory()`, cleanup ปิด WS
2. `setInterval(rebucketPpsHistory, BUCKET_MS)` — รีคำนวณกราฟทุก 2 วินาทีแม้ไม่มี event ใหม่ (ให้ bucket เก่าหลุดออกจากหน้าต่างเวลา)

**ตัวแปรคำนวณสำหรับวาดกราฟ SVG:**
| ตัวแปร | คำอธิบาย |
|---|---|
| `chartW`, `chartH` | ขนาด viewBox ของ SVG คงที่ (640×148) |
| `peakPps` | ค่าสูงสุดใน `ppsHistory` ปัจจุบัน |
| `maxVal` | `max(peakPps * 1.25, 4)` — สเกลแกน Y ตามค่าจริง (ไม่ fix ขั้นต่ำสูง) เพื่อไม่ให้กราฟแบนตอน traffic น้อย |
| `stepX` | ระยะห่างแนวนอนระหว่างจุดข้อมูล |
| `points` | array ของ `[x, y]` แต่ละจุดบนกราฟ |
| `linePath` | SVG path string ของเส้นกราฟ |
| `areaPath` | `linePath` + ปิดล่างเป็นพื้นที่แรเงา |
| `lastX`, `lastY` | ตำแหน่งจุดสุดท้าย (จุดวงกลมไฮไลต์ปลายเส้น) |
| `gridLines` | เส้นกริดแนวนอน 5 เส้น (0%,25%,50%,75%,100%) พร้อม label ตัวเลข |
| `currentPps` | ค่า pps ของ bucket ล่าสุด |
| `modelSummary` | array การ์ดสรุป 5 ใบ (`total/alerts/intrusion/flow/sqli`) ผูกกับ `stats` และไอคอน |

**ส่วนแสดงผลหลัก:** header (สถานะ live/online), preview banner (ถ้า `previewAsGeneral`), การ์ดกราฟ pps, grid การ์ดสรุปโมเดล, `admin-section` (สถิติ mock: incidents/critical/resolved/models-online, platform monitoring, sensor status, LSTM model status — **เป็นข้อมูลจำลองคงที่ ไม่ได้ผูกกับ backend จริง** แสดงเฉพาะ `!isGeneralView`), feed รายการ event สด (คลิกแล้วเปิด modal)

### 6.2 `pages/Analytics.jsx`

หน้าวิเคราะห์ภาพรวม: การกระจายของ attack class + ตาราง MITRE ATT&CK + telemetry ของแต่ละโมเดล

**ฟังก์ชัน module-level:** `sinceForRange(range)` — คืนค่า ISO timestamp ย้อนหลัง (`'24h'` → -24 ชม., `'7d'` → -7 วัน, อื่นๆ → `null`) ใช้ประกอบ query string

**จาก context:** `t`, `lang`

**State:**
| ตัวแปร | ค่าเริ่มต้น | คำอธิบาย |
|---|---|---|
| `logs` | `[]` | ผลลัพธ์ดิบจาก `/api/logs` |
| `loading` | `true` | สถานะกำลังโหลด |
| `timeRange` | `'all'` | ตัวเลือกช่วงเวลา (`'24h' \| '7d' \| 'all'`) |
| `modelInfo` | `null` | metadata โมเดลจาก `/api/model-info` (input shape จริง) |

**Effects:**
1. เรียก `fetchData()` ทุกครั้งที่ `timeRange` เปลี่ยน (รวมตอน mount)
2. mount ครั้งเดียว: `fetch('/api/model-info')` → เก็บใน `modelInfo`

**ฟังก์ชัน:** `fetchData()` (async) — สร้าง `URLSearchParams({limit:'500'})`, เติม `since` ถ้ามี, เรียก `/api/logs?...`, เซฟผลใน `logs`

**ค่าคงที่ข้อมูล:**
- `attackKeys` — นิยาม 8 หมวดหมู่การโจมตี (`benign, ddos, dos, r2l, u2r, bruteforce, sqli, other`) แต่ละอันมีข้อความ th/en และสี
- `mitreData` — ตารางแม็ป MITRE ATT&CK tactic/technique/severity แบบ hardcode (6 แถว) มีข้อความ th/en

**ตัวแปรคำนวณ:**
| ตัวแปร | คำอธิบาย |
|---|---|
| `attackCounts` | object นับจำนวนแต่ละหมวดจาก `logs` จริง โดยจับคำใน `attack_class` (`.toLowerCase()` แล้วเทียบ/`includes`) |
| `hasData` | `logs.length > 0` |
| `displayCounts` | ถ้ามีข้อมูลจริงใช้ `attackCounts`, ถ้าไม่มีใช้ตัวเลข demo คงที่ (342/84/56/...) |
| `displayTotal` | ผลรวมของ `displayCounts` (อย่างน้อย 1 กันหารด้วยศูนย์) |
| `spectrumRows` | แปลง `attackKeys` + `displayCounts` เป็นแถวพร้อม label ตามภาษา, จำนวน, เปอร์เซ็นต์ (ปัดทศนิยม 1 ตำแหน่ง), สี |
| `mitreRows` | แปลง `mitreData` เลือกข้อความตาม `lang` |
| `intrusionShape`, `flowShape`, `sqliMeta` | อ่านจาก `modelInfo?.intrusion/flow/sqli` (metadata จริงจาก backend) |
| `telemetryData` | array 3 รายการ (Intrusion/Flow/SQLi) เก็บ tag, ชื่อ, คำอธิบาย th/en, `inputShape` (จาก metadata จริงถ้ามี ไม่งั้น `'—'`), `acc`/`f1`/`latency` — **แสดงเฉพาะตัวเลขที่มีจริงตาม CLAUDE.md** (มีแค่ Flow's f1 = `'0.9534'`) ตัวอื่นเป็น `'—'` เพื่อไม่捏 fabricate ตัวเลข |

**ส่วนแสดงผล:** ตัวเลือกช่วงเวลา (`seg` radio 24h/7d/all) + ปุ่ม refresh, แจ้งเตือน demo notice ถ้า `!hasData`, การ์ด attack spectrum (bar chart แนวนอน), ตาราง MITRE, grid การ์ด telemetry โมเดล 3 ใบ

### 6.3 `pages/Incidents.jsx`

คิวเหตุการณ์ที่ต้องดำเนินการ (สำหรับ admin) + audit log ของการกระทำที่ผ่านมา

**จาก context:** `t`, `isGeneralView`, `auth`

**State:**
| ตัวแปร | ค่าเริ่มต้น | คำอธิบาย |
|---|---|---|
| `incidents` | `[]` | รายการ alert (`GET /api/logs?limit=200&alerts_only=true`) |
| `loading` | `true` | สถานะโหลด incidents |
| `selectedEvent` | `null` | event ที่เปิดใน `ThreatInspectModal` |
| `filterStatus` | `'ALL'` | ตัวกรองสถานะ (`ALL/OPEN/INVESTIGATING/MITIGATED`) |
| `statusMap` | `{}` | map `{eventId: status}` จาก `GET /api/incidents/statuses` (SQLite ฝั่ง backend, persist ข้ามอุปกรณ์) |
| `auditLogs` | `[]` | รายการ log การกระทำ (`GET /api/audit-log?limit=50`) |

**Effect:** mount ครั้งเดียว — เรียก `fetchAlerts()`, `fetchStatuses()`, `fetchAuditLogs()` พร้อมกัน

**ฟังก์ชัน:**
- `fetchAlerts()` (async) — ดึง alert จาก backend
- `fetchStatuses()` (async) — ดึง status map
- `fetchAuditLogs()` (async) — ดึง audit log
- `updateIncidentStatus(eventId, sourceIp, newStatus, actionName)` (async) — ถ้า `isGeneralView` ห้ามทำ; `PATCH /api/incidents/{eventId}` พร้อม body `{status, source_ip, action_name}`; สำเร็จแล้วอัปเดต `statusMap` ทันที (optimistic), เล่นเสียง `success` ถ้าเป็น `MITIGATED`, แล้ว refresh audit log
- `getStatus(item)` — `statusMap[item.id] || 'OPEN'` (ค่า default)
- `formatTime(timestamp)` — เหมือนหน้าอื่น

**ตัวแปรคำนวณ:**
| ตัวแปร | คำอธิบาย |
|---|---|
| `filteredIncidents` | `incidents` กรองตาม `filterStatus` |
| `openCount`, `invCount`, `mitCount` | นับจำนวนแต่ละสถานะจาก `incidents` ทั้งหมด (ไม่ใช่ filtered) |
| `statusTag(st)` | คืนชื่อ CSS tag class ตามสถานะ |
| `statusLabel(st)` | คืนข้อความแปลตามสถานะ |

**ส่วนแสดงผล:** การ์ดสถิติ 3 ใบ (คลิกเพื่อ toggle filter), รายการ incident (คลิกเปิด modal, ปุ่ม "Triage"/"Quarantine" ที่ disable เมื่อ `isGeneralView`), panel audit log ด้านข้าง

### 6.4 `pages/Logs.jsx`

ตาราง log แบบเต็ม รองรับ filter/search/sort/pagination/export

**จาก context:** `t`; ใช้ `useNavigate()` เพื่อไปหน้า `/test` ตอนไม่พบผลลัพธ์

**State:**
| ตัวแปร | ค่าเริ่มต้น | คำอธิบาย |
|---|---|---|
| `logs` | `[]` | ข้อมูลของหน้าปัจจุบัน (จาก backend, แบ่งหน้าแล้ว) |
| `loading` | `true` | สถานะโหลด |
| `page` | `0` | เลขหน้า (0-indexed) |
| `selectedEvent` | `null` | event ที่เปิดใน modal |
| `searchQuery` | `''` | คำค้นหา client-side |
| `filters` | `{ model_name: '', attack_class: '', alerts_only: false }` | ตัวกรองที่ส่งเป็น query param ไปยัง backend |
| `sortField` | `'timestamp'` | คอลัมน์ที่ใช้ sort (client-side) |
| `sortDir` | `'desc'` | ทิศทาง sort (`'asc'/'desc'`) |

**ค่าคงที่:** `PAGE_SIZE = 50`

**Effect:** เรียก `fetchLogs()` เมื่อ `page` หรือ `filters` เปลี่ยน

**ฟังก์ชัน:**
- `fetchLogs()` (async) — สร้าง query (`limit`, `offset` จาก `page*PAGE_SIZE`, filters ที่ไม่ว่าง) เรียก `/api/logs`
- `handleSort(field)` — ถ้า sort field เดิม สลับทิศทาง, ถ้าไม่ใช่ เปลี่ยน field และตั้ง `desc`
- `getFilteredAndSortedLogs()` — กรองด้วย `searchQuery` (เทียบ `source_ip`, `attack_class`, `model_name`, `id`) แล้ว sort ตาม `sortField`/`sortDir` (คืน array ใหม่ ไม่แก้ `logs` เดิม)
- `handleExportCSV()` — แปลงผลลัพธ์ที่กรอง/sort แล้วเป็น CSV (คอลัมน์คงที่ 7 คอลัมน์) ผ่าน `Blob` + `URL.createObjectURL`, ดาวน์โหลดชื่อ `cybershield_logs_page_<n>.csv`
- `handleExportJSON()` — เหมือนกันแต่เป็น JSON ผ่าน data URI
- `getConfidenceClass(confidence)` — เหมือนหน้า Dashboard
- `formatTime(timestamp)` — `toLocaleString`
- `clearLogFilters()` — รีเซ็ต `searchQuery`, `filters`, `page`
- `severityClass(confidence)` — คืน CSS tag class ตาม confidence (`tag-danger/tag-warning/tag-neutral`)
- `sortIndicator(field)` — คืนลูกศร ` ↑`/` ↓`/`''` แสดงข้าง header คอลัมน์ที่ sort

**ตัวแปรคำนวณ:** `displayLogs = getFilteredAndSortedLogs()` — ใช้ render ตาราง

**ส่วนแสดงผล:** ปุ่ม export CSV/JSON/refresh, filter grid (search input + select model + select attack class), ตาราง (header คลิกได้เพื่อ sort, แถวคลิกเปิด modal), pagination (ปุ่ม prev/next — `next` disable เมื่อ `logs.length < PAGE_SIZE` คือหมดหน้าแล้ว)

### 6.5 `pages/Login.jsx`

หน้า sign in / sign up มี 2 โหมดสลับกันด้วย tab

**Props:** `onLoginSuccess` (function รับ `username, role, email, profile`)

**จาก context:** `t`

**State — โหมดและฟอร์ม sign in:**
| ตัวแปร | ค่าเริ่มต้น | คำอธิบาย |
|---|---|---|
| `authMode` | `'signin'` | `'signin' \| 'signup'` — แท็บที่เลือก |
| `loginUsername` | `''` | ช่องกรอกชื่อผู้ใช้/อีเมล (sign in) |
| `loginPassword` | `''` | ช่องกรอกรหัสผ่าน (sign in) |
| `showSigninPw` | `false` | toggle แสดง/ซ่อนรหัสผ่าน sign in |

**State — ฟอร์ม sign up:**
| ตัวแปร | ค่าเริ่มต้น | คำอธิบาย |
|---|---|---|
| `regUsername` | `''` | ชื่อผู้ใช้ใหม่ |
| `regName` | `''` | ชื่อจริง |
| `regLastname` | `''` | นามสกุล |
| `regPhone` | `''` | เบอร์โทร |
| `regEmail` | `''` | อีเมล |
| `regPassword` | `''` | รหัสผ่าน |
| `regConfirm` | `''` | ยืนยันรหัสผ่าน |
| `showSignupPw` | `false` | toggle แสดงรหัสผ่าน |
| `showConfirmPw` | `false` | toggle แสดงรหัสยืนยัน |
| `consentChecked` | `false` | checkbox ยินยอมนโยบายข้อมูล (บังคับติ๊กก่อนสมัคร) |

**State ร่วม:**
| ตัวแปร | ค่าเริ่มต้น | คำอธิบาย |
|---|---|---|
| `loading` | `false` | กำลังส่งฟอร์ม |
| `error` | `null` | ข้อความ error แสดงบนการ์ด |
| `successMsg` | `null` | ข้อความสำเร็จ (เช่นหลังสมัครเสร็จ) |
| `shake` | `false` | trigger animation สั่นการ์ด (500ms) เมื่อ error |

**ฟังก์ชัน:**
- `handleTabSwitch(mode)` — เล่นเสียง `click`, เปลี่ยน `authMode`, เคลียร์ error/success
- `triggerShake(message)` — ตั้ง `error`, เล่นเสียง `click`, สั่นการ์ด 500ms
- `handleLoginSubmit(e)` (async):
  1. validate ว่ากรอกครบ
  2. เช็คก่อนว่าเป็นบัญชี General User ที่สมัครไว้ใน `localStorage['cybershield_registered_operators']` หรือไม่ (เทียบ username แบบไม่สนตัวพิมพ์ใหญ่เล็ก + password ตรงกัน) — ถ้าเจอ ล็อกอินแบบ local ทันที ไม่ยิง API
  3. ถ้าไม่เจอ → เรียก `POST /api/login` (สำหรับ admin จริงที่ตั้งค่าใน `.env`) — สำเร็จให้ role เป็น `'SOC Lead Operator'`
  4. error → `triggerShake`
- `handleRegisterSubmit(e)` — validate หลายขั้น (ครบทุกช่อง, username ≥3 ตัวอักษร, ชื่อ/นามสกุล ≥2 ตัวอักษร, เบอร์โทรตาม regex `^[0-9+\-()\s]{8,15}$`, อีเมลมี `@` และ `.`, ติ๊ก consent, รหัสผ่าน ≥6 ตัวอักษรและตรงกัน) → จำลอง delay 500ms แล้วเช็คชื่อซ้ำ (รวมกันชื่อ `'admin'`) → สร้าง `newUser` object (มี `id: Date.now()`, `role: 'General User'`, `createdAt`) → เซฟลง `localStorage['cybershield_registered_operators']` → สลับกลับไป tab sign in พร้อม prefill username

**ค่าคงที่:** `FEATURES` — array 3 รายการ (Intrusion/Flow/Alert) แสดงในแผงซ้ายของหน้า login พร้อมไอคอนและข้อความ

**หมายเหตุสำคัญ:** บัญชี General User ที่สมัครผ่านฟอร์มนี้เป็น **frontend-only** — เก็บใน `localStorage` เท่านั้น ไม่มี session cookie จริงฝั่ง server (ตรงกับที่ระบุใน `CLAUDE.md` เรื่อง Auth — ถูก `require_admin` ปฏิเสธเสมอถ้าพยายามเรียก endpoint ที่ต้องมีสิทธิ์)

### 6.6 `pages/Settings.jsx`

หน้าตั้งค่า แบ่งเป็นหมวดผ่าน sidebar ย่อยภายในหน้า

**จาก context:** `t, lang, setLang, theme, setTheme, auth, updateProfile, previewAsGeneral, setPreviewAsGeneral, isAdminActual, isGeneralView, setAccessDeniedOpen`

**State หลัก:** `category` (ค่าเริ่มต้น `'profile'`) — หมวดที่กำลังแสดง (`profile/general/audio/display/role/firewall`)

**Effect:** ถ้า `isGeneralView` และ `category === 'firewall'` → บังคับกลับไป `'profile'` และเปิด modal access-denied (firewall เป็นแท็บ admin-only)

**หมวด Profile — State:**
| ตัวแปร | ค่าเริ่มต้น | คำอธิบาย |
|---|---|---|
| `firstName` | `auth?.profile?.name \|\| ''` | |
| `lastName` | `auth?.profile?.lastname \|\| ''` | |
| `email` | `auth?.email \|\| ''` | |
| `phone` | `auth?.profile?.phone \|\| ''` | |
| `profileSaved` | `false` | แสดง tag "บันทึกแล้ว" หลังกด save (รีเซ็ตเป็น `false` ทันทีที่แก้ไขช่องใดช่องหนึ่ง) |

ฟังก์ชัน `saveProfile()` — ถ้า `isGeneralView` return; เรียก `updateProfile({name, lastname, phone})` จาก context (persist ลง `localStorage` ผ่าน `App.jsx`), ตั้ง `profileSaved = true`

**หมวด Password reset — State:** `currentPw`, `newPw`, `confirmPw` (ทั้งหมด `''`) — **ฟอร์มนี้ปิดใช้งาน (disabled) ทั้งหมด ยังไม่เชื่อมต่อ backend จริง** ตามคอมเมนต์ในโค้ด

**หมวด Audio — State:**
| ตัวแปร | ค่าเริ่มต้น | คำอธิบาย |
|---|---|---|
| `soundOn` | `isSoundEnabled()` | เปิด/ปิดเสียงทั้งหมด |
| `volume` | `getVolume()` | ระดับเสียง (0.05–1.0) |

ฟังก์ชัน `handleSoundToggle(checked)`, `handleVolumeChange(e)` — เขียนผ่าน `utils/sound.js` (`saveSoundEnabled`/`saveVolume`) และซิงก์ state; toggle เปิดเสียงจะเล่นตัวอย่างเสียง `success` หลัง 100ms

**หมวด Display — State:**
| ตัวแปร | ค่าเริ่มต้น | คำอธิบาย |
|---|---|---|
| `compactMode` | `localStorage['cybershield_compact_mode'] === 'true'` | โหมดจอแน่น |
| `refreshInterval` | `localStorage['cybershield_refresh_interval'] \|\| '10'` | ค่าความถี่รีเฟรช (วินาที) — **เก็บใน localStorage แต่ไม่พบว่ามีการใช้ค่านี้จริงในการโพลข้อมูลที่ไหนในโค้ดปัจจุบัน** (เป็น setting ที่ยังไม่ได้ผูกใช้งานจริง) |

ฟังก์ชัน `handleCompactToggle(checked)` — toggle class `compact-theme` บน `document.documentElement` โดยตรง และเขียน `localStorage`; `handleRefreshChange(e)` — เขียนค่าที่เลือกลง `localStorage`

**หมวด Role (เฉพาะ `isAdminActual`)** — ใช้ `previewAsGeneral`/`setPreviewAsGeneral` จาก context โดยตรง (radio Admin/General) พร้อมสถิติการใช้งานแบบ mock (18 active users, 3 signups, 47 sessions, 6m12s avg — ตัวเลขคงที่ ไม่ผูก backend)

**หมวด Firewall (ซ่อนเมื่อ `isGeneralView`) — State:** `blockedIps` (`[]`) — รายชื่อ IP ที่ถูกบล็อค

**Effect:** mount ครั้งเดียว `fetchBlockedIps()`

**ฟังก์ชัน:**
- `fetchBlockedIps()` (async) — `GET /api/blocked-ips`, map `data.data` เอาเฉพาะ field `ip`
- `unblockIp(ip)` (async) — ถ้า `isGeneralView` return; `DELETE /api/blocked-ips/{ip}` (encode URI), สำเร็จแล้วลบออกจาก state, เล่นเสียง `success`
- `addDemoBlockedIp()` (async) — สุ่มสร้าง IP รูปแบบ `172.16.x.x` (จำลอง incident demo), กันซ้ำ, `POST /api/blocked-ips` พร้อม body `{ip}`, สำเร็จแล้ว push เข้า state

**ตัวแปรคำนวณ:** `categories` — array เมนูย่อยของ Settings สร้างแบบ dynamic: หมวด `role` แสดงเฉพาะ `isAdminActual`, หมวด `firewall` ซ่อนเมื่อ `isGeneralView`

หมายเหตุ: ทุกฟังก์ชันที่แก้ไขข้อมูล (`save/unblock/addDemo/toggle*`) เช็ค `isGeneralView` ก่อนเสมอ เป็นการป้องกันชั้น frontend ซ้อนกับฝั่ง backend (`require_admin`) ตามที่ระบุใน `CLAUDE.md`

### 6.7 `pages/Test.jsx`

หน้าทดสอบโมเดลด้วยมือ (manual inference) — เรียก `POST /api/predict` โดยตรง

**จาก context:** `t`, `isGeneralView`

**State:**
| ตัวแปร | ค่าเริ่มต้น | คำอธิบาย |
|---|---|---|
| `activeTab` | `'sqli'` | โมเดลที่กำลังทดสอบ (`sqli/intrusion/flow`) |
| `loading` | `false` | กำลังรอผลลัพธ์จาก API |
| `result` | `null` | ผลลัพธ์การพยากรณ์ (object จาก backend) |
| `error` | `null` | ข้อความ error |
| `modelInfo` | `null` | metadata โมเดล (`/api/model-info`) — ใช้แสดงชื่อ feature จริงของ Flow Model |
| `sqliPayload` | `"' OR 1=1 --"` | ข้อความ/query ที่จะทดสอบกับ Injection Model |
| `intrusionFeatures` | array 41 ช่อง เติม `'0'` | ค่า input ของ Intrusion Model (NSL-KDD, 41 features) |
| `flowFeatures` | array 78 ช่อง เติม `'0'` | ค่า input ดิบของ Flow Model (78 raw features ก่อน backend ตัดเหลือ 71) |

**Effect:** mount ครั้งเดียว — `fetch('/api/model-info')` เก็บใน `modelInfo`

**ฟังก์ชัน:**
- `loadIntrusionPreset(scenario)` — เติมค่าตัวอย่างที่ index เฉพาะสำหรับ `'r2l'`, `'u2r'`, `'normal'` (ตัวเลขสมมติที่ทำให้โมเดล predict ไปทางคลาสนั้นๆ), ถ้า `isGeneralView` ห้ามทำ
- `loadFlowPreset(scenario)` — เหมือนกันสำหรับ Flow Model (`'ddos'`, `'dos'`, `'benign'`)
- `handlePredict(modelName)` (async) — ถ้า `isGeneralView` return; สร้าง `body` ตาม `modelName` (`payload` สำหรับ sqli, `features` array-of-number สำหรับอีกสองโมเดล — แปลงด้วย `Number(v) || 0`), เรียก `POST /api/predict`, สำเร็จเก็บ `result` และเล่นเสียง (`alert` ถ้า predicted class ไม่ใช่ `Normal`/`BENIGN`, ไม่งั้น `success`), ล้มเหลวเก็บ `error`
- `updateFeature(features, setFeatures, index, value)` — helper อัปเดตค่าเดียวใน array feature (ใช้ทั้งสอง state `intrusionFeatures`/`flowFeatures`), no-op ถ้า `isGeneralView`

**ค่าคงที่ข้อมูล:**
- `nslFeatureNames` — array ชื่อ feature ทั้ง 41 ตัวของ NSL-KDD ตามลำดับ index (`duration, protocol_type, service, ...`) ใช้แสดง label ใน grid input
- `MODEL_TABS` — นิยาม 3 แท็บ (sqli/intrusion/flow) พร้อม label, desc, icon class, help id, svg path

**ตัวแปรคำนวณ:**
| ตัวแปร | คำอธิบาย |
|---|---|
| `isMalicious` | `!!result && result.predicted_class !== 'Normal' && result.predicted_class !== 'BENIGN'` |
| `flowIgnoredNames` | รายชื่อ feature ของ Flow Model ที่มีใน `raw_feature_names` (78) แต่ไม่มีใน `trained_feature_names` (71) — คือ 7 fingerprint features ที่ backend drop ก่อนเข้าโมเดล (แสดงจางลงใน UI พร้อม tooltip อธิบาย) |
| `activeModel` | `MODEL_TABS.find(m => m.key === activeTab)` (ประกาศไว้แต่ไม่ได้ใช้แสดงผลโดยตรงในส่วน JSX ที่เหลือ — เผื่อใช้งานในอนาคต) |

**ส่วนแสดงผล:** แถบเลือกโมเดล 3 แท็บ, ฟอร์ม input ตามแท็บที่เลือก (SQLi: textarea + 4 ปุ่ม preset; Intrusion/Flow: grid input ตัวเลขตามจำนวน feature จริง + ปุ่ม preset เฉพาะโมเดล), ปุ่ม "Execute" (disabled ระหว่างโหลด/general view/payload ว่าง), การ์ดผลลัพธ์ (error หรือ prediction พร้อม confidence, แถบ probability ของทุกคลาสเรียงจากมากไปน้อย)

---

## 7. `i18n/strings.js`

Export ค่าเดียว: `STR` — object ระดับบนสุดมี 2 key คือ `th` และ `en` แต่ละอันเป็น dictionary ข้อความซ้อนกันตามหมวดหน้า (namespace) ตรงกับโครงสร้างที่ใช้ผ่าน `t.<namespace>.<key>` ทั่วทั้งแอป:

| Namespace | ใช้ในหน้า/ส่วน |
|---|---|
| `brand`, `tagline`, `defconSub`, `logout` | ระดับ global (sidebar/login) |
| `nav.*` | ชื่อเมนู sidebar |
| `access.*` | `AccessDeniedModal` |
| `login.*` | `Login.jsx` (ทั้งฟอร์ม signin/signup) |
| `dash.*` | `Dashboard.jsx` |
| `analytics.*` | `Analytics.jsx` |
| `incidents.*` | `Incidents.jsx` |
| `logs.*` | `Logs.jsx` |
| `manual.*` | `Test.jsx` |
| `settings.*` | `Settings.jsx` |
| `help.<id>` | `InfoHelp.jsx` — แต่ละ id มี `{title, desc}` (เช่น `defcon`, `highConfidence`, `mitre`, `f1score`, `refreshIntervalHelp` ฯลฯ) |

ทุกค่าที่ไม่ใช่ string เดี่ยว (เช่น `login`, `nav`, `help`) เป็น **plain nested object** ไม่มี logic — ไฟล์นี้เป็นข้อมูลล้วน (data file) ไม่มี component หรือ function

---

## 8. `index.css` — Design tokens (ตัวแปร CSS)

กำหนดผ่าน CSS custom properties บน `:root` (ธีม light เป็นค่า default) และ override ใน `[data-theme="dark"]` (จาก `ThemedRoot` ที่ตั้ง `data-theme` ตามค่า `theme` ใน context)

| กลุ่ม | ตัวแปรตัวอย่าง | ความหมาย |
|---|---|---|
| สีพื้นหลัง/ตัวอักษร | `--color-bg`, `--color-surface`, `--color-text`, `--color-card` | สีพื้นฐานของเพจ/การ์ด/ตัวอักษร |
| สี accent (แบรนด์) | `--color-accent`, `--color-accent-2`, `--color-accent-100..900`, `--color-accent-strong` | โทนสีฟ้าใช้เป็นสี highlight/ลิงก์/ปุ่ม primary |
| สี neutral | `--color-neutral-100..900` | เฉดเทาสำหรับข้อความรอง/เส้นขอบ |
| สีสถานะ | `--color-danger(-100/-700)`, `--color-success(-100)`, `--color-warning(-100)` | สีแดง/เขียว/เหลืองสำหรับ alert, สำเร็จ, เตือน |
| สี UI เสริม | `--color-sidebar`, `--color-input`, `--color-input-2`, `--color-hover`, `--color-tint`, `--color-divider` | พื้นหลัง sidebar/ input/ hover/เส้นแบ่ง |
| ฟอนต์ | `--font-heading`, `--font-heading-weight`, `--font-body`, `--font-mono` | ฟอนต์หัวข้อ/เนื้อความ/monospace (ใช้ class `mono`) |
| ระยะห่าง | `--space-1..8` (4–32px) | scale ของ margin/padding ทั่วแอป |
| ความโค้ง | `--radius-sm/md/lg/pill` | border-radius มาตรฐาน |
| เงา | `--shadow-sm/md/lg` | box-shadow ระดับความสูง (elevation) — ใช้คู่กับ class `elev-sm/md/lg` |
| Layout | `--sidebar-width` (260px) | ความกว้างคงที่ของ sidebar |

ธีม dark override ค่าสีทั้งหมดข้างต้นให้เข้มขึ้น (พื้นหลังกรมท่า `#0B1220` เป็นต้น) โดยใช้ **ชื่อตัวแปรเดียวกัน** — component ไม่ต้องรู้เรื่อง theme เลย แค่ใช้ `var(--color-xxx)` แล้ว CSS จะสลับค่าตาม `data-theme` ให้อัตโนมัติ

---

## สรุปรูปแบบที่ใช้ซ้ำทั่วทั้งแอป (Patterns)

1. **Guard สิทธิ์ (`isGeneralView`)** — ทุกฟังก์ชันที่เปลี่ยนแปลงข้อมูล (save/block/predict/preset) จะเช็ค `if (isGeneralView) return` เป็นด่านแรกเสมอ เป็นการป้องกันชั้น UI ซ้อนกับ `require_admin` ฝั่ง backend
2. **เล่นเสียงคู่กับทุก interaction** — เกือบทุกปุ่ม/การคลิกเรียก `playSound('click')` ก่อนทำ action จริง, และ `playSound('success')`/`playSound('alert')` หลัง action สำเร็จ/พบภัยคุกคาม
3. **WebSocket reconnect แบบ auto-retry** — ทั้ง `App.jsx` (global, สำหรับนับ alert/DEFCON) และ `Dashboard.jsx` (สำหรับ feed) เปิด WS แยกกันคนละ instance ไปที่ endpoint เดียวกัน (`/ws/feed`) และ reconnect อัตโนมัติเมื่อหลุด
4. **`localStorage` เป็น local persistence layer** — ใช้เก็บ theme, lang, sound settings, compact mode, refresh interval, บัญชี General User ที่สมัครเอง, และ session ของผู้ใช้ที่ active — แยกจากข้อมูลที่ persist จริงฝั่ง backend (SQLite: incidents, audit log, blocked IPs)
5. **`InfoHelp` แบบ single-open ทั้งแอป** — ใช้ `openHelpId` ตัวเดียวใน context แทนที่จะมี state แยกในแต่ละปุ่ม ทำให้เปิดได้ทีละอันเท่านั้น
