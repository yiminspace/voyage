import { expect, test } from '@playwright/test';
import { applyAndAssertAxes } from './visual-stabilize';

const DEMO_URL = 'http://127.0.0.1:4173/demo/fitting-room.html';

const EXPECTED = {
  light: {
    background: 'rgb(242, 241, 232)',
    foreground: 'rgb(39, 43, 32)',
    accent: '#b93a28',
    ok: '#1c6e55',
    red: '#c63255',
  },
  dark: {
    background: 'rgb(14, 28, 48)',
    foreground: 'rgb(219, 228, 244)',
    accent: '#ff8f77',
    ok: '#55cfa4',
    red: '#ff6f91',
  },
} as const;

for (const mode of ['light', 'dark'] as const) {
  test(`Trace ${mode} 保持记录纸/蓝图色板及方向语义`, async ({ page }) => {
    await page.goto(DEMO_URL);
    await applyAndAssertAxes(page, {
      theme: 'trace',
      mode,
      style: 'classic',
      tone: 'quiet',
    });

    const values = await page.locator('#fit').evaluate((element) => {
      const computed = getComputedStyle(element);
      return {
        background: computed.backgroundColor,
        foreground: computed.color,
        accent: computed.getPropertyValue('--accent').trim(),
        ok: computed.getPropertyValue('--ok').trim(),
        red: computed.getPropertyValue('--red').trim(),
      };
    });

    expect(values).toEqual(EXPECTED[mode]);
  });
}
