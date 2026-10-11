import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const proxied = ['/api', '/login', '/logout', '/legacy', '/logo.svg', '/favicon.ico']

export default defineConfig(({ mode }) => {
  // En dev, pointer sur un collector local : VITE_API_TARGET=http://localhost:5000 npm run dev
  const env = loadEnv(mode, '.', '')
  const target = env.VITE_API_TARGET || 'http://localhost:5000'
  return {
    base: '/static/app/',
    plugins: [react(), tailwindcss()],
    build: {
      outDir: '../collector/static/app',
      emptyOutDir: true,
      chunkSizeWarningLimit: 800,
    },
    server: {
      port: 5173,
      proxy: Object.fromEntries(proxied.map((p) => [p, { target, changeOrigin: true }])),
    },
  }
})
