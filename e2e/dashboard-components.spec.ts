import { expect, test } from '@playwright/test';
import { disableNativePopover, expectNoSeriousA11yViolations } from './helpers';

const DASHBOARD_URL = 'http://127.0.0.1:4173/demo/dashboard.html';

async function expectKeyboardPopoverExclusion(page: import('@playwright/test').Page) {
  const paletteTrigger = page.getByRole('button', { name: '展开主题设置' });
  const accountTrigger = page.getByRole('button', { name: '用户菜单' });

  await paletteTrigger.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menu', { name: '主题设置' })).toBeVisible();
  await expect(paletteTrigger).toHaveAttribute('aria-expanded', 'true');

  await accountTrigger.focus();
  await expect(page.getByRole('menu', { name: '主题设置' })).toHaveCount(0);
  await expect(paletteTrigger).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menu', { name: '用户菜单' })).toBeVisible();
  await expect(accountTrigger).toHaveAttribute('aria-expanded', 'true');

  await paletteTrigger.focus();
  await expect(page.getByRole('menu', { name: '用户菜单' })).toHaveCount(0);
  await expect(accountTrigger).toHaveAttribute('aria-expanded', 'false');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('menu', { name: '主题设置' })).toBeVisible();
  await expect(paletteTrigger).toHaveAttribute('aria-expanded', 'true');
}

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

  test('Toolbar 把账户入口放在调色板之后并保持身份区垂直居中', async ({ page }) => {
    const toolbar = page.locator('.vg-topbar');
    const mode = toolbar.locator('.vg-switcher-mode');
    const palette = toolbar.locator('.vg-switcher-trigger');
    const account = toolbar.getByRole('button', { name: '用户菜单' });

    await expect(account).toBeVisible();
    const order = await toolbar.locator('button').evaluateAll((buttons) =>
      buttons.map((button) => button.className)
    );
    expect(order).toHaveLength(3);
    expect(order[0]).toContain('vg-switcher-mode');
    expect(order[1]).toContain('vg-switcher-trigger');
    expect(order[2]).toContain('vg-account-trigger');

    const [modeBox, paletteBox, accountBox, toolbarBox] = await Promise.all([
      mode.boundingBox(),
      palette.boundingBox(),
      account.boundingBox(),
      toolbar.boundingBox(),
    ]);
    expect(modeBox).not.toBeNull();
    expect(paletteBox).not.toBeNull();
    expect(accountBox).not.toBeNull();
    expect(toolbarBox).not.toBeNull();
    expect(accountBox!.height).toBeGreaterThan(modeBox!.height);
    expect(modeBox!.y + modeBox!.height / 2).toBeCloseTo(accountBox!.y + accountBox!.height / 2, 1);
    expect(paletteBox!.y + paletteBox!.height / 2).toBeCloseTo(accountBox!.y + accountBox!.height / 2, 1);
    expect(toolbarBox!.height).toBeCloseTo(accountBox!.height, 1);
  });

  test('Toolbar 中主题面板与账户菜单按鼠标路径互斥', async ({ page }) => {
    await page.getByRole('button', { name: '展开主题设置' }).click();
    await expect(page.getByRole('menu', { name: '主题设置' })).toBeVisible();

    await page.getByRole('button', { name: '用户菜单' }).click();
    await expect(page.getByRole('menu', { name: '主题设置' })).toHaveCount(0);
    await expect(page.getByRole('menu', { name: '用户菜单' })).toBeVisible();

    await page.getByRole('button', { name: '展开主题设置' }).click();
    await expect(page.getByRole('menu', { name: '用户菜单' })).toHaveCount(0);
    await expect(page.getByRole('menu', { name: '主题设置' })).toBeVisible();
  });

  test('Toolbar 中主题面板与账户菜单按键盘路径互斥', async ({ page }) => {
    await expectKeyboardPopoverExclusion(page);
  });

  test('小屏退化为单列且 inspector 不粘滞', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const workspace = page.locator('.vg-dashboard-workspace');
    await expect(workspace).toHaveCSS('grid-template-columns', '366px');
    await expect(page.getByRole('complementary')).toHaveCSS('position', 'static');
  });
});

test.describe('dashboard Toolbar React fallback', () => {
  test('禁用原生 Popover 后键盘路径仍只保留一个浮层', async ({ page }) => {
    await disableNativePopover(page);
    await page.goto(DASHBOARD_URL);
    await expectKeyboardPopoverExclusion(page);
  });
});
