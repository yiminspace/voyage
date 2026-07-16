import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { VOYAGE_STORAGE_KEY } from '../index';
import { VoyageProvider } from './voyage-provider';
import { VoyageSwitcher } from './voyage-switcher';

function openPanel() {
  fireEvent.click(screen.getByRole('button', { name: '展开主题设置' }));
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
    fireEvent.focus(screen.getByRole('menuitemradio', { name: '玄武玉' }));

    // 预览: DOM 已经切到 jade, 但没有持久化
    expect(document.documentElement.getAttribute('data-theme')).toBe('jade');
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
    const card = screen.getByRole('menuitemradio', { name: '深海黄铜' });
    fireEvent.focus(card);
    fireEvent.click(card);
    fireEvent.keyDown(document, { key: 'Escape' });

    expect(document.documentElement.getAttribute('data-theme')).toBe('navy');
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
    fireEvent.click(screen.getByRole('radio', { name: '亮' }));

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
});
