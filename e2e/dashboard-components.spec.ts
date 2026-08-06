import { expect, test } from '@playwright/test';
import { expectNoSeriousA11yViolations } from './helpers';

const DASHBOARD_URL = 'http://127.0.0.1:4173/demo/dashboard.html';

test.describe('dashboard component family', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DASHBOARD_URL);
  });

  test('主从选择同步 inspector 且不依赖宿主样式', async ({ page }) => {
    const healthTask = page.getByRole('button', { name: /服务健康巡检 每 30 分钟/ });
    await healthTask.click();
    await expect(healthTask).toHaveAttribute('aria-current', 'true');
    await expect(page.getByRole('complementary').getByRole('heading', { name: '服务健康巡检' })).toBeVisible();

    const deepChoice = page.getByRole('button', { name: /深度 优先复杂任务质量/ });
    await deepChoice.click();
    await expect(deepChoice).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('complementary')).toContainText('深度模型');
  });

  test('light/dark 均无 serious 或 critical 可访问性问题', async ({ page }) => {
    await expectNoSeriousA11yViolations(page, { include: ['.vg-dashboard'] });

    await page.getByRole('button', { name: '切换为暗色模式' }).click();
    await expect(page.locator('.vg')).toHaveAttribute('data-mode', 'dark');
    await expectNoSeriousA11yViolations(page, { include: ['.vg-dashboard'] });
  });

  test('小屏退化为单列且 inspector 不粘滞', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const workspace = page.locator('.vg-dashboard-workspace');
    await expect(workspace).toHaveCSS('grid-template-columns', '366px');
    await expect(page.getByRole('complementary')).toHaveCSS('position', 'static');
  });
});
