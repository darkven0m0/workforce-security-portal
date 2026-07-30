import {
  defineConfig
} from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  reporter: [
    ["list"],
    ["html", {
      open: "never"
    }]
  ],

  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure"
  },

  webServer: {
    command:
      "ENABLE_TEST_ROUTES=true npm run dev",
    url: "http://127.0.0.1:3000/health",
    reuseExistingServer: false,
    timeout: 30_000
  }
});
