import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  timeout: 15000,
  fullyParallel: false,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://127.0.0.1:3000"
  },
  webServer: {
    command: "npm run dev",
    url: "http://127.0.0.1:3000/health",
    reuseExistingServer: true,
    timeout: 30000
  }
});
