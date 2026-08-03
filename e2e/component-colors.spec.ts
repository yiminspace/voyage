/**
 * 组件层颜色契约: 状态点 / prod 文字 / modal 遮罩 / 浮层阴影
 * 必须由 Voyage token 求值, 不能落回透明或硬编码黑。
 */
import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const DEMO_URL = pathToFileURL(
  path.resolve(__dirname, '../demo/fitting-room.html')
).href;

type Matrix = {
  theme: string;
  mode: string;
  style: string;
  tone: string;
};

const SLATE_DARK: Matrix = { theme: 'slate', mode: 'dark', style: 'classic', tone: 'normal' };
const INK_LIGHT: Matrix = { theme: 'ink', mode: 'light', style: 'soft', tone: 'quiet' };

async function mountProbe(page: Page, matrix: Matrix) {
  return page.evaluate((attrs) => {
    document.getElementById('vg-color-probe')?.remove();
    const root = document.createElement('div');
    root.id = 'vg-color-probe';
    root.className = 'vg';
    root.dataset.theme = attrs.theme;
    root.dataset.mode = attrs.mode;
    root.dataset.style = attrs.style;
    root.dataset.tone = attrs.tone;
    root.style.cssText = 'position:fixed;inset:0;pointer-events:none;';

    root.innerHTML = `
      <span class="vg-dot ok" data-probe="dot-ok"></span>
      <span class="vg-dot down" data-probe="dot-down"></span>
      <button type="button" class="vg-pill on prod" data-probe="prod">prod</button>
      <div class="vg-modal" data-probe="modal"></div>
      <div class="vg-acbox" data-probe="acbox" style="display:block"></div>
      <span data-probe="token-ok"></span>
      <span data-probe="token-red"></span>
      <span data-probe="token-on-fg"></span>
    `;
    document.body.appendChild(root);

    const paint = (el: HTMLElement, token: string) => {
      el.style.color = `var(${token}, transparent)`;
    };
    paint(root.querySelector('[data-probe="token-ok"]') as HTMLElement, '--ok');
    paint(root.querySelector('[data-probe="token-red"]') as HTMLElement, '--red');
    paint(root.querySelector('[data-probe="token-on-fg"]') as HTMLElement, '--on-fg');

    return true;
  }, matrix);
}

async function readProbe(page: Page) {
  return page.evaluate(() => {
    const root = document.getElementById('vg-color-probe')!;
    const styleOf = (sel: string) => getComputedStyle(root.querySelector(sel)!);
    const transparent = new Set(['transparent', 'rgba(0, 0, 0, 0)', 'none']);
    const modalBg = styleOf('[data-probe="modal"]').backgroundColor;
    const shadow = styleOf('[data-probe="acbox"]').boxShadow;
    // 状态点读 background, token 探针读 color —— 两者都是同一 token 的计算色
    const tokenColor = (sel: string) => styleOf(sel).color;
    return {
      dotOk: styleOf('[data-probe="dot-ok"]').backgroundColor,
      dotDown: styleOf('[data-probe="dot-down"]').backgroundColor,
      prodColor: styleOf('[data-probe="prod"]').color,
      tokenOk: tokenColor('[data-probe="token-ok"]'),
      tokenRed: tokenColor('[data-probe="token-red"]'),
      tokenOnFg: tokenColor('[data-probe="token-on-fg"]'),
      modalBg,
      shadow,
      modalOk: !transparent.has(modalBg.trim()),
      shadowOk: shadow.trim() !== 'none' && !transparent.has(shadow.trim()),
    };
  });
}

async function clearProbe(page: Page) {
  await page.evaluate(() => document.getElementById('vg-color-probe')?.remove());
}

test.describe('组件可见色来自 token 求值', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(DEMO_URL);
  });

  for (const matrix of [SLATE_DARK, INK_LIGHT]) {
    const label = `${matrix.theme}×${matrix.mode}×${matrix.style}×${matrix.tone}`;

    test(`${label}: 状态点与 prod 文字对齐语义 / 对比 token`, async ({ page }) => {
      await mountProbe(page, matrix);
      const got = await readProbe(page);
      expect(got.dotOk, 'vg-dot.ok 应对齐 --ok').toBe(got.tokenOk);
      expect(got.dotDown, 'vg-dot.down 应对齐 --red').toBe(got.tokenRed);
      expect(got.prodColor, 'prod 选中文字应对齐 --on-fg').toBe(got.tokenOnFg);
      await clearProbe(page);
    });
  }

  test('modal 遮罩与浮层阴影在代表性矩阵下有效且可区分', async ({ page }) => {
    await mountProbe(page, SLATE_DARK);
    const dark = await readProbe(page);
    await clearProbe(page);

    await mountProbe(page, INK_LIGHT);
    const light = await readProbe(page);
    await clearProbe(page);

    expect(dark.modalOk, 'slate dark modal 遮罩不应透明').toBe(true);
    expect(light.modalOk, 'ink light modal 遮罩不应透明').toBe(true);
    expect(dark.shadowOk, 'slate dark 浮层阴影不应无效').toBe(true);
    expect(light.shadowOk, 'ink light 浮层阴影不应无效').toBe(true);
    expect(dark.modalBg, '两套矩阵的遮罩求值应可区分').not.toBe(light.modalBg);
    expect(dark.shadow, '两套矩阵的阴影求值应可区分').not.toBe(light.shadow);
  });
});
