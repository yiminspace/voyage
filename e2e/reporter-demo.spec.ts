import { expect, test } from '@playwright/test';
import packageJson from '../package.json';

const DEMO_URL =
  'http://127.0.0.1:4173/demo/fitting-room.html?token=must-not-leak#reporter-demo';

test.describe('VoyageIssueReporter 功能试驾', () => {
  test('点选业务元素不会误触，并可看到本地 intake 收到的脱敏证据', async ({ page }) => {
    await page.goto(DEMO_URL);

    const fittingRoom = page.locator('#fit');
    await expect(fittingRoom).toHaveAttribute('data-mode', 'dark');

    await page.getByRole('button', { name: '反馈当前页面' }).click();
    await expect(page.locator('.vg-reporter-hud[role="status"]')).toContainText('选择有问题的内容');

    // 选择本来会切换明暗的业务按钮；Reporter 应吞掉这次 click。
    await page.locator('#switcherMode').click();
    await expect(fittingRoom).toHaveAttribute('data-mode', 'dark');
    await expect(page.getByRole('dialog', { name: '报告问题' })).toBeVisible();

    const highlightDocumentTop = await page
      .locator('.vg-reporter-highlight.saved')
      .evaluate((element) => (element as HTMLElement).style.top);
    await page.evaluate(() => window.scrollBy(0, 120));
    const [targetBox, highlightBox] = await Promise.all([
      page.locator('#switcherMode').boundingBox(),
      page.locator('.vg-reporter-highlight.saved').boundingBox(),
    ]);
    expect(targetBox).not.toBeNull();
    expect(highlightBox).not.toBeNull();
    expect(highlightBox!.x).toBeCloseTo(targetBox!.x, 1);
    expect(highlightBox!.y).toBeCloseTo(targetBox!.y, 1);
    await expect(page.locator('.vg-reporter-highlight.saved')).toHaveClass(/document/);
    expect(
      await page
        .locator('.vg-reporter-highlight.saved')
        .evaluate((element) => (element as HTMLElement).style.top)
    ).toBe(highlightDocumentTop);

    await page.getByRole('button', { name: '添加区域' }).click();
    await expect(page.locator('.vg-reporter-hud[role="status"]')).toContainText('已选择 1 个区域');
    await page.locator('#switcherTrigger').click();
    await expect(page.locator('#switcherPanel')).toBeHidden();
    await expect(page.getByText('已选择 2 个区域')).toBeVisible();
    await page.getByRole('button', { name: '内容有误' }).click();
    await expect(page.getByRole('button', { name: '内容有误' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await expect(page.getByRole('button', { name: '外观异常' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    await page.getByLabel('哪里不对？你期望怎样？').fill(
      '试衣间演示：这个按钮的交互需要检查'
    );
    await page.getByRole('button', { name: '提交', exact: true }).click();

    await expect(page.getByText('问题已提交')).toBeVisible();
    await expect(page.locator('.vg-reporter-highlight.saved')).toHaveCount(0);
    const evidence = page.getByRole('dialog', { name: '本地 intake 收到的证据包' });
    await expect(evidence).toBeVisible();
    const evidenceJson = evidence.locator('pre');
    await expect
      .poll(() => evidenceJson.evaluate((element) => element.scrollHeight > element.clientHeight))
      .toBe(true);
    await evidenceJson.hover();
    await page.mouse.wheel(0, 600);
    await expect
      .poll(() => evidenceJson.evaluate((element) => element.scrollTop))
      .toBeGreaterThan(0);

    const report = JSON.parse(await evidenceJson.innerText());
    expect(report).toMatchObject({
      schema: 'voyage-ui-issue/v1',
      kind: 'appearance',
      kinds: ['appearance', 'content'],
      labels: ['intake'],
      destination: { provider: 'github-issue' },
      app: { name: 'voyage-fitting-room' },
      metadata: { demo: true, createsRealIssue: false },
      page: {
        url: 'http://127.0.0.1:4173/demo/fitting-room.html#reporter-demo',
      },
    });
    expect(report.page.url).not.toContain('token');
    expect(report.targets).toHaveLength(2);
    expect(report.targets.map((target: { selector: string }) => target.selector)).toEqual([
      '#switcherMode',
      '#switcherTrigger',
    ]);
    expect(report.targets[0]).toMatchObject({
      role: 'button',
      contentMasked: false,
      rectSpace: 'viewport',
      scroll: { x: 0, y: 0 },
    });
    expect(report.targets[0].capturedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(report.targets[0].documentRect).toMatchObject(report.targets[0].rect);
    expect(report.targets[1].documentRect.top).toBeCloseTo(
      report.targets[1].rect.top + report.targets[1].scroll.y,
      2
    );
    expect(report.targets[0].computedStyle).toBeTruthy();
    expect(report.targets[0].tokens).toBeTruthy();
    expect(report.voyage.version).toBe(packageJson.version);
  });
});
