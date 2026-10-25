import { expect, test } from '@playwright/test';

test('exam chips resolve their scoped tokens independently of the selected theme', async ({ page }) => {
  await page.goto('http://127.0.0.1:4173/demo/fitting-room.html');
  for (const selector of ['[data-pick="examhall"] i', '[data-style-pick="plain"] i']) {
    const swatch = page.locator(selector);
    await expect(swatch).toHaveAttribute('data-theme', 'examhall');
    await expect(swatch).toHaveAttribute('data-mode', 'light');
    const before = await swatch.evaluate((element) => getComputedStyle(element).backgroundColor);
    expect(before).not.toBe('rgba(0, 0, 0, 0)');
    await page.locator('[data-pick="iris"]').click();
    await expect(swatch).toHaveCSS('background-color', before);
  }
});
