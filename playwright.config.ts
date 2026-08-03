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
  expect: {
    toHaveScreenshot: {
      // 动画由用例侧 animations:'disabled' + stabilize 双重钉死
      animations: 'disabled',
      caret: 'hide',
    },
  },
  // 不带 OS 后缀：基线以 Linux Chromium（CI / Docker）为唯一真源
  snapshotPathTemplate:
    '{testDir}/{testFilePath}-snapshots/{arg}{ext}',
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      testIgnore: /visual-regression\.spec\.ts/,
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
      testIgnore: /visual-regression\.spec\.ts/,
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
      testIgnore: /visual-regression\.spec\.ts/,
    },
    // 像素基线只在 Chromium 固定 viewport/DSF 下维护，避免三引擎抗锯齿分叉。
    {
      name: 'chromium-visual',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
        // 与 stabilizeForVisual 的 emulateMedia 一致；此处再钉一层防漏
        reducedMotion: 'reduce',
      },
      testMatch: /visual-regression\.spec\.ts/,
    },
  ],
});
