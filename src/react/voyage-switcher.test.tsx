import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { VOYAGE_STORAGE_KEY } from '../index';
import { VoyageProvider, useVoyage } from './voyage-provider';
import { VoyageSwitcher } from './voyage-switcher';

function openPanel() {
  fireEvent.click(screen.getByRole('button', { name: '展开主题设置' }));
}

function TargetProbe({ expected }: { expected: Element }) {
  const { target } = useVoyage();
  return <output data-testid="target-probe">{target === expected ? 'scoped' : 'other'}</output>;
}

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

describe('VoyageSwitcher', () => {
  it('点击主题卡后, 该 preset 的 theme/style/tone 一起落到 <html>, 且 localStorage 同步持久化', () => {
    render(
      <VoyageProvider>
        <VoyageSwitcher />
      </VoyageProvider>
    );

    openPanel();
    fireEvent.click(screen.getByRole('menuitemradio', { name: '纸墨朱' }));

    // ink preset 的策展组合: soft + quiet (见 VOYAGE_PRESETS)
    expect(document.documentElement.getAttribute('data-theme')).toBe('ink');
    expect(document.documentElement.getAttribute('data-style')).toBe('soft');
    expect(document.documentElement.getAttribute('data-tone')).toBe('quiet');
    const stored = JSON.parse(window.localStorage.getItem(VOYAGE_STORAGE_KEY) ?? '{}');
    expect(stored.theme).toBe('ink');
    expect(stored.style).toBe('soft');
  });

  it('聚焦主题卡即时预览 (不写存储), Esc 关面板后还原到已落定偏好', () => {
    render(
      <VoyageProvider>
        <VoyageSwitcher />
      </VoyageProvider>
    );

    openPanel();
    fireEvent.focus(screen.getByRole('menuitemradio', { name: '北极' }));

    // 预览: DOM 已经切到 nord, 但没有持久化
    expect(document.documentElement.getAttribute('data-theme')).toBe('nord');
    expect(window.localStorage.getItem(VOYAGE_STORAGE_KEY)).toBeNull();

    // Esc 关面板 -> 还原到默认 slate
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(document.documentElement.getAttribute('data-theme')).toBe('slate');
    expect(window.localStorage.getItem(VOYAGE_STORAGE_KEY)).toBeNull();
  });

  it('预览后点击落定, 关面板不再回滚', () => {
    render(
      <VoyageProvider>
        <VoyageSwitcher />
      </VoyageProvider>
    );

    openPanel();
    const card = screen.getByRole('menuitemradio', { name: '东京夜' });
    fireEvent.focus(card);
    fireEvent.click(card);
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(document.documentElement.getAttribute('data-theme')).toBe('tokyo');
    expect(document.documentElement.getAttribute('data-style')).toBe('glass');
  });

  it('当前偏好归属的主题卡带选中态 (aria-checked)', () => {
    render(
      <VoyageProvider defaults={{ theme: 'ink', mode: 'light', style: 'soft', tone: 'quiet' }}>
        <VoyageSwitcher />
      </VoyageProvider>
    );

    openPanel();
    expect(screen.getByRole('menuitemradio', { name: '纸墨朱' }).getAttribute('aria-checked')).toBe(
      'true'
    );
    expect(screen.getByRole('menuitemradio', { name: '板岩铜' }).getAttribute('aria-checked')).toBe(
      'false'
    );
  });

  it('点击 月亮/太阳 翻转 data-mode', () => {
    render(
      <VoyageProvider defaults={{ theme: 'slate', mode: 'dark', style: 'classic', tone: 'quiet' }}>
        <VoyageSwitcher />
      </VoyageProvider>
    );

    const modeBtn = screen.getByRole('button', { name: '切换为亮色模式' });
    expect(document.documentElement.getAttribute('data-mode')).toBe('dark');

    fireEvent.click(modeBtn);
    expect(document.documentElement.getAttribute('data-mode')).toBe('light');

    fireEvent.click(screen.getByRole('button', { name: '切换为暗色模式' }));
    expect(document.documentElement.getAttribute('data-mode')).toBe('dark');
  });

  it('icons 插槽: 宿主传入的图标替换内置默认', () => {
    render(
      <VoyageProvider defaults={{ theme: 'slate', mode: 'dark', style: 'classic', tone: 'quiet' }}>
        <VoyageSwitcher
          icons={{
            moon: <i data-testid="host-moon" />,
            sun: <i data-testid="host-sun" />,
            trigger: <i data-testid="host-trigger" />,
          }}
        />
      </VoyageProvider>
    );

    expect(screen.getByTestId('host-moon')).toBeTruthy();
    expect(screen.getByTestId('host-trigger')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '切换为亮色模式' }));
    expect(screen.getByTestId('host-sun')).toBeTruthy();
  });

  it('locale="en" 时全部 UI 文案与预设名切换为英文', () => {
    render(
      <VoyageProvider defaults={{ theme: 'slate', mode: 'dark', style: 'classic', tone: 'normal' }}>
        <VoyageSwitcher locale="en" />
      </VoyageProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Theme settings' }));
    expect(screen.getByRole('menuitemradio', { name: 'Slate & Copper' })).toBeTruthy();
    expect(screen.getByRole('menuitemradio', { name: 'Tokyo Night' })).toBeTruthy();
    expect(screen.getByRole('menuitemradio', { name: 'Light' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Switch to light mode' })).toBeTruthy();
  });

  it('传 syncDarkClass 时, mode 切换同步增删 <html> 的 .dark class', () => {
    render(
      <VoyageProvider syncDarkClass defaults={{ theme: 'slate', mode: 'dark', style: 'classic', tone: 'quiet' }}>
        <VoyageSwitcher />
      </VoyageProvider>
    );

    expect(document.documentElement.classList.contains('dark')).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: '切换为亮色模式' }));
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: '切换为暗色模式' }));
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('不传 syncDarkClass 时不触碰 .dark class', () => {
    render(
      <VoyageProvider defaults={{ theme: 'slate', mode: 'dark', style: 'classic', tone: 'quiet' }}>
        <VoyageSwitcher />
      </VoyageProvider>
    );

    fireEvent.click(screen.getByRole('button', { name: '切换为亮色模式' }));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('面板内的明暗分段与顶栏按钮同步', () => {
    render(
      <VoyageProvider>
        <VoyageSwitcher />
      </VoyageProvider>
    );

    openPanel();
    fireEvent.click(screen.getByRole('menuitemradio', { name: '亮' }));

    expect(document.documentElement.getAttribute('data-mode')).toBe('light');
    expect(screen.getByRole('button', { name: '切换为暗色模式' })).toBeTruthy();
  });

  it('Escape 关闭展开面板', () => {
    render(
      <VoyageProvider>
        <VoyageSwitcher />
      </VoyageProvider>
    );

    openPanel();
    expect(screen.getByRole('menu', { name: '主题设置' })).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu', { name: '主题设置' })).toBeNull();
  });

  it('点击面板外部关闭展开面板', () => {
    render(
      <div>
        <VoyageProvider>
          <VoyageSwitcher />
        </VoyageProvider>
        <button type="button">outside</button>
      </div>
    );

    openPanel();
    expect(screen.getByRole('menu', { name: '主题设置' })).toBeTruthy();

    fireEvent.pointerDown(screen.getByRole('button', { name: 'outside' }));
    expect(screen.queryByRole('menu', { name: '主题设置' })).toBeNull();
  });

  it('scoped target 使用独立存储并让正式切换与 dark class 都不触碰 <html>', () => {
    const target = document.createElement('section');
    document.body.appendChild(target);
    document.documentElement.className = 'whistle-host';
    document.documentElement.setAttribute('data-theme', 'light');

    const storageKey = 'brainws:vg_prefs';
    const globalPrefs = { theme: 'tokyo', mode: 'light', style: 'glass', tone: 'quiet' };
    const scopedPrefs = { theme: 'ink', mode: 'dark', style: 'soft', tone: 'quiet' };
    window.localStorage.setItem(VOYAGE_STORAGE_KEY, JSON.stringify(globalPrefs));
    window.localStorage.setItem(storageKey, JSON.stringify(scopedPrefs));

    render(
      <VoyageProvider target={target} storageKey={storageKey} syncDarkClass>
        <TargetProbe expected={target} />
        <VoyageSwitcher />
      </VoyageProvider>,
      { container: target }
    );

    expect(screen.getByTestId('target-probe').textContent).toBe('scoped');
    expect(target.classList.contains('vg')).toBe(true);
    expect(target.classList.contains('dark')).toBe(true);
    expect(target.getAttribute('data-theme')).toBe('ink');
    expect(target.getAttribute('data-mode')).toBe('dark');
    expect(document.documentElement.className).toBe('whistle-host');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(document.documentElement.hasAttribute('data-mode')).toBe(false);

    fireEvent.click(screen.getByRole('button', { name: '切换为亮色模式' }));

    expect(target.getAttribute('data-mode')).toBe('light');
    expect(target.classList.contains('dark')).toBe(false);
    expect(document.documentElement.className).toBe('whistle-host');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    expect(JSON.parse(window.localStorage.getItem(storageKey) ?? '{}')).toEqual({
      ...scopedPrefs,
      mode: 'light',
    });
    expect(JSON.parse(window.localStorage.getItem(VOYAGE_STORAGE_KEY) ?? '{}')).toEqual(globalPrefs);
  });

  it('scoped target 的主题预览与还原不改写 <html>，也不提前写入存储', () => {
    const target = document.createElement('section');
    document.body.appendChild(target);
    document.documentElement.className = 'whistle-host';
    document.documentElement.setAttribute('data-theme', 'dark');
    const storageKey = 'brainws:vg_prefs';

    render(
      <VoyageProvider target={target} storageKey={storageKey}>
        <VoyageSwitcher />
      </VoyageProvider>,
      { container: target }
    );

    openPanel();
    fireEvent.focus(screen.getByRole('menuitemradio', { name: '北极' }));

    expect(target.getAttribute('data-theme')).toBe('nord');
    expect(document.documentElement.className).toBe('whistle-host');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(window.localStorage.getItem(storageKey)).toBeNull();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(target.getAttribute('data-theme')).toBe('slate');
    expect(document.documentElement.className).toBe('whistle-host');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(window.localStorage.getItem(storageKey)).toBeNull();
  });

  it('Provider 存活期间冻结 target、storageKey 与 defaults，rerender 不产生半迁移作用域', () => {
    const firstTarget = document.createElement('section');
    const secondTarget = document.createElement('section');
    document.body.append(firstTarget, secondTarget);

    const view = render(
      <VoyageProvider
        target={firstTarget}
        storageKey="first:vg_prefs"
        defaults={{ theme: 'trace', mode: 'dark', style: 'classic', tone: 'quiet' }}
      >
        <VoyageSwitcher />
      </VoyageProvider>,
      { container: firstTarget }
    );

    view.rerender(
      <VoyageProvider
        target={secondTarget}
        storageKey="second:vg_prefs"
        defaults={{ theme: 'ink', mode: 'light', style: 'soft', tone: 'normal' }}
      >
        <VoyageSwitcher />
      </VoyageProvider>
    );
    fireEvent.click(screen.getByRole('button', { name: '切换为亮色模式' }));

    expect(firstTarget.getAttribute('data-theme')).toBe('trace');
    expect(firstTarget.getAttribute('data-mode')).toBe('light');
    expect(secondTarget.hasAttribute('data-theme')).toBe(false);
    expect(JSON.parse(window.localStorage.getItem('first:vg_prefs') ?? '{}').mode).toBe('light');
    expect(window.localStorage.getItem('second:vg_prefs')).toBeNull();
  });
});
