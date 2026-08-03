import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { VoyageAccountMenu } from './voyage-account-menu';

afterEach(cleanup);

describe('VoyageAccountMenu', () => {
  it('加载中显示禁用且可访问的触发盒', () => {
    render(<VoyageAccountMenu isAuthenticated={false} isLoading />);
    const trigger = screen.getByRole('button', { name: '正在加载账户' });
    expect((trigger as HTMLButtonElement).disabled).toBe(true);
    expect(trigger.getAttribute('aria-busy')).toBe('true');
  });

  it('未登录时触发宿主登录回调', () => {
    const onLogin = vi.fn();
    render(<VoyageAccountMenu isAuthenticated={false} onLogin={onLogin} />);
    fireEvent.click(screen.getByRole('button', { name: '登录' }));
    expect(onLogin).toHaveBeenCalledTimes(1);
  });

  it('已登录时展示身份、fallback 和登出动作', () => {
    const onLogout = vi.fn();
    const { container } = render(
      <VoyageAccountMenu
        isAuthenticated
        identity={{ name: 'Alice', secondary: 'alice@example.com' }}
        onLogout={onLogout}
      />
    );

    const trigger = screen.getByRole('button', { name: '用户菜单' });
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(container.querySelector('.vg-account-avatar-fallback')?.textContent).toBe('A');

    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(screen.getByRole('menu', { name: '用户菜单' })).not.toBeNull();
    expect(screen.getByText('Alice')).not.toBeNull();
    expect(screen.getByText('alice@example.com')).not.toBeNull();

    fireEvent.click(screen.getByRole('menuitem', { name: '退出登录' }));
    expect(onLogout).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('Esc 关闭菜单并把焦点还给触发按钮', () => {
    render(<VoyageAccountMenu isAuthenticated identity={{ name: '林' }} onLogout={() => {}} />);
    const trigger = screen.getByRole('button', { name: '用户菜单' });
    fireEvent.click(trigger);
    expect(screen.getByRole('menu')).not.toBeNull();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('支持英文与局部文案覆盖', () => {
    render(
      <VoyageAccountMenu
        locale="en"
        labels={{ login: 'Continue' }}
        isAuthenticated={false}
      />
    );
    expect(screen.getByRole('button', { name: 'Continue' })).not.toBeNull();
  });
});
