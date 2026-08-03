import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { VoyageSpinner } from './voyage-spinner';
import { VoyageStateView } from './voyage-state-view';

afterEach(cleanup);

describe('VoyageSpinner', () => {
  it('独立使用时暴露可访问加载状态与尺寸 class', () => {
    render(<VoyageSpinner size="lg" label="正在同步" />);
    const spinner = screen.getByRole('status', { name: '正在同步' });
    expect(spinner.className).toContain('vg-spinner-lg');
  });

  it('作为装饰图标时不重复暴露 status', () => {
    const { container } = render(<VoyageSpinner decorative />);
    expect(screen.queryByRole('status')).toBeNull();
    expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true');
  });
});

describe('VoyageStateView', () => {
  it('loading page 带 busy/status 语义和可替换文案', () => {
    render(
      <VoyageStateView
        variant="loading"
        size="page"
        heading="正在处理登录"
        description="即将返回应用"
      />
    );
    const state = screen.getByRole('status', { name: '正在处理登录' });
    expect(state.getAttribute('aria-busy')).toBe('true');
    expect(state.getAttribute('aria-labelledby')).toBeTruthy();
    expect(state.className).toContain('vg-state-view-page');
    expect(screen.getByRole('heading', { name: '正在处理登录' })).not.toBeNull();
    expect(screen.getByText('即将返回应用')).not.toBeNull();
  });

  it('error 使用 alert 语义并渲染重试动作', () => {
    render(
      <VoyageStateView
        variant="error"
        heading="登录失败"
        description="认证信息无效"
        action={<button type="button">重试</button>}
      />
    );
    const alert = screen.getByRole('alert', { name: '登录失败' });
    expect(alert.getAttribute('aria-live')).toBe('assertive');
    expect(alert.getAttribute('aria-labelledby')).toBeTruthy();
    expect(screen.getByRole('button', { name: '重试' })).not.toBeNull();
  });

  it('无可见文案的 loading 用 loadingLabel 作为可访问名称', () => {
    render(<VoyageStateView variant="loading" loadingLabel="正在同步会话" />);
    expect(screen.getByRole('status', { name: '正在同步会话' }).getAttribute('aria-busy')).toBe(
      'true'
    );
  });

  it('允许隐藏默认图标并保留宿主 class 与原生属性', () => {
    const { container } = render(
      <VoyageStateView icon={null} className="host-state" data-testid="state" />
    );
    const state = screen.getByTestId('state');
    expect(state.className).toContain('host-state');
    expect(container.querySelector('.vg-state-view-icon')).toBeNull();
  });
});
