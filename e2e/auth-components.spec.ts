import { expect, test } from '@playwright/test';
import { expectNoSeriousA11yViolations, expectPopoverOpenOrFallback } from './helpers';

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

  test('StateView loading/info/error 暴露正确 role、live region、busy 与可访问名称', async ({
    page,
  }) => {
    const loading = page.locator('#componentDemoRoot .vg-state-view-loading');
    const info = page.locator('#componentDemoRoot .vg-state-view-info');
    const error = page.locator('#componentDemoRoot .vg-state-view-error');

    await expect(loading).toHaveAttribute('role', 'status');
    await expect(loading).toHaveAttribute('aria-live', 'polite');
    await expect(loading).toHaveAttribute('aria-busy', 'true');
    await expect(loading.getByRole('heading', { name: '正在处理登录' })).toBeVisible();

    await expect(info).toHaveAttribute('role', 'status');
    await expect(info).toHaveAttribute('aria-live', 'polite');
    await expect(info).not.toHaveAttribute('aria-busy', 'true');
    await expect(info.getByRole('heading', { name: '需要登录' })).toBeVisible();

    await expect(error).toHaveAttribute('role', 'alert');
    await expect(error).toHaveAttribute('aria-live', 'assertive');
    await expect(error).not.toHaveAttribute('aria-busy', 'true');
    await expect(error.getByRole('heading', { name: '登录失败' })).toBeVisible();
  });

  test('AccountMenu 使用原生 Popover 或 React fallback，管理焦点并可完成登录态切换', async ({
    page,
  }) => {
    const trigger = page.getByRole('button', { name: '用户菜单' });
    const triggerBox = await trigger.boundingBox();
    expect(triggerBox).not.toBeNull();
    expect(triggerBox!.width).toBeGreaterThanOrEqual(24);
    expect(triggerBox!.height).toBeGreaterThanOrEqual(24);

    await trigger.click();
    const menu = page.getByRole('menu', { name: '用户菜单' });
    const logout = page.getByRole('menuitem', { name: '退出登录' });
    await expectPopoverOpenOrFallback(menu);
    await expect(logout).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await expect(trigger).toBeFocused();

    await trigger.click();
    await page.getByRole('menuitem', { name: '退出登录' }).click();
    const login = page.getByRole('button', { name: '登录', exact: true });
    await expect(login).toBeVisible();
    await login.click();
    await expect(page.getByRole('button', { name: '用户菜单' })).toBeVisible();
  });

  test('AccountMenu 可用键盘打开、方向键/Home/End 导航，Esc 关闭并归还焦点', async ({
    page,
  }) => {
    const trigger = page.getByRole('button', { name: '用户菜单' });
    await trigger.focus();
    await page.keyboard.press('Enter');

    const menu = page.getByRole('menu', { name: '用户菜单' });
    await expectPopoverOpenOrFallback(menu);
    const logout = page.getByRole('menuitem', { name: '退出登录' });
    await expect(logout).toBeFocused();

    // 临时插入第二项，验证方向键与 Home/End 契约（组件只导出登出项）
    await menu.evaluate((element) => {
      const extra = document.createElement('button');
      extra.type = 'button';
      extra.className = 'vg-account-item';
      extra.setAttribute('role', 'menuitem');
      extra.textContent = '账户设置';
      element.appendChild(extra);
    });
    const settings = page.getByRole('menuitem', { name: '账户设置' });

    await page.keyboard.press('ArrowDown');
    await expect(settings).toBeFocused();
    await page.keyboard.press('ArrowUp');
    await expect(logout).toBeFocused();
    await page.keyboard.press('End');
    await expect(settings).toBeFocused();
    await page.keyboard.press('Home');
    await expect(logout).toBeFocused();

    await page.keyboard.press('Escape');
    await expect(menu).toHaveCount(0);
    await expect(trigger).toBeFocused();
  });

  test('reduced motion 下停止 spinner 与非必要过渡', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });

    const spinner = page.locator('#componentDemoRoot .vg-spinner').first();
    await expect(spinner).toBeVisible();
    expect(await spinner.evaluate((element) => getComputedStyle(element).animationName)).toBe(
      'none'
    );

    const motion = await page.evaluate(() => {
      const modeWrap = document.querySelector('.vg-mode-wrap');
      const dot = document.querySelector('.vg-dot');
      const modeStyle = modeWrap ? getComputedStyle(modeWrap) : null;
      const dotStyle = dot ? getComputedStyle(dot) : null;
      return {
        modeAnimation: modeStyle?.animationName ?? 'missing',
        modeTransition: modeStyle?.transitionProperty ?? 'missing',
        modeTransitionDuration: modeStyle?.transitionDuration ?? 'missing',
        dotTransition: dotStyle?.transitionProperty ?? 'missing',
        dotTransitionDuration: dotStyle?.transitionDuration ?? 'missing',
      };
    });

    expect(motion.modeAnimation).toBe('none');
    // 非必要过渡应被关掉：property 为 none，或 duration 为 0s
    const transitionOff = (property: string, duration: string) =>
      property === 'none' || duration.split(',').every((part) => part.trim() === '0s');
    expect(transitionOff(motion.modeTransition, motion.modeTransitionDuration)).toBe(true);
    expect(transitionOff(motion.dotTransition, motion.dotTransitionDuration)).toBe(true);
  });

  test('认证组件区域无 serious/critical 可访问性违规', async ({ page }) => {
    await expectNoSeriousA11yViolations(page, { include: ['#componentDemoRoot'] });

    await page.getByRole('button', { name: '用户菜单' }).click();
    await expect(page.getByRole('menu', { name: '用户菜单' })).toBeVisible();
    await expectNoSeriousA11yViolations(page, { include: ['#componentDemoRoot'] });
  });
});
