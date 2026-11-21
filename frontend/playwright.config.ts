import { defineConfig, devices } from "@playwright/test";

const api = "http://127.0.0.1:8080";
const web = "http://127.0.0.1:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: web,
    locale: "pl-PL",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: [
    {
      command: "go run ./cmd/api",
      cwd: "../backend",
      url: `${api}/api/v1/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: "npx next dev -H 127.0.0.1 -p 3000",
      url: web,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: { NEXT_PUBLIC_API_URL: api },
    },
  ],
});
