import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { VoyageProvider } from './voyage-provider';
import { VoyageToolbar } from './voyage-toolbar';

const REACT_SRC_DIR = path.dirname(fileURLToPath(import.meta.url));

beforeAll(() => {
  const tokens = readFileSync(path.join(REACT_SRC_DIR, '../../tokens.css'), 'utf-8');
  const voyage = readFileSync(path.join(REACT_SRC_DIR, '../../voyage.css'), 'utf-8');
  const style = document.createElement('style');
  style.textContent = `${tokens}\n${voyage}`;
  document.head.appendChild(style);
});

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.className = '';
  for (const attr of ['data-theme', 'data-mode', 'data-style', 'data-tone']) {
    document.documentElement.removeAttribute(attr);
  }
});

afterEach(() => {
  cleanup();
});

/** 工具条里的按钮, 按 DOM 顺序返回 (面板等浮层不在此列)。 */
function toolbarButtons(): HTMLButtonElement[] {
  const toolbar = document.querySelector('.vg-toolbar');
  if (!toolbar) throw new Error('未渲染 .vg-toolbar');
  return [...toolbar.querySelectorAll('button')] as HTMLButtonElement[];
}

describe('VoyageToolbar', () => {
  it('按 语言 → 明暗 → 调色板 的 DOM 顺序渲染', () => {
    render(
      <VoyageProvider>
        <VoyageToolbar locale="zh" onLocaleChange={() => {}} />
      </VoyageProvider>
    );

    // 按 DOM 位置断言, 不是按类名集合 —— 顺序正是这个组件要固化的东西
    const classNames = toolbarButtons().map((b) => b.className);
    expect(classNames[0]).toMatch(/\bvg-lang-switch\b/);
    expect(classNames[1]).toMatch(/\bvg-switcher-mode\b/);
    expect(classNames[2]).toMatch(/\bvg-switcher-trigger\b/);
    expect(classNames).toHaveLength(3);
  });

  it('不传 onLocaleChange 时不渲染语言钮, 其余两颗顺序不变', () => {
    render(
      <VoyageProvider>
        <VoyageToolbar locale="zh" />
      </VoyageProvider>
    );

    const classNames = toolbarButtons().map((b) => b.className);
    expect(classNames).toHaveLength(2);
    expect(classNames[0]).toMatch(/\bvg-switcher-mode\b/);
    expect(classNames[1]).toMatch(/\bvg-switcher-trigger\b/);
    expect(document.querySelector('.vg-lang-switch')).toBeNull();
  });

  it('语言钮宽度锁死: "中" 与 "EN" 计算宽度相同, 切换语言不会推动同排控件', () => {
    // jsdom 的 getBoundingClientRect 恒为 0, 量不到真实位移; 但横向重排的根因
    // 是这颗钮的宽度随文案变化, 所以改为断言宽度是固定值且两种文案下一致 ——
    // 真实浏览器里的位移验证放在试衣间做。
    const widths = (['zh', 'en'] as const).map((locale) => {
      cleanup();
      render(
        <VoyageProvider>
          <VoyageToolbar locale={locale} onLocaleChange={() => {}} />
        </VoyageProvider>
      );
      const btn = document.querySelector('.vg-lang-switch')!;
      // 文案确实不同, 否则这条断言是空的
      expect(btn.textContent).toBe(locale === 'zh' ? '中' : 'EN');
      return getComputedStyle(btn).width;
    });

    expect(widths[0]).toBe(widths[1]);
    // 且必须是确定值, 不能是 auto (auto 就意味着重新交给文字撑)
    expect(widths[0]).not.toBe('');
    expect(widths[0]).not.toBe('auto');
  });

  it('三颗钮共用同一套盒子规格 (高度/圆角/box-sizing)', () => {
    render(
      <VoyageProvider>
        <VoyageToolbar locale="zh" onLocaleChange={() => {}} />
      </VoyageProvider>
    );

    const styles = toolbarButtons().map((b) => getComputedStyle(b));
    for (const prop of ['height', 'borderRadius', 'boxSizing'] as const) {
      const values = styles.map((s) => s[prop]);
      expect(new Set(values).size, `${prop}: ${values.join(' / ')}`).toBe(1);
    }
    // 盒子尺寸不能取决于宿主有没有写 border-box reset
    expect(styles[0].boxSizing).toBe('border-box');
  });

  it('语言钮点击后以目标 locale 触发回调', () => {
    const onLocaleChange = vi.fn();
    render(
      <VoyageProvider>
        <VoyageToolbar locale="zh" onLocaleChange={onLocaleChange} />
      </VoyageProvider>
    );

    screen.getByRole('button', { name: '切换为英文' }).click();
    expect(onLocaleChange).toHaveBeenCalledWith('en');
  });

  it('透传 className 到工具条根节点', () => {
    render(
      <VoyageProvider>
        <VoyageToolbar locale="zh" onLocaleChange={() => {}} className="host-extra" />
      </VoyageProvider>
    );
    expect(document.querySelector('.vg-toolbar')!.className).toMatch(/\bhost-extra\b/);
  });
});
