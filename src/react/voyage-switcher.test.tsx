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
  it('点击主题色块后, <html> 的 data-theme 变为目标值, 且 localStorage 同步持久化', () => {
    render(
      <VoyageProvider>
        <VoyageSwitcher />
      </VoyageProvider>
    );

    openPanel();
    fireEvent.click(screen.getByRole('menuitemradio', { name: '纸墨朱' }));

    expect(document.documentElement.getAttribute('data-theme')).toBe('ink');
    const stored = JSON.parse(window.localStorage.getItem(VOYAGE_STORAGE_KEY) ?? '{}');
    expect(stored.theme).toBe('ink');
  });

  it('点击 ☾/☀ 翻转 data-mode', () => {
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

  it('点击风格/对比分段后同步到宿主属性', () => {
    render(
      <VoyageProvider>
        <VoyageSwitcher />
      </VoyageProvider>
    );

    openPanel();
    fireEvent.click(screen.getByRole('radio', { name: '玻璃' }));
    fireEvent.click(screen.getByRole('radio', { name: '标准' }));

    expect(document.documentElement.getAttribute('data-style')).toBe('glass');
    expect(document.documentElement.getAttribute('data-tone')).toBe('normal');
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
