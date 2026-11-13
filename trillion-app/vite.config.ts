import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  worker: { format: 'es' },
  build: { target: 'es2022', sourcemap: false },
  server: { port: 5173, proxy: { '/api': 'http://localhost:8888' } },
  test: { include: ['tests/**/*.test.ts'], testTimeout: 120_000 },
})
