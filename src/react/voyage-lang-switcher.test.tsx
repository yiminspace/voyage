import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { VoyageProvider } from './voyage-provider';
import { VoyageLangSwitcher } from './voyage-lang-switcher';

const REACT_SRC_DIR = path.dirname(fileURLToPath(import.meta.url));

// 把真实的 tokens.css / voyage.css 注入 jsdom, 让 getComputedStyle 能读到
// .vg-iconbtn 与 .vg-lang-switch 各自匹配到的样式规则, 而不是靠肉眼比对源码。
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
  document.documentElement.removeAttribute('data-theme');
  document.documentElement.removeAttribute('data-mode');
  document.documentElement.removeAttribute('data-style');
  document.documentElement.removeAttribute('data-tone');
});

afterEach(() => {
  cleanup();
});

describe('VoyageLangSwitcher', () => {
  /** 顶栏同排的参照物: VoyageSwitcher 的明暗钮 / 调色板钮就是裸 .vg-iconbtn。 */
  function renderWithIconbtn() {
    render(
      <VoyageProvider>
        <button type="button" className="vg-iconbtn" data-testid="iconbtn">
          ☾
        </button>
        <VoyageLangSwitcher locale="zh" onLocaleChange={() => {}} />
      </VoyageProvider>
    );
    return {
      iconStyle: getComputedStyle(screen.getByTestId('iconbtn')),
      langStyle: getComputedStyle(screen.getByRole('button', { name: '切换为英文' })),
    };
  }

  it('根节点复用 .vg-iconbtn 的盒子, 与同排图标钮等高等宽下限', () => {
    const { iconStyle, langStyle } = renderWithIconbtn();
    expect(screen.getByRole('button', { name: '切换为英文' }).className).toMatch(/\bvg-iconbtn\b/);
    expect(langStyle.height).toBe(iconStyle.height);
    expect(langStyle.minWidth).toBe(iconStyle.minWidth);
    expect(langStyle.height).not.toBe('');
  });

  it('圆角与配色跟同排图标钮同源, 且圆角走 --r-btn 而非写死魔数', () => {
    const { iconStyle, langStyle } = renderWithIconbtn();
    expect(langStyle.borderRadius).toBe(iconStyle.borderRadius);
    expect(langStyle.color).toBe(iconStyle.color);

    // 含 var() 的声明会被 jsdom 丢弃, 所以直接查 CSS 源码断言用的是 token
    const css = readFileSync(path.join(REACT_SRC_DIR, '../../voyage.css'), 'utf-8');
    const iconbtnRule = css.match(/^\.vg-iconbtn\s*\{([^}]*)\}/m)?.[1] ?? '';
    expect(iconbtnRule).toMatch(/border-radius:\s*var\(--r-btn\)/);
  });

  it('无边框 (与同排 .vg-iconbtn 一致, 顶栏无"有框/无框"割裂)', () => {
    const { iconStyle, langStyle } = renderWithIconbtn();
    for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
      expect(langStyle[`border${side}Width`]).toBe('0px');
      expect(langStyle[`border${side}Width`]).toBe(iconStyle[`border${side}Width`]);
    }
  });

  it('外盒宽度锁死在与图标钮同一规格 (不随文案变化)', () => {
    // 原先这里断言的是 padding 四向与图标钮逐像素相等 —— 那是「外盒等宽」的
    // 一种实现手段。现在语言钮直接锁死 width (--vg-lang-w 缺省取 --vg-ctl-h),
    // padding 归零把 26px 全留给文字, 于是改为断言意图本身: 宽度是确定值、
    // 等于图标钮的最小宽、且与 box-sizing 无关。
    // jsdom 不解析 var(), getComputedStyle 原样返回声明串, 所以这里比的是
    // "宽度锚定到哪个变量"而非解析后的像素值 —— 真实像素在试衣间里量。
    const { iconStyle, langStyle } = renderWithIconbtn();
    expect(langStyle.width).not.toBe('');
    expect(langStyle.width).not.toBe('auto');
    // 缺省回退到 --vg-ctl-h: 与图标钮的 min-width 同源, 三颗钮才等宽
    expect(langStyle.width).toContain('--vg-ctl-h');
    expect(iconStyle.minWidth).toContain('--vg-ctl-h');
    // 宿主可用 --vg-lang-w 覆盖 (文案更宽的语言), 但默认不生效
    expect(langStyle.width).toContain('--vg-lang-w');
    expect(langStyle.boxSizing).toBe('border-box');
  });

  it('locale="zh" 显示"中", 点击后以目标 locale "en" 触发回调', () => {
    const onLocaleChange = vi.fn();
    render(<VoyageLangSwitcher locale="zh" onLocaleChange={onLocaleChange} />);

    const btn = screen.getByRole('button', { name: '切换为英文' });
    expect(btn.textContent).toBe('中');

    fireEvent.click(btn);
    expect(onLocaleChange).toHaveBeenCalledWith('en');
    expect(onLocaleChange).toHaveBeenCalledTimes(1);
  });

  it('locale="en" 显示"EN", 点击后以目标 locale "zh" 触发回调', () => {
    const onLocaleChange = vi.fn();
    render(<VoyageLangSwitcher locale="en" onLocaleChange={onLocaleChange} />);

    const btn = screen.getByRole('button', { name: 'Switch to Chinese' });
    expect(btn.textContent).toBe('EN');

    fireEvent.click(btn);
    expect(onLocaleChange).toHaveBeenCalledWith('zh');
  });

  it('透传 className', () => {
    render(<VoyageLangSwitcher locale="zh" onLocaleChange={() => {}} className="host-extra" />);
    expect(screen.getByRole('button').className).toMatch(/\bhost-extra\b/);
  });
});
