import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { VoyageProvider } from './voyage-provider';
import { VoyageIssueReporter } from './voyage-issue-reporter';

function response(body: unknown, ok = true) {
  return {
    ok,
    status: ok ? 201 : 500,
    statusText: ok ? 'Created' : 'Internal Server Error',
    headers: new Headers({ 'content-type': 'application/json' }),
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

function renderReporter(onSubmitted = vi.fn()) {
  return {
    onSubmitted,
    ...render(
      <VoyageProvider>
        <main>
          <section className="vg-card" data-testid="problem-card">
            <p>查询结果不完整</p>
            <textarea data-vg-private defaultValue="不应上传的草稿" />
          </section>
          <button id="refresh-results" className="vg-btn">
            刷新结果
          </button>
          <VoyageIssueReporter
            endpoint="/api/intake"
            app={{ name: 'quarry', release: '2026.07.31' }}
            metadata={{ routeName: 'query-detail' }}
            onSubmitted={onSubmitted}
          />
        </main>
      </VoyageProvider>
    ),
  };
}

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState({}, '', '/queries/42?token=secret#result');
  Object.defineProperty(document, 'elementFromPoint', {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe('VoyageIssueReporter', () => {
  it('选择元素后 POST 脱敏证据包，并默认请求 intake 标签的 GitHub Issue', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      response({
        issueUrl: 'https://github.com/yiminspace/yiminlab/issues/501',
        issueNumber: 501,
      })
    );
    vi.stubGlobal('fetch', fetchMock);
    const { onSubmitted } = renderReporter();
    const target = screen.getByTestId('problem-card');
    vi.mocked(document.elementFromPoint).mockReturnValue(target);

    fireEvent.click(screen.getByRole('button', { name: '反馈当前页面' }));
    expect(screen.getByRole('status').textContent).toContain('选择有问题的内容');

    fireEvent.pointerDown(document, { clientX: 40, clientY: 80 });
    fireEvent.click(target);
    expect(screen.getByRole('dialog', { name: '报告问题' })).not.toBeNull();

    fireEvent.change(screen.getByLabelText('哪里不对？你期望怎样？'), {
      target: { value: '结果少了一行，应该显示全部记录' },
    });
    expect(document.querySelectorAll('.vg-reporter-highlight.saved')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: '提交' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const report = JSON.parse(String(init.body));

    expect(url).toBe('/api/intake');
    expect(init).toMatchObject({ method: 'POST', credentials: 'same-origin' });
    expect(report).toMatchObject({
      schema: 'voyage-ui-issue/v1',
      title: '[quarry] 结果少了一行，应该显示全部记录',
      description: '结果少了一行，应该显示全部记录',
      kind: 'appearance',
      kinds: ['appearance'],
      labels: ['intake'],
      destination: { provider: 'github-issue' },
      app: { name: 'quarry', release: '2026.07.31' },
      metadata: { routeName: 'query-detail' },
      page: {
        url: 'http://localhost:3000/queries/42#result',
      },
    });
    expect(report.page.url).not.toContain('token');
    expect(report.targets[0].html).toContain('[masked]');
    expect(report.targets[0].html).not.toContain('不应上传的草稿');
    expect(report.voyage.version).toBe('0.10.0');

    expect(await screen.findByText('问题已提交')).not.toBeNull();
    expect(document.querySelectorAll('.vg-reporter-highlight.saved')).toHaveLength(0);
    expect(screen.getByRole('link', { name: '查看 Issue' }).getAttribute('href')).toBe(
      'https://github.com/yiminspace/yiminlab/issues/501'
    );
    expect(onSubmitted).toHaveBeenCalledWith(
      expect.objectContaining({ issueNumber: 501 }),
      expect.objectContaining({ labels: ['intake'] })
    );
  });

  it('触发按钮会保留现有划词并直接进入内容反馈', () => {
    renderReporter();
    const paragraph = screen.getByText('查询结果不完整');
    const range = document.createRange();
    range.selectNodeContents(paragraph);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);

    const trigger = screen.getByRole('button', { name: '反馈当前页面' });
    fireEvent.pointerDown(trigger);
    selection.removeAllRanges();
    fireEvent.click(trigger);

    expect(screen.queryByRole('status')).toBeNull();
    expect(screen.getByRole('dialog', { name: '报告问题' })).not.toBeNull();
    expect(screen.getByText('选中文字')).not.toBeNull();
    expect(screen.getByText('查询结果不完整', { selector: 'blockquote' })).not.toBeNull();
    expect(
      screen.getByRole('button', { name: '内容有误' }).getAttribute('aria-pressed')
    ).toBe(
      'true'
    );
  });

  it('服务端失败时保留目标与描述，允许原地重试', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response({ error: 'GitHub unavailable' }, false))
      .mockResolvedValueOnce(response({ issueNumber: 502 }));
    vi.stubGlobal('fetch', fetchMock);
    renderReporter();
    const target = screen.getByTestId('problem-card');
    vi.mocked(document.elementFromPoint).mockReturnValue(target);

    fireEvent.click(screen.getByRole('button', { name: '反馈当前页面' }));
    fireEvent.pointerDown(document, { clientX: 40, clientY: 80 });
    fireEvent.click(target);
    const textbox = screen.getByLabelText('哪里不对？你期望怎样？');
    fireEvent.change(textbox, { target: { value: '按钮没有反应' } });
    fireEvent.click(screen.getByRole('button', { name: '提交' }));

    expect((await screen.findByRole('alert')).textContent).toContain('GitHub unavailable');
    expect(
      (screen.getByLabelText('哪里不对？你期望怎样？') as HTMLTextAreaElement).value
    ).toBe('按钮没有反应');
    fireEvent.click(screen.getByRole('button', { name: '重试' }));

    expect(await screen.findByText('问题已提交')).not.toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('可继续添加多个区域，并把所有目标放进同一份报告', async () => {
    const fetchMock = vi.fn().mockResolvedValue(response({ issueNumber: 503 }));
    vi.stubGlobal('fetch', fetchMock);
    renderReporter();
    const firstTarget = screen.getByTestId('problem-card');
    const secondTarget = screen.getByRole('button', { name: '刷新结果' });
    vi.mocked(document.elementFromPoint).mockReturnValue(firstTarget);

    fireEvent.click(screen.getByRole('button', { name: '反馈当前页面' }));
    fireEvent.pointerDown(document, { clientX: 40, clientY: 80 });
    fireEvent.click(firstTarget);

    fireEvent.click(screen.getByRole('button', { name: '添加区域' }));
    expect(screen.getByRole('status').textContent).toContain('已选择 1 个区域');
    vi.mocked(document.elementFromPoint).mockReturnValue(secondTarget);
    fireEvent.pointerDown(document, { clientX: 90, clientY: 120 });
    fireEvent.click(secondTarget);

    expect(screen.getByText('已选择 2 个区域')).not.toBeNull();
    expect(
      screen.getByRole('button', { name: '移除: vg-btn “刷新结果”' })
    ).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '内容有误' }));
    expect(
      screen.getByRole('button', { name: '内容有误' }).getAttribute('aria-pressed')
    ).toBe('true');
    expect(
      screen.getByRole('button', { name: '外观异常' }).getAttribute('aria-pressed')
    ).toBe('true');

    fireEvent.change(screen.getByLabelText('哪里不对？你期望怎样？'), {
      target: { value: '这两个区域属于同一个问题' },
    });
    fireEvent.click(screen.getByRole('button', { name: '提交' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    const report = JSON.parse(String((fetchMock.mock.calls[0][1] as RequestInit).body));
    expect(report.targets).toHaveLength(2);
    expect(report.targets.map((target: { selector: string }) => target.selector)).toEqual([
      '[data-testid="problem-card"]',
      '#refresh-results',
    ]);
    expect(report.kind).toBe('appearance');
    expect(report.kinds).toEqual(['appearance', 'content']);
  });

  it('普通页面滚动时使用稳定的文档坐标，选框无需下一帧追赶元素', async () => {
    renderReporter();
    const target = screen.getByTestId('problem-card');
    let top = 180;
    vi.stubGlobal('scrollY', 0);
    vi.spyOn(target, 'getBoundingClientRect').mockImplementation(
      () =>
        ({
          x: 20,
          y: top,
          top,
          left: 20,
          right: 220,
          bottom: top + 80,
          width: 200,
          height: 80,
          toJSON: () => ({}),
        }) as DOMRect
    );
    vi.mocked(document.elementFromPoint).mockReturnValue(target);

    fireEvent.click(screen.getByRole('button', { name: '反馈当前页面' }));
    fireEvent.pointerDown(document, { clientX: 40, clientY: 180 });
    fireEvent.click(target);

    const highlight = document.querySelector('.vg-reporter-highlight.saved') as HTMLElement;
    expect(highlight.style.top).toBe('180px');
    expect(highlight.classList.contains('document')).toBe(true);

    top = 60;
    vi.stubGlobal('scrollY', 120);
    fireEvent.scroll(window);
    await waitFor(() => expect(highlight.style.top).toBe('180px'));
  });
});
