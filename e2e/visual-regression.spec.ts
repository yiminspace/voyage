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
import { applyAndAssertAxes, stabilizeForVisual, type VisualAxes } from './visual-stabilize';

/** Vite 试衣间：加载真实 React StateView / Spinner / AccountMenu */
const DEMO_URL = 'http://127.0.0.1:4173/demo/fitting-room.html';

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
  // 基线以 Linux Chromium（CI）为真源；macOS 抗锯齿会分叉，本地请用 Docker / Actions 更新。
  test.skip(
    process.platform !== 'linux' && !process.env.CI && !process.env.VOYAGE_VISUAL_FORCE,
    '视觉基线仅在 Linux Chromium 核对；设置 VOYAGE_VISUAL_FORCE=1 可强制本地跑'
  );

  test.beforeEach(async ({ page }) => {
    await page.goto(DEMO_URL);
    // 真实 React 认证组件（Vite 会隐藏 #componentStatic）
    await expect(page.locator('#componentStatic')).toBeHidden();
    await expect(page.locator('#componentDemoRoot .vg-state-view-loading')).toBeVisible();
    await expect(page.getByRole('button', { name: '用户菜单' })).toBeVisible();
    // 触发器几何门禁：真实 .vg-account-trigger，而非静态替身
    const triggerBox = await page.getByRole('button', { name: '用户菜单' }).boundingBox();
    expect(triggerBox).not.toBeNull();
    expect(triggerBox!.width).toBeGreaterThanOrEqual(24);
    expect(triggerBox!.height).toBeGreaterThanOrEqual(24);
    await stabilizeForVisual(page);
  });

  for (const baseline of BASELINES) {
    test(`${baseline.label} (${baseline.id})`, async ({ page }) => {
      await applyAndAssertAxes(page, baseline.axes);

      // soft：一次跑齐所有局部图，CI 失败产物里能一次拿到完整 actual/diff 集
      const shot = async (selector: string, name: string) => {
        await expect.soft(page.locator(selector)).toHaveScreenshot(name, SCREENSHOT);
      };

      // 顶栏控件（语言 / 明暗 / 调色板；Reporter 入口在 stabilize 里藏掉）
      await shot('#toolbar', `${baseline.id}-toolbar.png`);
      // 关键内容容器（含顶栏 + 侧栏 + 编辑区，高度由 .vg-app 固定）
      await shot('#fit', `${baseline.id}-app.png`);
      // 语义色标尺 + 状态徽章
      await shot('#semantic', `${baseline.id}-semantic.png`);
      await shot('#semantic-badges', `${baseline.id}-semantic-badges.png`);

      // 真实 StateView / Spinner / AccountMenu 触发器（Vite React）
      await shot('#component-demo', `${baseline.id}-auth-components.png`);

      // 打开真实 AccountMenu，单独截浮层（top-layer / fixed 不影响元素截图）
      const trigger = page.getByRole('button', { name: '用户菜单' });
      await trigger.click();
      const menu = page.getByRole('menu', { name: '用户菜单' });
      await expect(menu).toBeVisible();
      await expect(menu.getByRole('menuitem', { name: '退出登录' })).toBeVisible();
      await expect.soft(menu).toHaveScreenshot(`${baseline.id}-account-menu.png`, SCREENSHOT);
    });
  }
});
