/**
 * 代表性四轴视觉回归基线 —— 只在 Chromium 固定环境下截局部图。
 *
 * 四组覆盖主要宿主默认组合（不穷举四轴）：
 *   quarry     slate × dark × classic × normal
 *   engram     ink × light × soft × quiet
 *   jsontailor tokyo × dark × glass × quiet
 *   ai         everforest × dark × classic × quiet
 *
 * Firefox / WebKit 继续承担几何、交互与 a11y 门禁，不维护像素基线。
 */
import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import { applyAndAssertAxes, stabilizeForVisual, type VisualAxes } from './visual-stabilize';

const DEMO_URL = pathToFileURL(
  path.resolve(__dirname, '../demo/fitting-room.html')
).href;

/** 与 README / VOYAGE_APP_DEFAULTS 对齐的四组代表组合 */
const BASELINES: ReadonlyArray<{
  id: string;
  label: string;
  axes: VisualAxes;
}> = [
  {
    id: 'quarry',
    label: 'Quarry 兼容基准',
    axes: { theme: 'slate', mode: 'dark', style: 'classic', tone: 'normal' },
  },
  {
    id: 'engram',
    label: 'Engram 默认组合',
    axes: { theme: 'ink', mode: 'light', style: 'soft', tone: 'quiet' },
  },
  {
    id: 'jsontailor',
    label: 'JsonTailor 默认组合',
    axes: { theme: 'tokyo', mode: 'dark', style: 'glass', tone: 'quiet' },
  },
  {
    id: 'ai',
    label: 'AI 预定默认组合',
    axes: { theme: 'everforest', mode: 'dark', style: 'classic', tone: 'quiet' },
  },
];

const SCREENSHOT = {
  animations: 'disabled' as const,
  caret: 'hide' as const,
  // 同环境连续跑应零像素差；跨字体轻微 AA 由 threshold 吸收边缘
  maxDiffPixels: 0,
  threshold: 0.05,
};

test.describe('代表性四轴视觉回归', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DEMO_URL);
    // 零构建静态认证组件展示（Vite React 挂载会藏掉它）
    await expect(page.locator('#componentStatic')).toBeVisible();
    await stabilizeForVisual(page);
  });

  for (const baseline of BASELINES) {
    test(`${baseline.label} (${baseline.id})`, async ({ page }) => {
      await applyAndAssertAxes(page, baseline.axes);

      // soft：一次跑齐所有局部图，CI 失败产物里能一次拿到完整 actual/diff 集
      const shot = async (selector: string, name: string) => {
        await expect.soft(page.locator(selector)).toHaveScreenshot(name, SCREENSHOT);
      };

      // 顶栏控件（语言 / 明暗 / 调色板）
      await shot('#toolbar', `${baseline.id}-toolbar.png`);
      // 关键内容容器（含顶栏 + 侧栏 + 编辑区，高度由 .vg-app 固定）
      await shot('#fit', `${baseline.id}-app.png`);
      // 语义色标尺 + 状态徽章
      await shot('#semantic', `${baseline.id}-semantic.png`);
      await shot('#semantic-badges', `${baseline.id}-semantic-badges.png`);
      // StateView / Spinner / AccountMenu 静态展示
      await shot('#component-demo', `${baseline.id}-auth-components.png`);
    });
  }
});
