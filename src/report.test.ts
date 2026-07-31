import { afterEach, describe, expect, it, vi } from 'vitest';
import packageJson from '../package.json';
import { VOYAGE_VERSION } from './index';
import {
  captureVoyageIssueTarget,
  resolveVoyageIssueElement,
  safeVoyagePageUrl,
  voyageElementSelector,
} from './report';

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});

describe('Voyage issue evidence', () => {
  it('证据中的 Voyage 版本与发布包版本保持同步', () => {
    expect(VOYAGE_VERSION).toBe(packageJson.version);
  });

  it('优先使用稳定语义属性定位元素，并记录 Voyage 组件上下文', () => {
    document.body.innerHTML = `
      <section class="vg-card" data-vg-id="account-card">
        <button class="vg-btn primary" data-testid="save-button" aria-label="保存设置">
          保存
        </button>
      </section>
    `;
    const button = document.querySelector('button')!;
    Object.defineProperty(button, 'getBoundingClientRect', {
      value: () => ({
        x: 12,
        y: 24,
        width: 80,
        height: 28,
        top: 24,
        right: 92,
        bottom: 52,
        left: 12,
      }),
    });
    Object.defineProperty(button, 'getClientRects', {
      value: () => [
        {
          x: 12,
          y: 24,
          width: 80,
          height: 28,
          top: 24,
          right: 92,
          bottom: 52,
          left: 12,
        },
      ],
    });
    vi.stubGlobal('scrollX', 7);
    vi.stubGlobal('scrollY', 11);

    const target = captureVoyageIssueTarget(button);

    expect(voyageElementSelector(button)).toBe('[data-testid="save-button"]');
    expect(target.selector).toBe('[data-testid="save-button"]');
    expect(target.componentSelector).toBe('[data-testid="save-button"]');
    expect(target.componentLineage).toEqual(['vg-card', 'vg-btn']);
    expect(target.semanticId).toBe('account-card');
    expect(target.role).toBe('button');
    expect(target.accessibleName).toBe('保存设置');
    expect(target.capturedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(target.rectSpace).toBe('viewport');
    expect(target.scroll).toEqual({ x: 7, y: 11 });
    expect(target.rect).toMatchObject({ x: 12, y: 24, width: 80, height: 28 });
    expect(target.documentRect).toMatchObject({
      x: 19,
      y: 35,
      top: 35,
      right: 99,
      bottom: 63,
      left: 19,
    });
  });

  it('把按钮图标的叶子节点归一化到可操作的语义元素', () => {
    document.body.innerHTML = `
      <button id="run-query" class="vg-iconbtn" aria-label="执行查询">
        <svg class="vg-icon" viewBox="0 0 24 24">
          <path d="M4 12h16" />
        </svg>
      </button>
      <p><span id="copy">普通正文</span></p>
    `;

    expect(resolveVoyageIssueElement(document.querySelector('path')!)).toBe(
      document.querySelector('button')
    );
    expect(resolveVoyageIssueElement(document.querySelector('#copy')!)).toBe(
      document.querySelector('#copy')
    );
  });

  it('遮蔽被选中的私密元素，也不会从公共父容器旁路采集私密后代文本', () => {
    document.body.innerHTML = `
      <article class="vg-card">
        <p>公开说明</p>
        <textarea
          id="customer-alice-draft"
          data-testid="secret-editor"
          data-vg-private
          aria-label="Alice 的绝密草稿"
        >绝密草稿</textarea>
        <div data-vg-private aria-label="内部客户编号 8848">内部客户编号 8848</div>
      </article>
    `;
    const article = document.querySelector('article')!;
    const textarea = document.querySelector('textarea')!;

    const parentTarget = captureVoyageIssueTarget(article);
    expect(parentTarget.text).toBe('公开说明');
    expect(parentTarget.html).toContain('[masked]');
    expect(parentTarget.html).not.toContain('绝密草稿');
    expect(parentTarget.html).not.toContain('8848');
    expect(parentTarget.html).not.toContain('Alice');
    expect(parentTarget.html).not.toContain('customer-alice-draft');
    expect(parentTarget.html).not.toContain('secret-editor');

    const privateTarget = captureVoyageIssueTarget(textarea, { exact: '绝密草稿' });
    expect(privateTarget.contentMasked).toBe(true);
    expect(privateTarget.text).toBeUndefined();
    expect(privateTarget.textQuote).toBeUndefined();
    expect(privateTarget.accessibleName).toBeUndefined();
    expect(privateTarget.semanticId).toBeUndefined();
    expect(privateTarget.componentSelector).toBeUndefined();
    expect(privateTarget.selector).not.toContain('customer-alice-draft');
    expect(privateTarget.selector).not.toContain('secret-editor');
    expect(privateTarget.attributes).toEqual({});
    expect(privateTarget.html).toBe('<textarea>[masked]</textarea>');
  });

  it('局部 DOM 快照有固定总长度上限', () => {
    const element = document.createElement('div');
    element.className = 'vg-card';
    for (let index = 0; index < 250; index += 1) {
      const child = document.createElement('p');
      child.textContent = `${index}-${'很长的内容'.repeat(80)}`;
      element.appendChild(child);
    }
    document.body.appendChild(element);

    const target = captureVoyageIssueTarget(element);
    expect(target.html.length).toBeLessThanOrEqual(12_000);
  });

  it('页面地址默认剥离 query，保留定位有用的 path 与 hash', () => {
    const locationLike = {
      origin: 'https://quarry.example.com',
      pathname: '/queries/42',
      search: '?token=secret&keyword=alice',
      hash: '#result',
    } as Location;

    expect(safeVoyagePageUrl(locationLike)).toBe(
      'https://quarry.example.com/queries/42#result'
    );
  });
});
