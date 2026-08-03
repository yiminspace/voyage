import { defineConfig, devices } from '@playwright/test';

// 纯视觉契约继续用 file:// 打开 fitting-room，保证零构建基准不被破坏；
// Reporter 功能试驾经 Vite 加载真实 React 组件，因此测试时同时启动本地 demo server。
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // 不靠重试掩盖不稳定: 用例本身必须确定性通过。
  retries: 0,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : 'list',
  webServer: {
    command: 'pnpm exec vite --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173/demo/fitting-room.html',
    reuseExistingServer: !process.env.CI,
  },
  use: {
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
