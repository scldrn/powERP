import { defineConfig, devices } from '@playwright/test'
import { config } from 'dotenv'
import path from 'path'

// Cargar .env.local para que los tests tengan acceso a las variables de entorno
config({ path: path.resolve(__dirname, '.env.local') })

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  // Los specs e2e comparten la misma BD local y mutan datos reales;
  // un solo worker evita condiciones de carrera entre tests.
  workers: 1,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev:e2e',
    url: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
