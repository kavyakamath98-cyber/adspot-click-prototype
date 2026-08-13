import { defineConfig, devices } from "@playwright/test";

const SYSTEM_CHROMIUM =
  process.env["PLAYWRIGHT_CHROMIUM_EXECUTABLE"] ||
  "/bin/chromium";

export default defineConfig({
  testDir: ".",
  fullyParallel: false,
  forbidOnly: !!process.env["CI"],
  retries: process.env["CI"] ? 2 : 0,
  workers: 1,
  reporter: [["list"], ["json", { outputFile: "tests/audit/results/results.json" }]],
  use: {
    baseURL: "http://localhost:8080",
    trace: "on",
    screenshot: "on",
    video: "off",
    headless: true,
    viewport: { width: 1280, height: 900 },
    launchOptions: {
      executablePath: SYSTEM_CHROMIUM,
      args: ["--no-sandbox"],
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
