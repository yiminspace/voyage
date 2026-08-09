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
  const toolbar = document.querySelector('.vg-topbar');
  if (!toolbar) throw new Error('未渲染 .vg-topbar');
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
    expect(document.querySelector('.vg-topbar')!.className).toMatch(/\bhost-extra\b/);
  });

  it('配置 reporter 时把反馈入口放在设置族之前，并用分隔线划组', () => {
    render(
      <VoyageProvider>
        <VoyageToolbar
          locale="zh"
          onLocaleChange={() => {}}
          reporter={{ endpoint: '/api/intake', app: 'quarry' }}
        />
      </VoyageProvider>
    );

    const classNames = toolbarButtons().map((button) => button.className);
    expect(classNames).toHaveLength(4);
    expect(classNames[0]).toMatch(/\bvg-reporter-trigger\b/);
    expect(classNames[1]).toMatch(/\bvg-lang-switch\b/);
    expect(classNames[2]).toMatch(/\bvg-switcher-mode\b/);
    expect(classNames[3]).toMatch(/\bvg-switcher-trigger\b/);
    expect(document.querySelector('.vg-topbar-separator')).not.toBeNull();
  });

  it('把可选账户入口固定放在调色板之后，且不增加第二条分隔线', () => {
    render(
      <VoyageProvider>
        <VoyageToolbar
          locale="zh"
          onLocaleChange={() => {}}
          reporter={{ endpoint: '/api/intake', app: 'quarry' }}
          account={<button type="button" className="host-account">用户菜单</button>}
        />
      </VoyageProvider>
    );

    const classNames = toolbarButtons().map((button) => button.className);
    expect(classNames).toHaveLength(5);
    expect(classNames[0]).toMatch(/\bvg-reporter-trigger\b/);
    expect(classNames[1]).toMatch(/\bvg-lang-switch\b/);
    expect(classNames[2]).toMatch(/\bvg-switcher-mode\b/);
    expect(classNames[3]).toMatch(/\bvg-switcher-trigger\b/);
    expect(classNames[4]).toMatch(/\bhost-account\b/);
    expect(document.querySelectorAll('.vg-topbar-separator')).toHaveLength(1);
    expect(document.querySelector('.vg-topbar-account')).not.toBeNull();
  });

  it('不传账户入口时不渲染尾部容器', () => {
    render(
      <VoyageProvider>
        <VoyageToolbar />
      </VoyageProvider>
    );

    expect(document.querySelector('.vg-topbar-account')).toBeNull();
  });

  it('可为尚未接入的反馈与语言保留原生 disabled 占位', () => {
    render(
      <VoyageProvider>
        <VoyageToolbar
          locale="zh"
          reporter={{ disabled: true }}
          language={{ disabled: true }}
        />
      </VoyageProvider>
    );

    const buttons = toolbarButtons();
    expect(buttons).toHaveLength(4);
    expect(buttons[0].className).toMatch(/\bvg-reporter-trigger\b/);
    expect(buttons[1].className).toMatch(/\bvg-lang-switch\b/);
    expect(buttons[2].className).toMatch(/\bvg-switcher-mode\b/);
    expect(buttons[3].className).toMatch(/\bvg-switcher-trigger\b/);
    expect(buttons[0].disabled).toBe(true);
    expect(buttons[1].disabled).toBe(true);
    expect(buttons[0].getAttribute('title')).toBe('尚未接入');
    expect(buttons[1].textContent).toBe('中');
    expect(buttons[2].disabled).toBe(false);
    expect(buttons[3].disabled).toBe(false);
  });
});
