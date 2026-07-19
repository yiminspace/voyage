import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { VoyageProvider } from './voyage-provider';
import { VoyageLangSwitcher } from './voyage-lang-switcher';

const REACT_SRC_DIR = path.dirname(fileURLToPath(import.meta.url));

// 把真实的 tokens.css / voyage.css 注入 jsdom, 让 getComputedStyle 能读到
// .vg-badge 与 .vg-lang-switch 各自匹配到的样式规则, 而不是靠肉眼比对源码。
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
  it('根节点复用 .vg-badge 的圆角/字重计算值, 不套用 .vg-iconbtn 的图标按钮尺寸', () => {
    render(
      <VoyageProvider>
        <span className="vg-badge" data-testid="badge">
          参照
        </span>
        <VoyageLangSwitcher locale="zh" onLocaleChange={() => {}} />
      </VoyageProvider>
    );

    const badge = screen.getByTestId('badge');
    const trigger = screen.getByRole('button', { name: '切换为英文' });

    expect(trigger.className).not.toMatch(/\bvg-iconbtn\b/);

    const badgeStyle = getComputedStyle(badge);
    const triggerStyle = getComputedStyle(trigger);
    expect(triggerStyle.borderRadius).toBe(badgeStyle.borderRadius);
    expect(triggerStyle.fontWeight).toBe(badgeStyle.fontWeight);
  });

  it('无边框, 且外尺寸与带框的 .vg-badge 逐边一致 (同排混用不会矮 2px)', () => {
    render(
      <VoyageProvider>
        <span className="vg-badge" data-testid="badge">
          参照
        </span>
        <VoyageLangSwitcher locale="zh" onLocaleChange={() => {}} />
      </VoyageProvider>
    );

    const badgeStyle = getComputedStyle(screen.getByTestId('badge'));
    const triggerStyle = getComputedStyle(screen.getByRole('button', { name: '切换为英文' }));

    // 边框真的没了 (而不是描边色刷成透明还占着 2px)
    for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
      expect(triggerStyle[`border${side}Width`]).toBe('0px');
    }

    // .vg-badge 的边框宽度从 CSS 源码取: 它的值是 `1px solid var(--line2-c, ...)`,
    // 含 var() 的 shorthand 会被 jsdom 整条丢弃, getComputedStyle 读不到。
    const css = readFileSync(path.join(REACT_SRC_DIR, '../../voyage.css'), 'utf-8');
    const badgeRule = css.match(/^\.vg-badge\s*\{([^}]*)\}/m)?.[1] ?? '';
    const badgeBorderPx = parseFloat(badgeRule.match(/border:\s*([\d.]+)px/)?.[1] ?? 'NaN');
    expect(badgeBorderPx).toBe(1);

    // padding 各补回这 1px 吃掉边框宽度 => 外尺寸不变
    const px = (v: string) => parseFloat(v || '0');
    for (const side of ['Top', 'Right', 'Bottom', 'Left'] as const) {
      expect(px(triggerStyle[`padding${side}`])).toBe(
        px(badgeStyle[`padding${side}`]) + badgeBorderPx
      );
    }
  });

  it('与同排的 .vg-iconbtn 一样不带描边 (顶栏无"有框/无框"割裂)', () => {
    render(
      <VoyageProvider>
        <button type="button" className="vg-iconbtn" data-testid="iconbtn">
          ☾
        </button>
        <VoyageLangSwitcher locale="zh" onLocaleChange={() => {}} />
      </VoyageProvider>
    );

    const iconStyle = getComputedStyle(screen.getByTestId('iconbtn'));
    const triggerStyle = getComputedStyle(screen.getByRole('button', { name: '切换为英文' }));
    expect(triggerStyle.borderTopWidth).toBe(iconStyle.borderTopWidth);
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
