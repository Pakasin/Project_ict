// ─────────────────────────────────────────────────────────────────────────────
// main.jsx — จุดเข้าหลักของแอปพลิเคชัน (Entry Point)
// ทำหน้าที่ render root component (<App />) ลงใน <div id="root"> ของ index.html
// BrowserRouter ห่อทั้งแอปเพื่อรองรับการ routing ด้วย URL จริง (History API)
// ─────────────────────────────────────────────────────────────────────────────

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css' // โหลด CSS หลักของแอป (theme, design tokens, layout)

// สร้าง React root แบบ Concurrent Mode แล้ว render ทั้งแอปเข้าไปใน <div id="root">
ReactDOM.createRoot(document.getElementById('root')).render(
  // StrictMode: ตรวจจับปัญหาที่อาจเกิดขึ้นในโหมด development (เรียก lifecycle 2 ครั้ง)
  <React.StrictMode>
    {/* BrowserRouter: ให้แอปใช้ URL จริงเพื่อ navigate ระหว่างหน้าต่างๆ */}
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>,
)
