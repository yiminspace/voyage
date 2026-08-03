import { expect, test } from '@playwright/test';
import { expectNoSeriousA11yViolations } from './helpers';

const DEMO_URL = 'http://127.0.0.1:4173/demo/fitting-room.html';

test.describe('试衣间可访问性门禁', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DEMO_URL);
  });

  test('试衣间主界面无 serious/critical 违规', async ({ page }) => {
    await expectNoSeriousA11yViolations(page, {
      // 语义色尺 / 大量示意文案不是交互面，排除以免噪声掩盖真实控件问题
      exclude: ['#semantic', '#palette'],
    });
  });

  test('主题菜单打开后无 serious/critical 违规', async ({ page }) => {
    await page.locator('#switcherTrigger').click();
    const panel = page.locator('#switcherPanel');
    await expect(panel).toBeVisible();
    await expectNoSeriousA11yViolations(page, { include: ['#switcher'] });
  });

  test('AccountMenu 退出按钮与 Reporter 表单无 serious/critical 违规', async ({ page }) => {
    await page.getByRole('button', { name: '用户菜单' }).click();
    await expect(page.getByRole('menuitem', { name: '退出登录' })).toBeVisible();
    await expectNoSeriousA11yViolations(page, { include: ['.vg-account-menu'] });

    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: '反馈当前页面' }).click();
    await expect(page.locator('.vg-reporter-hud[role="status"]')).toContainText('选择有问题的内容');
    await page.locator('#switcherMode').click();
    const dialog = page.getByRole('dialog', { name: '报告问题' });
    await expect(dialog).toBeVisible();
    await expectNoSeriousA11yViolations(page, { include: ['.vg-reporter-panel'] });
  });
});
