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
  it('根节点复用 .vg-badge 的圆角/内边距/字重计算值, 不套用 .vg-iconbtn 的图标按钮尺寸', () => {
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
    expect(triggerStyle.padding).toBe(badgeStyle.padding);
    expect(triggerStyle.fontWeight).toBe(badgeStyle.fontWeight);
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
