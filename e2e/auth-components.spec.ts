import { expect, test } from '@playwright/test';

const DEMO_URL = 'http://127.0.0.1:4173/demo/fitting-room.html';

test.beforeEach(async ({ page }) => {
  await page.goto(DEMO_URL);
});

test.describe('认证组件地基', () => {
  test('StateView 的可见颜色来自 vg 语义 token', async ({ page }) => {
    const loading = page.locator('#componentDemoRoot .vg-state-view-loading');
    const error = page.locator('#componentDemoRoot .vg-state-view-error');
    await expect(loading).toBeVisible();
    await expect(error).toContainText('登录失败');

    const colors = await page.locator('#component-demo').evaluate((host) => {
      const description = host.querySelector<HTMLElement>('.vg-state-view-description')!;
      const errorIcon = host.querySelector<HTMLElement>('.vg-state-view-error .vg-state-view-icon')!;
      const probe = document.createElement('span');
      host.appendChild(probe);
      const read = (token: string) => {
        probe.style.color = `var(${token})`;
        return getComputedStyle(probe).color;
      };
      const result = {
        description: getComputedStyle(description).color,
        mutedToken: read('--vg-color-text-muted'),
        errorIcon: getComputedStyle(errorIcon).color,
        dangerToken: read('--vg-color-danger'),
      };
      probe.remove();
      return result;
    });

    expect(colors.description).toBe(colors.mutedToken);
    expect(colors.errorIcon).toBe(colors.dangerToken);
  });

  test('AccountMenu 使用原生 Popover、管理焦点并可完成登录态切换', async ({ page }) => {
    const trigger = page.getByRole('button', { name: '用户菜单' });
    const triggerBox = await trigger.boundingBox();
    expect(triggerBox).not.toBeNull();
    expect(triggerBox!.width).toBeGreaterThanOrEqual(24);
    expect(triggerBox!.height).toBeGreaterThanOrEqual(24);

    await trigger.click();
    const menu = page.getByRole('menu', { name: '用户菜单' });
    const logout = page.getByRole('menuitem', { name: '退出登录' });
    await expect(menu).toBeVisible();
    await expect(menu).toHaveAttribute('popover', 'auto');
    expect(await menu.evaluate((element) => element.matches(':popover-open'))).toBe(true);
    await expect(logout).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await expect(trigger).toBeFocused();

    await trigger.click();
    await page.getByRole('menuitem', { name: '退出登录' }).click();
    const login = page.getByRole('button', { name: '登录' });
    await expect(login).toBeVisible();
    await login.click();
    await expect(page.getByRole('button', { name: '用户菜单' })).toBeVisible();
  });

  test('reduced motion 下 spinner 不播放旋转动画', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    const spinner = page.locator('#componentDemoRoot .vg-spinner').first();
    await expect(spinner).toBeVisible();
    expect(await spinner.evaluate((element) => getComputedStyle(element).animationName)).toBe('none');
  });
});
