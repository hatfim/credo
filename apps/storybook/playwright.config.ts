import { defineConfig, devices } from "@playwright/test";
import { snapshotDir, updating } from "./visual/paths";

const port = Number(process.env.VISUAL_PORT ?? 6007);

// TODO(decision: snapshot-setup): spike C (P0-07) is not done. This is the conservative setup from
// D-07: self-hosted Playwright snapshots, chromium only, baselines committed, Linux CI only.
export default defineConfig({
  testDir: "./visual",
  testMatch: "*.spec.ts",
  globalSetup: "./visual/global-setup.ts",
  outputDir: "./test-results/visual",
  snapshotPathTemplate: `${snapshotDir}/{arg}{ext}`,
  // Baselines are never written implicitly: a missing baseline fails instead of being created.
  updateSnapshots: updating ? "all" : "none",
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  retries: 0, // a flaky test is fixed or quarantined, never retried (PRD 10.1)
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]]
    : [["list"]],
  expect: {
    toHaveScreenshot: { animations: "disabled", caret: "hide", scale: "css", maxDiffPixelRatio: 0 },
  },
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    ...devices["Desktop Chrome"],
    viewport: { width: 800, height: 600 },
    deviceScaleFactor: 1,
    reducedMotion: "reduce",
    colorScheme: "light",
    locale: "en-US",
    timezoneId: "UTC",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: {
    command: "node visual/serve.mjs",
    url: `http://127.0.0.1:${port}/index.json`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
