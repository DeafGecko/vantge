import { defineConfig } from '@playwright/test'

// Browser tests (Playwright). Starts the dev server if it is not already running.
export default defineConfig({
  testDir: 'e2e',
  use: { baseURL: 'http://localhost:5173' },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
  },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
})
