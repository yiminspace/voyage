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

/** 把 chromium 的计算值解析成 0-255 三元组 */
function toRgb(value: string): [number, number, number] {
  const nums = value.match(/[\d.]+/g);
  if (!nums || nums.length < 3) throw new Error(`解析不了颜色: "${value}"`);
  const [r, g, b] = nums.slice(0, 3).map(Number);
  return value.startsWith('color(') ? [r * 255, g * 255, b * 255] : [r, g, b];
}

function distance(a: string, b: string): number {
  const [r1, g1, b1] = toRgb(a);
  const [r2, g2, b2] = toRgb(b);
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2);
}

/** 从 box-shadow 计算值里抽出颜色段 (忽略偏移/模糊) */
function shadowColor(boxShadow: string): string {
  const match = boxShadow.match(/(rgba?\([^)]+\)|color\([^)]+\)|#[0-9a-fA-F]{3,8})/);
  if (!match) throw new Error(`box-shadow 里没有颜色: "${boxShadow}"`);
  return match[1];
}

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
    // 承载面用 --bg0, 模拟浮层外侧的页面底色
    root.style.cssText = 'position:fixed;inset:0;pointer-events:none;background:var(--bg0);';

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
    const hostBg = getComputedStyle(root).backgroundColor;
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
      hostBg,
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

  test('modal 遮罩与浮层阴影在代表性矩阵下有效、可区分且相对背景有对比', async ({ page }) => {
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

    // 阴影色必须相对承载底 (--bg0) 有可见色差, 避免同色半透明“假阴影”
    // 阈值 20: 同色叠底距离为 0; 暗色纯黑对 slate bg0 约 31, 浅色正文色混合约 300+
    expect(distance(shadowColor(dark.shadow), dark.hostBg),
      'slate dark 阴影相对 --bg0 应有可见对比').toBeGreaterThan(20);
    expect(distance(shadowColor(light.shadow), light.hostBg),
      'ink light 阴影相对 --bg0 应有可见对比').toBeGreaterThan(20);
  });
});
