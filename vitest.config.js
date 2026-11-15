import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// Unit tests (Vitest + Testing Library). Browser tests live in e2e/ and run with Playwright.
export default defineConfig({
  plugins: [react()],
  esbuild: { jsx: 'automatic' },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.test.{js,jsx}'],
  },
})
