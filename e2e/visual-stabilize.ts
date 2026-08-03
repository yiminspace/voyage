import { expect, type Locator, type Page } from '@playwright/test';

/**
 * 视觉截图稳定化：固定字体、隐藏 caret、冻结 spinner 到确定帧、等待 webfont。
 * 配合 playwright project 的 viewport / deviceScaleFactor / reducedMotion。
 */
export async function stabilizeForVisual(page: Page) {
  await page.emulateMedia({ reducedMotion: 'reduce' });

  await page.addStyleTag({
    content: `
      /* 跨本机/CI 用同一套通用字体，避免 SF Pro / PingFang 与 Liberation 字形差 */
      html, body, .vg, .vg button, .vg input, .vg select, .vg textarea {
        font-family: Arial, Helvetica, sans-serif !important;
        font-kerning: none !important;
        font-variant-ligatures: none !important;
        -webkit-font-smoothing: antialiased !important;
        text-rendering: geometricPrecision !important;
      }
      .vg-mono, .vg-qtitle, .vg-ty, .vg-runon, .num, .ts, .null,
      .scale-cap, .lbl, .st s, code, pre, kbd, samp {
        font-family: "Courier New", Courier, monospace !important;
        font-kerning: none !important;
        font-variant-ligatures: none !important;
      }
      *, *::before, *::after {
        caret-color: transparent !important;
        transition: none !important;
        animation-duration: 0s !important;
        animation-delay: 0s !important;
      }
      /* reduced-motion 会停在 0deg；再钉到 90deg，避免引擎对「无 transform」的差异 */
      .vg-spinner {
        animation: none !important;
        transform: rotate(90deg) !important;
      }
      .vg-mode-wrap, .vg-dot.chk, .vg-spin .ti-loader {
        animation: none !important;
        transition: none !important;
      }
      /* 视觉基线只盯顶栏三颗控件，藏掉 Vite 注入的 Reporter 入口 */
      #reporterDemoRoot { display: none !important; }
    `,
  });

  await page.evaluate(async () => {
    if (document.fonts?.ready) await document.fonts.ready;
  });

  // 再等一帧，确保 transform / 字体度量已提交到合成层
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      })
  );
}

export type VisualAxes = {
  theme: string;
  mode: string;
  style: string;
  tone: string;
};

const AXIS_HOSTS = [
  '#fit',
  '#scale',
  '#semantic',
  '#semantic-badges',
  '#component-demo',
] as const;

async function expectAxes(host: Locator, axes: VisualAxes) {
  await expect(host).toHaveAttribute('data-theme', axes.theme);
  await expect(host).toHaveAttribute('data-mode', axes.mode);
  await expect(host).toHaveAttribute('data-style', axes.style);
  await expect(host).toHaveAttribute('data-tone', axes.tone);
}

/** 直接写四轴属性（不点 chip），并机械断言 DOM 与目标一致。 */
export async function applyAndAssertAxes(page: Page, axes: VisualAxes) {
  await page.evaluate(
    ({ hosts, axes: next }) => {
      for (const sel of hosts) {
        const el = document.querySelector(sel);
        if (!el) throw new Error(`缺少轴宿主 ${sel}`);
        el.setAttribute('data-theme', next.theme);
        el.setAttribute('data-mode', next.mode);
        el.setAttribute('data-style', next.style);
        el.setAttribute('data-tone', next.tone);
      }
      // 同步明暗图标可见性，避免截到错误的月亮/太阳
      const mode = next.mode;
      const moon = document.getElementById('modeWrapMoon');
      const sun = document.getElementById('modeWrapSun');
      if (moon) moon.style.display = mode === 'dark' ? '' : 'none';
      if (sun) sun.style.display = mode === 'dark' ? 'none' : '';
      const switcherMode = document.getElementById('switcherMode');
      if (switcherMode) {
        switcherMode.setAttribute(
          'aria-label',
          mode === 'dark' ? '切换为亮色模式' : '切换为暗色模式'
        );
      }
      // 通知 Vite 挂载的 VoyageProvider 同步四轴（否则 React 认证组件仍停在旧 prefs）
      window.dispatchEvent(
        new CustomEvent('voyage-demo-prefs', {
          detail: {
            theme: next.theme,
            mode: next.mode,
            style: next.style,
            tone: next.tone,
          },
        })
      );
    },
    { hosts: AXIS_HOSTS as unknown as string[], axes }
  );

  for (const sel of AXIS_HOSTS) {
    await expectAxes(page.locator(sel), axes);
  }
}
