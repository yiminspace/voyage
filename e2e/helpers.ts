import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page } from '@playwright/test';

/** 在后续导航前剥离原生 Popover API，强制走 React fallback。 */
export async function disableNativePopover(page: Page) {
  await page.addInitScript(() => {
    const proto = HTMLElement.prototype as HTMLElement & {
      showPopover?: () => void;
      hidePopover?: () => void;
    };
    try {
      // 删除比赋 undefined 更稳：supportsPopover 用 typeof === 'function' 判定。
      delete proto.showPopover;
      delete proto.hidePopover;
    } catch {
      Object.defineProperty(proto, 'showPopover', {
        configurable: true,
        value: undefined,
      });
      Object.defineProperty(proto, 'hidePopover', {
        configurable: true,
        value: undefined,
      });
    }
  });
}

/** 原生 Popover 支持时校验 :popover-open；否则只校验 React fallback 可见性。 */
export async function expectPopoverOpenOrFallback(
  menu: Locator,
  expected?: 'native' | 'fallback'
) {
  await expect(menu).toBeVisible();
  await expect(menu).toHaveAttribute('popover', 'auto');

  const state = await menu.evaluate((element) => {
    const support = typeof (element as HTMLElement & { showPopover?: () => void }).showPopover === 'function';
    let nativeOpen: boolean | null = null;
    if (support) {
      try {
        nativeOpen = element.matches(':popover-open');
      } catch {
        nativeOpen = false;
      }
    }
    const style = getComputedStyle(element);
    return {
      support,
      nativeOpen,
      visibleFallback:
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        style.opacity !== '0',
    };
  });

  if (expected === 'native') {
    expect(state.support, '期望原生 Popover 路径').toBe(true);
  } else if (expected === 'fallback') {
    expect(state.support, '期望 React fallback 路径').toBe(false);
  }

  if (state.support) {
    expect(state.nativeOpen, '引擎支持 Popover 时应处于 :popover-open').toBe(true);
  } else {
    expect(state.visibleFallback, '无原生 Popover 时 React fallback 应可见').toBe(true);
  }
}

/** 只拦 serious / critical，避免引擎/axe 规则差异把 info/minor 变成红灯。 */
export async function expectNoSeriousA11yViolations(
  page: Page,
  options?: { include?: string[]; exclude?: string[] }
) {
  let builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']);
  if (options?.include?.length) builder = builder.include(options.include);
  if (options?.exclude?.length) {
    for (const selector of options.exclude) builder = builder.exclude(selector);
  }

  const results = await builder.analyze();
  const serious = results.violations.filter(
    (violation) => violation.impact === 'serious' || violation.impact === 'critical'
  );
  expect(
    serious,
    serious.map((v) => `${v.id}: ${v.help}`).join('\n') || 'no serious/critical a11y violations'
  ).toEqual([]);
}
