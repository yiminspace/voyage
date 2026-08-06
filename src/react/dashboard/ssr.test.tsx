// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { renderToString } from 'react-dom/server';
import {
  VoyageDashboardHeader,
  VoyageDashboardHero,
  VoyageDashboardShell,
  VoyageMetricCard,
  VoyageMetricGrid,
} from './index';

describe('dashboard SSR-safe entry', () => {
  it('不依赖 document/window 即可服务端渲染', () => {
    const html = renderToString(
      <VoyageDashboardShell>
        <VoyageDashboardHeader title="Taskdeck" />
        <VoyageDashboardHero title="让每一次唤醒都清清楚楚" />
        <VoyageMetricGrid>
          <VoyageMetricCard label="任务" value="12" />
        </VoyageMetricGrid>
      </VoyageDashboardShell>,
    );

    expect(html).toContain('vg-dashboard');
    expect(html).toContain('Taskdeck');
    expect(html).toContain('让每一次唤醒都清清楚楚');
  });
});
