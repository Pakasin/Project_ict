import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy REST API → FastAPI
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // Proxy Internal endpoint → FastAPI
      '/internal': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
      // Proxy WebSocket → FastAPI
      '/ws': {
        target: 'ws://localhost:8000',
        ws: true,
      },
    },
  },
})
