import { useState, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { VOYAGE_APP_DEFAULTS } from '../src';
import {
  VoyageActionCard,
  VoyageActionGrid,
  VoyageChoiceCard,
  VoyageChoiceGrid,
  VoyageDashboardFooter,
  VoyageDashboardHeader,
  VoyageDashboardHero,
  VoyageDashboardSection,
  VoyageDashboardShell,
  VoyageDashboardWorkspace,
  VoyageEntityRow,
  VoyageFieldGroup,
  VoyageInspector,
  VoyageMetricCard,
  VoyageMetricGrid,
  VoyagePanel,
  VoyageProvider,
  VoyageRouteList,
  VoyageSectionHeading,
  VoyageStatusPill,
  VoyageSwitch,
  VoyageToolbar,
} from '../src/react';

function Icon({ children }: { children: ReactNode }) {
  return <span aria-hidden="true">{children}</span>;
}

const tasks = [
  { id: 'digest', name: '每日邮件汇总', schedule: '每天 08:30', command: 'daily-mail-digest flush', status: '运行中', tone: 'success' as const, model: 'gpt-5.6-terra' },
  { id: 'brain', name: 'Brain develop 日报', schedule: '工作日 09:00', command: 'brain-develop-daily-digest', status: '就绪', tone: 'accent' as const, model: 'gpt-5.6-terra' },
  { id: 'backup', name: '本地配置备份', schedule: '每天 23:30', command: 'backup-local-config', status: '就绪', tone: 'neutral' as const, model: '脚本' },
  { id: 'health', name: '服务健康巡检', schedule: '每 30 分钟', command: 'service-health-check', status: '需关注', tone: 'warning' as const, model: 'gpt-5.6-sol' },
];

function DashboardDemo() {
  const [selectedId, setSelectedId] = useState('digest');
  const [balanced, setBalanced] = useState(true);
  const [retry, setRetry] = useState(true);
  const selected = tasks.find((task) => task.id === selectedId) ?? tasks[0];

  return (
    <VoyageProvider defaults={VOYAGE_APP_DEFAULTS.taskdeck}>
      <VoyageDashboardShell
        footer={
          <VoyageDashboardFooter>
            <span>Taskdeck · launchd 本机视图</span>
            <span>只读预览 · 变更能力将在后续开放</span>
          </VoyageDashboardFooter>
        }
      >
        <VoyageDashboardHeader
          mark="T"
          eyebrow="Local scheduler"
          title="Taskdeck"
          subtitle="清晰地查看、理解与管理每一次唤醒"
          status={
            <>
              <VoyageStatusPill tone="success">服务在线</VoyageStatusPill>
              <VoyageStatusPill>evolve 任务受保护</VoyageStatusPill>
            </>
          }
          actions={
            <>
              <VoyageToolbar />
              <button className="vg-btn primary" disabled>新建任务</button>
            </>
          }
        />

        <main>
          <VoyageDashboardHero
            eyebrow="把定时任务从 plist 里带到眼前"
            title="让每一次唤醒都清清楚楚"
            description="一个面向本机任务的控制台：先看清状态、时间与执行路线，再安全地做变更。"
            actions={<VoyageStatusPill tone="accent">12 个任务已发现</VoyageStatusPill>}
          />

          <VoyageMetricGrid aria-label="任务概览">
            <VoyageMetricCard tone="accent" label="下一次唤醒" value="08:30" detail="每日邮件汇总 · 18 分钟后" icon={<Icon>↗</Icon>} />
            <VoyageMetricCard label="当前任务" value="12" detail="10 就绪 · 1 运行中 · 1 需关注" icon={<Icon>◫</Icon>} />
            <VoyageMetricCard label="诊断" value="2" detail="均来自第三方 plist，不影响运行" icon={<Icon>!</Icon>} />
          </VoyageMetricGrid>

          <VoyageDashboardSection>
            <VoyageSectionHeading title="接下来" description="按计划时间排列的最近三次唤醒" action={<button className="vg-btn">查看时间线</button>} />
            <VoyageActionGrid>
              <VoyageActionCard title="每日邮件汇总" meta="今天 08:30 · 18 分钟后" detail="gpt-5.6-terra · 邮件出口" leading={<Icon>✦</Icon>} trailing={<VoyageStatusPill tone="success">就绪</VoyageStatusPill>} />
              <VoyageActionCard title="Brain develop 日报" meta="今天 09:00 · 48 分钟后" detail="gpt-5.6-terra · skillab" leading={<Icon>◇</Icon>} trailing={<VoyageStatusPill tone="accent">计划</VoyageStatusPill>} />
              <VoyageActionCard title="服务健康巡检" meta="今天 09:30 · 1 小时后" detail="gpt-5.6-sol · 本机服务" leading={<Icon>◎</Icon>} trailing={<VoyageStatusPill tone="warning">关注</VoyageStatusPill>} />
            </VoyageActionGrid>
          </VoyageDashboardSection>

          <VoyageDashboardWorkspace>
            <VoyagePanel
              title="任务库"
              description="launchd 中可由 Taskdeck 展示的任务"
              actions={<input className="vg-input" aria-label="搜索任务" placeholder="搜索任务…" />}
            >
              {tasks.map((task) => (
                <VoyageEntityRow
                  key={task.id}
                  title={task.name}
                  description={task.command}
                  meta={task.schedule}
                  tone={task.tone}
                  selected={task.id === selectedId}
                  onClick={() => setSelectedId(task.id)}
                  trailing={
                    <>
                      <VoyageStatusPill>{task.model}</VoyageStatusPill>
                      <VoyageStatusPill tone={task.tone}>{task.status}</VoyageStatusPill>
                    </>
                  }
                />
              ))}
            </VoyagePanel>

            <VoyageInspector
              eyebrow="任务检查器"
              title={selected.name}
              description={selected.command}
              status={<VoyageStatusPill tone={selected.tone}>{selected.status}</VoyageStatusPill>}
              actions={
                <>
                  <button className="vg-btn">查看原始 plist</button>
                  <button className="vg-btn primary" disabled>保存变更</button>
                </>
              }
            >
              <VoyageFieldGroup label="计划" hint="只读">
                <input className="vg-input" value={selected.schedule} readOnly aria-label="任务计划" />
              </VoyageFieldGroup>

              <VoyageFieldGroup label="模型策略" hint="预览">
                <VoyageChoiceGrid>
                  <VoyageChoiceCard title="平衡" description="速度与推理能力兼顾" selected={balanced} onClick={() => setBalanced(true)} />
                  <VoyageChoiceCard title="深度" description="优先复杂任务质量" selected={!balanced} onClick={() => setBalanced(false)} />
                </VoyageChoiceGrid>
              </VoyageFieldGroup>

              <VoyageFieldGroup label="执行路线">
                <VoyageRouteList steps={[
                  { id: 'wake', title: 'launchd 唤醒', description: selected.schedule, icon: '1', tone: 'success' },
                  { id: 'model', title: balanced ? '平衡模型' : '深度模型', description: selected.model, icon: '2', tone: 'accent' },
                  { id: 'output', title: '写入任务输出', description: '本机日志与通知', icon: '3' },
                ]} />
              </VoyageFieldGroup>

              <VoyageFieldGroup label="失败处理">
                <VoyageSwitch checked={retry} onClick={() => setRetry((value) => !value)} label="自动重试一次" description="首次失败 5 分钟后再次执行" />
              </VoyageFieldGroup>
            </VoyageInspector>
          </VoyageDashboardWorkspace>
        </main>
      </VoyageDashboardShell>
    </VoyageProvider>
  );
}

createRoot(document.getElementById('root')!).render(<DashboardDemo />);
