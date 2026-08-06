import { expect, test } from '@playwright/test';
import { applyAndAssertAxes } from './visual-stabilize';

const DEMO_URL = 'http://127.0.0.1:4173/demo/fitting-room.html';

function channel(value: number) {
  const normalized = value / 255;
  return normalized <= 0.04045
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function contrast(foreground: number[], background: number[]) {
  const luminance = ([r, g, b]: number[]) =>
    0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
  const a = luminance(foreground);
  const b = luminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

function rgb(value: string): number[] {
  const hex = value.trim().match(/^#([0-9a-f]{6})$/i)?.[1];
  if (hex) return [0, 2, 4].map((offset) => Number.parseInt(hex.slice(offset, offset + 2), 16));
  const channels = value.match(/[\d.]+/g)?.slice(0, 3).map(Number);
  if (!channels || channels.length !== 3) throw new Error(`无法解析颜色: ${value}`);
  return channels;
}

for (const mode of ['light', 'dark'] as const) {
  test(`Taskdeck ${mode} 保持高对比与云圆结构`, async ({ page }) => {
    await page.goto(DEMO_URL);
    await applyAndAssertAxes(page, {
      theme: 'iris',
      mode,
      style: 'cloud',
      tone: 'crisp',
    });

    const app = page.locator('#fit');
    const button = app.locator('.vg-btn:not(.primary)').first();
    const primary = app.locator('.vg-btn.primary').first();

    const styles = await app.evaluate((element) => {
      const computed = getComputedStyle(element);
      return {
        background: computed.backgroundColor,
        foreground: computed.color,
        muted: computed.getPropertyValue('--fg3').trim(),
        radius: computed.borderRadius,
      };
    });
    const buttonStyles = await button.evaluate((element) => {
      const computed = getComputedStyle(element);
      return {
        radius: computed.borderRadius,
        border: computed.borderColor,
      };
    });
    const primaryStyles = await primary.evaluate((element) => ({
      background: getComputedStyle(element).backgroundColor,
    }));

    expect(styles.radius).toBe('24px');
    expect(buttonStyles.radius).toBe('12px');
    expect(buttonStyles.border).toBe(mode === 'light' ? 'rgb(152, 162, 179)' : 'rgb(83, 98, 125)');
    expect(primaryStyles.background).toBe(mode === 'light' ? 'rgb(101, 88, 232)' : 'rgb(155, 140, 255)');
    expect(contrast(rgb(styles.foreground), rgb(styles.background))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(rgb(styles.muted), rgb(styles.background))).toBeGreaterThanOrEqual(4.5);
  });
}
