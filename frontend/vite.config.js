import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// VITE_BACKEND=http://127.0.0.1:8001 ชี้ dev server ไป backend อื่น (เช่น backend ทดสอบที่ใช้ DB ชั่วคราว); ค่าเริ่มต้นเหมือนเดิม
const BACKEND = process.env.VITE_BACKEND || 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy REST API → FastAPI
      '/api': {
        target: BACKEND,
        changeOrigin: true,
      },
      // Proxy Internal endpoint → FastAPI
      '/internal': {
        target: BACKEND,
        changeOrigin: true,
      },
      // Proxy WebSocket → FastAPI
      '/ws': {
        target: BACKEND.replace(/^http/, 'ws'),
        ws: true,
      },
    },
  },
})
