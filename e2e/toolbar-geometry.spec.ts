/**
 * 顶栏三颗控件 (语言 / 明暗 / 调色板) 的几何契约 —— jsdom 够不着的部分,
 * 只能在真实排版引擎里量: jsdom 不解析 var()、没有字体引擎、不跑 flex 布局,
 * 这些恰恰是本文件断言的东西。被测页 demo/fitting-room.html 是视觉回归基准,
 * 标记与样式 (vg-iconbtn / vg-lang-switch / vg-switcher) 与 VoyageToolbar /
 * VoyageSwitcher / VoyageLangSwitcher 组件同源。
 */
import { test, expect, type Locator, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const DEMO_URL = pathToFileURL(
  path.resolve(__dirname, '../demo/fitting-room.html')
).href;

async function box(locator: Locator) {
  const b = await locator.boundingBox();
  if (!b) throw new Error('boundingBox() 返回 null, 元素不可见或不存在');
  return b;
}

function toolbarButtons(page: Page) {
  return {
    lang: page.locator('#langSwitch'),
    mode: page.locator('#switcherMode'),
    trigger: page.locator('#switcherTrigger'),
  };
}

test.beforeEach(async ({ page }) => {
  await page.goto(DEMO_URL);
});

test.describe('三颗钮的统一盒子规格', () => {
  test('等高、等宽、同圆角、同 box-sizing', async ({ page }) => {
    const { lang, mode, trigger } = toolbarButtons(page);

    const [langBox, modeBox, triggerBox] = await Promise.all([
      box(lang),
      box(mode),
      box(trigger),
    ]);

    expect(modeBox.height).toBeCloseTo(langBox.height, 1);
    expect(triggerBox.height).toBeCloseTo(langBox.height, 1);
    expect(modeBox.width).toBeCloseTo(langBox.width, 1);
    expect(triggerBox.width).toBeCloseTo(langBox.width, 1);

    const readStyle = (l: Locator) =>
      l.evaluate((el) => {
        const s = getComputedStyle(el);
        return { borderRadius: s.borderRadius, boxSizing: s.boxSizing };
      });
    const [langStyle, modeStyle, triggerStyle] = await Promise.all([
      readStyle(lang),
      readStyle(mode),
      readStyle(trigger),
    ]);

    expect(modeStyle.borderRadius).toBe(langStyle.borderRadius);
    expect(triggerStyle.borderRadius).toBe(langStyle.borderRadius);
    expect(langStyle.boxSizing).toBe('border-box');
    expect(modeStyle.boxSizing).toBe('border-box');
    expect(triggerStyle.boxSizing).toBe('border-box');
  });
});

test.describe('语言钮宽度锁死', () => {
  for (const text of ['中', 'EN', '日本語', 'ESPAÑOL']) {
    test(`文案 "${text}" 下宽度恒为默认盒宽`, async ({ page }) => {
      const { lang } = toolbarButtons(page);
      const baseline = await box(lang);

      await lang.evaluate((el, t) => {
        el.textContent = t;
      }, text);

      const after = await box(lang);
      expect(after.width).toBeCloseTo(baseline.width, 1);
    });
  }

  test('切换语言前后, 右侧两颗控件的横坐标不变', async ({ page }) => {
    const { lang, mode, trigger } = toolbarButtons(page);

    const modeBefore = await box(mode);
    const triggerBefore = await box(trigger);
    expect(await lang.textContent()).toBe('中');

    await lang.click(); // 试衣间脚本: 中 -> EN

    expect(await lang.textContent()).toBe('EN');
    const modeAfter = await box(mode);
    const triggerAfter = await box(trigger);

    expect(modeAfter.x).toBeCloseTo(modeBefore.x, 1);
    expect(triggerAfter.x).toBeCloseTo(triggerBefore.x, 1);
  });
});

test.describe('圆角跟随 data-style 轴变化', () => {
  test('classic / sharp / soft 取值互不相同', async ({ page }) => {
    const host = page.locator('#fit');
    const { lang } = toolbarButtons(page);

    const radii: Record<string, string> = {};
    for (const style of ['classic', 'sharp', 'soft']) {
      await host.evaluate(
        (el, s) => el.setAttribute('data-style', s),
        style
      );
      radii[style] = await lang.evaluate(
        (el) => getComputedStyle(el).borderRadius
      );
    }

    expect(new Set(Object.values(radii)).size).toBe(3);
  });
});

test.describe('--vg-lang-w 覆盖', () => {
  test('覆盖生效, 移除后回落默认宽度', async ({ page }) => {
    const { lang } = toolbarButtons(page);
    const defaultBox = await box(lang);

    await lang.evaluate((el) => el.style.setProperty('--vg-lang-w', '80px'));
    const overridden = await box(lang);
    expect(overridden.width).toBeCloseTo(80, 1);

    await lang.evaluate((el) => el.style.removeProperty('--vg-lang-w'));
    const restored = await box(lang);
    expect(restored.width).toBeCloseTo(defaultBox.width, 1);
  });
});
