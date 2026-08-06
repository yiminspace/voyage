import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import {
  VoyageActionCard,
  VoyageChoiceCard,
  VoyageDashboardHeader,
  VoyageDashboardShell,
  VoyageEntityRow,
  VoyageInspector,
  VoyageRouteList,
  VoyageStatusPill,
  VoyageSwitch,
} from './voyage-dashboard';

afterEach(cleanup);

describe('Voyage dashboard components', () => {
  it('组合成带清晰语义的 master-detail 控制台', () => {
    render(
      <VoyageDashboardShell>
        <VoyageDashboardHeader title="Taskdeck" eyebrow="Local scheduler" status={<VoyageStatusPill tone="success">在线</VoyageStatusPill>} />
        <main>
          <VoyageEntityRow title="每日汇总" description="每天 08:30" selected tone="success" />
          <VoyageInspector title="每日汇总" eyebrow="任务检查器">
            <VoyageRouteList steps={[{ id: 'one', title: '启动', tone: 'success' }]} />
          </VoyageInspector>
        </main>
      </VoyageDashboardShell>,
    );

    expect(screen.getByRole('banner').textContent).toContain('Taskdeck');
    expect(screen.getByRole('button', { name: /每日汇总/ }).getAttribute('aria-current')).toBe('true');
    expect(screen.getByRole('complementary').textContent).toContain('任务检查器');
    expect(screen.getByRole('list').textContent).toContain('启动');
  });

  it('choice 与 switch 暴露受控状态并触发宿主回调', () => {
    const onChoice = vi.fn();
    const onSwitch = vi.fn();
    render(
      <>
        <VoyageChoiceCard title="平衡模型" selected onClick={onChoice} />
        <VoyageSwitch label="失败重试" checked onClick={onSwitch} />
      </>,
    );

    const choice = screen.getByRole('button', { name: '平衡模型' });
    expect(choice.getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(choice);
    expect(onChoice).toHaveBeenCalledTimes(1);

    const toggle = screen.getByRole('switch', { name: '失败重试' });
    expect(toggle.getAttribute('aria-checked')).toBe('true');
    fireEvent.click(toggle);
    expect(onSwitch).toHaveBeenCalledTimes(1);
  });

  it('action card 是一个完整点击目标且默认不会提交表单', () => {
    const onClick = vi.fn();
    render(<VoyageActionCard title="09:00 日报" meta="12 分钟后" onClick={onClick} />);
    const card = screen.getByRole('button', { name: /09:00 日报/ }) as HTMLButtonElement;
    expect(card.type).toBe('button');
    fireEvent.click(card);
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
