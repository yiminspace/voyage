import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/demo/exam-tokens.html?theme=ielts');
  await expect(page.locator('#exam-root')).toHaveAttribute('data-theme', 'ielts');
});

test('IELTS daily controls retain Arial, white/grey surfaces and near-square corners', async ({ page }) => {
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'ielts');
  const daily = await page.locator('#daily-surface .vg-btn.primary').evaluate((el) => {
    const style = getComputedStyle(el);
    return { radius: style.borderRadius, family: style.fontFamily, background: style.backgroundColor, color: style.color };
  });
  expect(daily).toMatchObject({ radius: '2px', background: 'rgb(0, 0, 0)', color: 'rgb(255, 255, 255)' });
  expect(daily.family.replace(/["']/g, '')).toMatch(/^Arial,/);
  expect(await page.locator('#exam-rubric').evaluate((el) => getComputedStyle(el).backgroundColor)).toBe('rgb(241, 241, 237)');
  await page.locator('#exam-gap-1').focus();
  expect(await page.locator('#exam-gap-1').evaluate((el) => getComputedStyle(el).outlineOffset)).toBe('2px');
});

test('IELTS contrast, size and nested root remain independent of the daily theme', async ({ page }) => {
  const root = page.locator('#exam-root');
  for (const [label, mode, foreground] of [
    ['Black on white', 'light', 'rgb(0, 0, 0)'],
    ['White on black', 'dark', 'rgb(255, 255, 255)'],
    ['Yellow on black', 'dark', 'rgb(255, 234, 0)'],
  ] as const) {
    await page.getByRole('radio', { name: label, exact: true }).check();
    await expect(root).toHaveAttribute('data-theme', 'ielts');
    await expect(root).toHaveAttribute('data-mode', mode);
    expect(await root.evaluate((el) => getComputedStyle(el).color)).toBe(foreground);
  }
  await page.getByRole('radio', { name: 'Large', exact: true }).check();
  expect(await root.evaluate((el) => getComputedStyle(el).fontSize)).toBe('19px');
  await page.getByRole('button', { name: 'Theme settings' }).click();
  await page.getByRole('menuitemradio', { name: 'Signal', exact: true }).hover();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'signal');
  await expect(root).toHaveAttribute('data-theme', 'ielts');
  expect(await root.evaluate((el) => getComputedStyle(el).color)).toBe('rgb(255, 234, 0)');
});
