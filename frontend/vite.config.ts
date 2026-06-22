import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5175,
    // NOTE: We intentionally do NOT set COOP/COEP headers here.
    // Cross-Origin-Embedder-Policy: require-corp blocks getUserMedia in some
    // Chrome versions. MediaPipe falls back to non-SIMD WASM which works fine
    // without SharedArrayBuffer.
  },
  optimizeDeps: {
    exclude: ['@mediapipe/face_mesh']
  }
})

