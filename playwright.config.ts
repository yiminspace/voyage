import { defineConfig, devices } from '@playwright/test';

// 被测页是 demo/fitting-room.html —— 已经是视觉回归基准, 不依赖 React 运行时,
// 用 file:// 直接打开即可, 不需要额外起静态服务器。
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // 不靠重试掩盖不稳定: 用例本身必须确定性通过。
  retries: 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
