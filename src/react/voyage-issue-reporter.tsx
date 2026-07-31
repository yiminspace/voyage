'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import {
  VOYAGE_ISSUE_SCHEMA,
  VOYAGE_VERSION,
  captureVoyageIssueTarget,
  collectVoyageEnvironment,
  findVoyageComponent,
  resolveVoyageIssueElement,
  safeVoyagePageUrl,
  type VoyageIssueKind,
  type VoyageIssueReport,
  type VoyageIssueTarget,
  type VoyageLocale,
  type VoyageReportApp,
  type VoyageTextQuote,
} from '../index';
import { useVoyage } from './voyage-provider';

type ReporterState = 'idle' | 'selecting' | 'composing' | 'submitting' | 'success' | 'error';

export interface VoyageIssueSubmitResult {
  issueUrl?: string;
  issueNumber?: string | number;
  id?: string;
  response?: unknown;
}

export interface VoyageIssueReporterProps {
  /** 宿主的 intake API；浏览器只 POST 证据包，GitHub token 必须留在服务端。 */
  endpoint: string;
  /** 应用身份；字符串是最简用法，也可带 release/build。 */
  app: string | VoyageReportApp;
  /** GitHub Issue 标签提示，默认 intake，由 intake API 落到最终 issue。 */
  labels?: readonly string[];
  /** 宿主确认安全后附加的业务元数据；不要放 token、cookie 或输入内容。 */
  metadata?: Record<string, unknown>;
  /** fetch 附加 header，适合 CSRF；不要在前端硬编码 GitHub token。 */
  headers?: HeadersInit;
  /** 默认 same-origin，以便同源 intake API 使用现有登录态。 */
  credentials?: RequestCredentials;
  locale?: VoyageLocale;
  className?: string;
  icon?: ReactNode;
  /** 启用 Cmd/Ctrl + Shift + .；默认 true。 */
  shortcut?: boolean;
  onSubmitted?: (result: VoyageIssueSubmitResult, report: VoyageIssueReport) => void;
}

const KIND_ORDER: readonly VoyageIssueKind[] = [
  'content',
  'appearance',
  'interaction',
  'data',
  'other',
] as const;

const STRINGS: Record<
  VoyageLocale,
  {
    trigger: string;
    selectionHint: string;
    cancel: string;
    panelTitle: string;
    close: string;
    selected: string;
    selectedCount: (count: number) => string;
    addTarget: string;
    removeTarget: string;
    reselect: string;
    cancelAdd: string;
    kinds: Record<VoyageIssueKind, string>;
    description: string;
    descriptions: Record<VoyageIssueKind, string>;
    privacy: string;
    privacySummary: string;
    privacyItems: string[];
    submit: string;
    submitting: string;
    required: string;
    success: string;
    viewIssue: string;
    newReport: string;
    retry: string;
    failure: string;
    masked: string;
    selectedText: string;
  }
> = {
  zh: {
    trigger: '反馈当前页面',
    selectionHint: '选择有问题的内容 · 可以滚动页面 · Esc 退出',
    cancel: '退出反馈',
    panelTitle: '报告问题',
    close: '关闭',
    selected: '已选择',
    selectedCount: (count) => `已选择 ${count} 个区域`,
    addTarget: '添加区域',
    removeTarget: '移除',
    reselect: '重新选择',
    cancelAdd: '取消添加',
    kinds: {
      content: '内容有误',
      appearance: '外观异常',
      interaction: '交互异常',
      data: '数据不对',
      other: '其他建议',
    },
    description: '哪里不对？你期望怎样？',
    descriptions: {
      content: '例如：这段文字有错别字，应该是……',
      appearance: '例如：颜色、间距、遮挡或对齐哪里异常？',
      interaction: '例如：你做了什么，实际发生了什么？',
      data: '例如：当前数据哪里不正确？',
      other: '描述你的建议或遇到的问题',
    },
    privacy: '查看所附数据',
    privacySummary: '会附带所选内容、组件样式、页面地址和运行环境。',
    privacyItems: [
      'URL query、输入框内容和 data-vg-private 区域不会上传',
      '局部 DOM 有深度、节点数和总长度限制',
      '不会采集 cookie、localStorage、token 或网络请求正文',
    ],
    submit: '提交',
    submitting: '提交中…',
    required: '请先简要描述问题',
    success: '问题已提交',
    viewIssue: '查看 Issue',
    newReport: '继续反馈',
    retry: '重试',
    failure: '提交失败，请重试。已保留本次选择与描述。',
    masked: '内容已隐私遮蔽',
    selectedText: '选中文字',
  },
  en: {
    trigger: 'Report an issue on this page',
    selectionHint: 'Select the problematic content · Scrolling stays available · Esc to exit',
    cancel: 'Exit feedback',
    panelTitle: 'Report an issue',
    close: 'Close',
    selected: 'Selected',
    selectedCount: (count) => `${count} areas selected`,
    addTarget: 'Add area',
    removeTarget: 'Remove',
    reselect: 'Select again',
    cancelAdd: 'Cancel adding',
    kinds: {
      content: 'Content',
      appearance: 'Appearance',
      interaction: 'Interaction',
      data: 'Data',
      other: 'Suggestion',
    },
    description: 'What is wrong, and what did you expect?',
    descriptions: {
      content: 'For example: this copy is incorrect; it should say…',
      appearance: 'Describe the color, spacing, clipping, or alignment problem',
      interaction: 'What did you do, and what happened instead?',
      data: 'Which displayed value is incorrect?',
      other: 'Describe your suggestion or problem',
    },
    privacy: 'Review attached data',
    privacySummary: 'Includes selected content, component styles, page address, and environment.',
    privacyItems: [
      'URL queries, form values, and data-vg-private regions are excluded',
      'The local DOM snapshot has depth, node-count, and size limits',
      'Cookies, localStorage, tokens, and network bodies are never collected',
    ],
    submit: 'Submit',
    submitting: 'Submitting…',
    required: 'Briefly describe the problem first',
    success: 'Issue submitted',
    viewIssue: 'View issue',
    newReport: 'Report another',
    retry: 'Retry',
    failure: 'Submission failed. Your selection and description are preserved.',
    masked: 'Content is privacy-masked',
    selectedText: 'Selected text',
  },
};

function DefaultReportIcon() {
  return (
    <svg
      className="vg-reporter-icon"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M8 9h8" />
      <path d="M8 13h6" />
      <path d="M9 18h-2a3 3 0 0 1 -3 -3v-8a3 3 0 0 1 3 -3h10a3 3 0 0 1 3 3v4" />
      <path d="M13 18l3 3l4 -4" />
    </svg>
  );
}

function supportsPopover(element: HTMLElement | null): element is HTMLElement & {
  showPopover: () => void;
  hidePopover: () => void;
} {
  return !!element && typeof element.showPopover === 'function';
}

function isReporterUi(element: Element | null): boolean {
  return !!element?.closest('[data-vg-reporter-ui]');
}

function selectionEvidence(): { element: Element; quote: VoyageTextQuote } | null {
  if (typeof window === 'undefined') return null;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;
  const exact = selection.toString().replace(/\s+/g, ' ').trim().slice(0, 1000);
  if (!exact) return null;

  const range = selection.getRangeAt(0);
  const common = range.commonAncestorContainer;
  const element = common.nodeType === Node.ELEMENT_NODE ? (common as Element) : common.parentElement;
  if (!element || isReporterUi(element)) return null;

  const context = (element.textContent ?? '').replace(/\s+/g, ' ').trim();
  const index = context.indexOf(exact);
  return {
    element,
    quote: {
      exact,
      prefix: index > 0 ? context.slice(Math.max(0, index - 48), index) : undefined,
      suffix:
        index >= 0
          ? context.slice(index + exact.length, index + exact.length + 48) || undefined
          : undefined,
    },
  };
}

function safeReferrer(): string | undefined {
  if (!document.referrer) return undefined;
  try {
    const url = new URL(document.referrer);
    return `${url.origin}${url.pathname}${url.hash}`;
  } catch {
    return undefined;
  }
}

function normalizeApp(app: string | VoyageReportApp): VoyageReportApp {
  return typeof app === 'string' ? { name: app } : app;
}

function previewElementLabel(element: Element): string {
  const voyageClass = Array.from(element.classList).find((className) =>
    className.startsWith('vg-')
  );
  const base = voyageClass ? `.${voyageClass}` : element.tagName.toLowerCase();
  const accessibleName =
    element.getAttribute('aria-label') ??
    element.getAttribute('title') ??
    element.textContent?.replace(/\s+/g, ' ').trim();

  if (!accessibleName) return base;

  const compactName =
    accessibleName.length > 80
      ? `${accessibleName.slice(0, 77)}…`
      : accessibleName;
  return `${base} “${compactName}”`;
}

function usesViewportCoordinates(element: Element): boolean {
  let current: Element | null = element;
  while (current) {
    const position = getComputedStyle(current).position;
    if (position === 'fixed' || position === 'sticky') return true;
    current = current.parentElement;
  }
  return false;
}

function highlightGeometry(
  element: Element | null,
  fallback: VoyageIssueTarget['rect'],
  fallbackDocument?: VoyageIssueTarget['documentRect']
): {
  position: 'document' | 'viewport';
  top: number;
  left: number;
  width: number;
  height: number;
} {
  const rect = element?.isConnected ? element.getBoundingClientRect() : fallback;
  const position =
    element?.isConnected && usesViewportCoordinates(element) ? 'viewport' : 'document';
  return {
    position,
    top:
      !element?.isConnected && fallbackDocument
        ? fallbackDocument.top
        : rect.top + (position === 'document' ? window.scrollY : 0),
    left:
      !element?.isConnected && fallbackDocument
        ? fallbackDocument.left
        : rect.left + (position === 'document' ? window.scrollX : 0),
    width: rect.width,
    height: rect.height,
  };
}

function responseResult(value: unknown): VoyageIssueSubmitResult {
  if (!value || typeof value !== 'object') return { response: value };
  const object = value as Record<string, unknown>;
  const issue = object.issue && typeof object.issue === 'object'
    ? (object.issue as Record<string, unknown>)
    : object;
  const issueUrl = [issue.issueUrl, issue.html_url, issue.url].find(
    (candidate): candidate is string => typeof candidate === 'string'
  );
  const issueNumber = [issue.issueNumber, issue.number].find(
    (candidate): candidate is string | number =>
      typeof candidate === 'string' || typeof candidate === 'number'
  );
  const id = typeof issue.id === 'string' || typeof issue.id === 'number'
    ? String(issue.id)
    : undefined;
  return { issueUrl, issueNumber, id, response: value };
}

export function VoyageIssueReporter({
  endpoint,
  app,
  labels = ['intake'],
  metadata,
  headers,
  credentials = 'same-origin',
  locale = 'zh',
  className,
  icon,
  shortcut = true,
  onSubmitted,
}: VoyageIssueReporterProps) {
  const { prefs } = useVoyage();
  const tr = STRINGS[locale];
  const appInfo = useMemo(() => normalizeApp(app), [app]);
  const [state, setState] = useState<ReporterState>('idle');
  const [kinds, setKinds] = useState<VoyageIssueKind[]>(['appearance']);
  const [description, setDescription] = useState('');
  const [targets, setTargets] = useState<VoyageIssueTarget[]>([]);
  const [hoveredElement, setHoveredElement] = useState<Element | null>(null);
  const [geometryTick, setGeometryTick] = useState(0);
  const [submitResult, setSubmitResult] = useState<VoyageIssueSubmitResult | null>(null);
  const [errorMessage, setErrorMessage] = useState('');
  const layerRef = useRef<HTMLDivElement | null>(null);
  const selectedElementsRef = useRef<Element[]>([]);
  const appendSelectionRef = useRef(false);
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const preservedSelectionRef = useRef<ReturnType<typeof selectionEvidence>>(null);
  const blockNextClickRef = useRef(false);
  const blockClickTimerRef = useRef<number | null>(null);
  const geometryFrameRef = useRef<number | null>(null);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);

  const active = state !== 'idle';

  const reset = useCallback(() => {
    setState('idle');
    setTargets([]);
    setHoveredElement(null);
    setDescription('');
    setKinds(['appearance']);
    setSubmitResult(null);
    setErrorMessage('');
    selectedElementsRef.current = [];
    appendSelectionRef.current = false;
    preservedSelectionRef.current = null;
  }, []);

  const capture = useCallback((element: Element, quote?: VoyageTextQuote) => {
    if (isReporterUi(element)) return;
    const resolvedElement = resolveVoyageIssueElement(element);
    const snapshot = captureVoyageIssueTarget(resolvedElement, quote);
    const append = appendSelectionRef.current;
    const existingIndex = selectedElementsRef.current.indexOf(resolvedElement);
    if (append && existingIndex >= 0) {
      appendSelectionRef.current = false;
      setHoveredElement(null);
      setState('composing');
      return;
    }
    selectedElementsRef.current = append
      ? [...selectedElementsRef.current, resolvedElement]
      : [resolvedElement];
    setTargets((current) => append ? [...current, snapshot] : [snapshot]);
    appendSelectionRef.current = false;
    setHoveredElement(null);
    if (!append) setKinds([quote ? 'content' : 'appearance']);
    setState('composing');
  }, []);

  const startReport = useCallback(
    (preferPointer: boolean, preserved?: ReturnType<typeof selectionEvidence>) => {
      if (state !== 'idle') return;
      appendSelectionRef.current = false;
      const selected = preserved ?? selectionEvidence();
      if (selected) {
        capture(selected.element, selected.quote);
        return;
      }
      if (preferPointer && pointerRef.current) {
        const element = document.elementFromPoint(pointerRef.current.x, pointerRef.current.y);
        if (element && !isReporterUi(element)) {
          capture(element);
          return;
        }
      }
      setState('selecting');
    },
    [capture, state]
  );

  const reselect = useCallback(() => {
    setTargets([]);
    selectedElementsRef.current = [];
    appendSelectionRef.current = false;
    setSubmitResult(null);
    setErrorMessage('');
    setState('selecting');
  }, []);

  const addTarget = useCallback(() => {
    appendSelectionRef.current = true;
    setHoveredElement(null);
    setSubmitResult(null);
    setErrorMessage('');
    setState('selecting');
  }, []);

  const cancelSelection = useCallback(() => {
    if (targets.length === 0) {
      reset();
      return;
    }
    appendSelectionRef.current = false;
    setHoveredElement(null);
    setState('composing');
  }, [reset, targets.length]);

  const removeTarget = useCallback((index: number) => {
    selectedElementsRef.current = selectedElementsRef.current.filter(
      (_element, elementIndex) => elementIndex !== index
    );
    const next = targets.filter((_target, targetIndex) => targetIndex !== index);
    setTargets(next);
    if (next.length === 0) {
      appendSelectionRef.current = false;
      setState('selecting');
    }
  }, [targets]);

  // 始终记住最后一个指针位置：快捷键可在不移开 hover 的情况下直接钉住目标。
  useEffect(() => {
    function rememberPointer(event: PointerEvent) {
      pointerRef.current = { x: event.clientX, y: event.clientY };
    }
    window.addEventListener('pointermove', rememberPointer, { passive: true });
    return () => window.removeEventListener('pointermove', rememberPointer);
  }, []);

  useEffect(() => {
    if (!shortcut) return;
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.code === 'Period' &&
        event.shiftKey &&
        (event.metaKey || event.ctrlKey) &&
        !event.altKey
      ) {
        event.preventDefault();
        if (state === 'idle') startReport(true);
      }
      if (event.key === 'Escape' && active) {
        event.preventDefault();
        if (state === 'selecting') cancelSelection();
        else reset();
      }
    }
    document.addEventListener('keydown', onKeyDown, true);
    return () => document.removeEventListener('keydown', onKeyDown, true);
  }, [active, cancelSelection, reset, shortcut, startReport, state]);

  // 选择模式只吞点击，不吞 wheel/scroll；业务按钮和链接不会被误触。
  useEffect(() => {
    if (state !== 'selecting') return;

    function elementAt(event: PointerEvent): Element | null {
      const element = document.elementFromPoint(event.clientX, event.clientY);
      return element && !isReporterUi(element)
        ? resolveVoyageIssueElement(element)
        : null;
    }
    function onPointerMove(event: PointerEvent) {
      setHoveredElement(elementAt(event));
      setGeometryTick((value) => value + 1);
    }
    function onPointerDown(event: PointerEvent) {
      const element = elementAt(event);
      if (!element) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      blockNextClickRef.current = true;
      if (blockClickTimerRef.current !== null) window.clearTimeout(blockClickTimerRef.current);
      blockClickTimerRef.current = window.setTimeout(() => {
        blockNextClickRef.current = false;
      }, 700);
      capture(element);
    }
    document.addEventListener('pointermove', onPointerMove, true);
    document.addEventListener('pointerdown', onPointerDown, true);
    return () => {
      document.removeEventListener('pointermove', onPointerMove, true);
      document.removeEventListener('pointerdown', onPointerDown, true);
    };
  }, [capture, state]);

  // 普通页面元素使用文档坐标随页面原生滚动；这里只为嵌套滚动容器和 fixed/sticky 元素刷新。
  useEffect(() => {
    if (!active || state === 'success') return;
    function onGeometryChange() {
      if (geometryFrameRef.current !== null) return;
      geometryFrameRef.current = window.requestAnimationFrame(() => {
        geometryFrameRef.current = null;
        setGeometryTick((value) => value + 1);
      });
    }
    window.addEventListener('resize', onGeometryChange);
    window.addEventListener('scroll', onGeometryChange, true);
    return () => {
      window.removeEventListener('resize', onGeometryChange);
      window.removeEventListener('scroll', onGeometryChange, true);
      if (geometryFrameRef.current !== null) {
        window.cancelAnimationFrame(geometryFrameRef.current);
        geometryFrameRef.current = null;
      }
    };
  }, [active, state]);

  useEffect(() => {
    function swallowSelectedClick(event: MouseEvent) {
      if (!blockNextClickRef.current) return;
      blockNextClickRef.current = false;
      if (blockClickTimerRef.current !== null) window.clearTimeout(blockClickTimerRef.current);
      event.preventDefault();
      event.stopImmediatePropagation();
    }
    document.addEventListener('click', swallowSelectedClick, true);
    return () => document.removeEventListener('click', swallowSelectedClick, true);
  }, []);

  useEffect(() => {
    return () => {
      if (blockClickTimerRef.current !== null) window.clearTimeout(blockClickTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (state !== 'composing' && state !== 'error') return;
    descriptionRef.current?.focus();
  }, [state]);

  // Reporter 整层进入 top layer；manual popover 不触发 light-dismiss，尽量保留问题现场。
  useEffect(() => {
    const layer = layerRef.current;
    if (!layer || !active || !supportsPopover(layer)) return;
    try {
      layer.showPopover();
    } catch {
      // 已打开或浏览器状态不同步时，React 状态仍是事实源。
    }
    return () => {
      try {
        layer.hidePopover();
      } catch {
        // 卸载时浏览器可能已经关闭。
      }
    };
  }, [active]);

  const setLayerRef = useCallback((element: HTMLDivElement | null) => {
    layerRef.current = element;
    element?.setAttribute('popover', 'manual');
  }, []);

  const liveElement = state === 'selecting' ? hoveredElement : null;
  const liveRect = liveElement?.isConnected
    ? highlightGeometry(liveElement, liveElement.getBoundingClientRect())
    : null;
  const componentElement =
    liveElement && liveElement.isConnected ? findVoyageComponent(liveElement) : null;
  const componentRect =
    componentElement && componentElement !== liveElement
      ? highlightGeometry(
          componentElement,
          componentElement.getBoundingClientRect()
        )
      : null;
  const selectedVisuals = targets.map((target, index) => {
    const element = selectedElementsRef.current[index];
    return {
      target,
      rect: highlightGeometry(element ?? null, target.rect, target.documentRect),
    };
  });
  void geometryTick;

  const toggleKind = useCallback((value: VoyageIssueKind) => {
    setKinds((current) => {
      if (!current.includes(value)) return [...current, value];
      return current.length > 1 ? current.filter((kind) => kind !== value) : current;
    });
  }, []);

  const submit = useCallback(async () => {
    if (targets.length === 0 || !description.trim()) {
      setErrorMessage(tr.required);
      return;
    }
    setErrorMessage('');
    setState('submitting');

    const summary = description.trim().split(/\r?\n/, 1)[0].slice(0, 100);
    const report: VoyageIssueReport = {
      schema: VOYAGE_ISSUE_SCHEMA,
      createdAt: new Date().toISOString(),
      title: `[${appInfo.name}] ${summary}`,
      description: description.trim(),
      kind: kinds[0],
      kinds,
      labels: [...new Set(labels.length ? labels : ['intake'])],
      destination: { provider: 'github-issue' },
      app: appInfo,
      voyage: { ...prefs, version: VOYAGE_VERSION },
      page: {
        url: safeVoyagePageUrl(),
        title: document.title,
        referrer: safeReferrer(),
      },
      environment: collectVoyageEnvironment(),
      targets,
      metadata,
    };

    try {
      const requestHeaders = new Headers(headers);
      if (!requestHeaders.has('content-type')) requestHeaders.set('content-type', 'application/json');
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: requestHeaders,
        credentials,
        body: JSON.stringify(report),
      });
      const contentType = response.headers.get('content-type') ?? '';
      const responseBody = contentType.includes('application/json')
        ? await response.json()
        : await response.text();
      if (!response.ok) {
        const detail =
          typeof responseBody === 'string'
            ? responseBody
            : JSON.stringify(responseBody);
        throw new Error(`${response.status} ${response.statusText}${detail ? `: ${detail}` : ''}`);
      }
      const result = responseResult(responseBody);
      setSubmitResult(result);
      selectedElementsRef.current = [];
      setTargets([]);
      setHoveredElement(null);
      setState('success');
      onSubmitted?.(result, report);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : tr.failure);
      setState('error');
    }
  }, [
    appInfo,
    credentials,
    description,
    endpoint,
    headers,
    kinds,
    labels,
    metadata,
    onSubmitted,
    prefs,
    targets,
    tr.failure,
    tr.required,
  ]);

  const layer =
    active && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={setLayerRef}
            className="vg-reporter-layer"
            data-vg-reporter-ui
            data-vg-private
          >
            {state !== 'success' ? selectedVisuals.map(({ target, rect }, index) => (
              <div
                key={`${target.selector}-${index}`}
                className={`vg-reporter-highlight saved ${rect.position}`}
                style={{
                  top: rect.top,
                  left: rect.left,
                  width: rect.width,
                  height: rect.height,
                }}
              >
                <span className="vg-reporter-highlight-label">
                  {index + 1} · {target.label}
                </span>
              </div>
            )) : null}

            {liveRect ? (
              <>
                {componentRect ? (
                  <div
                    className={`vg-reporter-component-highlight ${componentRect.position}`}
                    style={{
                      top: componentRect.top,
                      left: componentRect.left,
                      width: componentRect.width,
                      height: componentRect.height,
                    }}
                  />
                ) : null}
                <div
                  className={`vg-reporter-highlight ${liveRect.position}`}
                  style={{
                    top: liveRect.top,
                    left: liveRect.left,
                    width: liveRect.width,
                    height: liveRect.height,
                  }}
                >
                  <span className="vg-reporter-highlight-label">
                    {previewElementLabel(liveElement!)}
                  </span>
                </div>
              </>
            ) : null}

            {state === 'selecting' ? (
              <div className="vg-reporter-hud" role="status">
                <span>
                  {tr.selectionHint}
                  {targets.length > 0 ? ` · ${tr.selectedCount(targets.length)}` : ''}
                </span>
                <button type="button" className="vg-btn" onClick={cancelSelection}>
                  {targets.length > 0 ? tr.cancelAdd : tr.cancel}
                </button>
              </div>
            ) : null}

            {state !== 'selecting' ? (
              <dialog open className="vg-reporter-panel" aria-label={tr.panelTitle}>
                <header className="vg-reporter-panel-head">
                  <strong>{state === 'success' ? tr.success : tr.panelTitle}</strong>
                  <button
                    type="button"
                    className="vg-iconbtn"
                    aria-label={tr.close}
                    onClick={reset}
                  >
                    ×
                  </button>
                </header>

                {state === 'success' ? (
                  <div className="vg-reporter-success">
                    <span className="vg-reporter-success-mark" aria-hidden="true">✓</span>
                    {submitResult?.issueNumber ? (
                      <code>#{submitResult.issueNumber}</code>
                    ) : null}
                    <div className="vg-reporter-actions">
                      {submitResult?.issueUrl ? (
                        <a
                          className="vg-btn primary"
                          href={submitResult.issueUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {tr.viewIssue}
                        </a>
                      ) : null}
                      <button type="button" className="vg-btn" onClick={reset}>
                        {tr.newReport}
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <section className="vg-reporter-targets">
                      <header className="vg-reporter-targets-head">
                        <span className="vg-reporter-eyebrow">
                          {tr.selectedCount(targets.length)}
                        </span>
                        <div>
                          <button type="button" className="vg-btn" onClick={addTarget}>
                            {tr.addTarget}
                          </button>
                          <button type="button" className="vg-btn" onClick={reselect}>
                            {tr.reselect}
                          </button>
                        </div>
                      </header>
                      <div className="vg-reporter-target-list">
                        {targets.map((target, index) => (
                          <article
                            key={`${target.selector}-${index}`}
                            className="vg-reporter-target"
                          >
                            <div>
                              <span className="vg-reporter-eyebrow">
                                {target.textQuote
                                  ? tr.selectedText
                                  : `${tr.selected} ${index + 1}`}
                              </span>
                              <strong>{target.label}</strong>
                              {target.contentMasked ? (
                                <small>{tr.masked}</small>
                              ) : target.textQuote?.exact ? (
                                <blockquote>{target.textQuote.exact}</blockquote>
                              ) : target.text ? (
                                <small>{target.text.slice(0, 180)}</small>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              className="vg-btn"
                              aria-label={`${tr.removeTarget}: ${target.label}`}
                              onClick={() => removeTarget(index)}
                            >
                              {tr.removeTarget}
                            </button>
                          </article>
                        ))}
                      </div>
                    </section>

                    <div className="vg-reporter-kinds" role="group" aria-label={tr.panelTitle}>
                      {KIND_ORDER.map((value) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={kinds.includes(value)}
                          className={`vg-reporter-kind${kinds.includes(value) ? ' on' : ''}`}
                          onClick={() => toggleKind(value)}
                        >
                          {tr.kinds[value]}
                        </button>
                      ))}
                    </div>

                    <label className="vg-reporter-field">
                      <span>{tr.description}</span>
                      <textarea
                        ref={descriptionRef}
                        data-vg-private
                        rows={5}
                        value={description}
                        placeholder={tr.descriptions[kinds[0]]}
                        onChange={(event) => setDescription(event.target.value)}
                      />
                    </label>

                    <details className="vg-reporter-privacy">
                      <summary>{tr.privacy}</summary>
                      <p>{tr.privacySummary}</p>
                      <ul>
                        {tr.privacyItems.map((item) => <li key={item}>{item}</li>)}
                      </ul>
                    </details>

                    {errorMessage ? (
                      <p className="vg-reporter-error" role="alert">
                        {state === 'error' ? `${tr.failure} ${errorMessage}` : errorMessage}
                      </p>
                    ) : null}

                    <footer className="vg-reporter-actions">
                      <button type="button" className="vg-btn" onClick={reset}>
                        {tr.cancel}
                      </button>
                      <button
                        type="button"
                        className="vg-btn primary"
                        disabled={state === 'submitting'}
                        onClick={() => void submit()}
                      >
                        {state === 'submitting'
                          ? tr.submitting
                          : state === 'error'
                            ? tr.retry
                            : tr.submit}
                      </button>
                    </footer>
                  </>
                )}
              </dialog>
            ) : null}
          </div>,
          document.body
        )
      : null;

  return (
    <>
      <button
        type="button"
        className={['vg-iconbtn', 'vg-reporter-trigger', className].filter(Boolean).join(' ')}
        aria-label={tr.trigger}
        title={shortcut ? `${tr.trigger} (⌘/Ctrl ⇧ .)` : tr.trigger}
        data-vg-reporter-ui
        onPointerDown={() => {
          preservedSelectionRef.current = selectionEvidence();
        }}
        onClick={() => startReport(false, preservedSelectionRef.current)}
      >
        {icon ?? <DefaultReportIcon />}
      </button>
      {layer}
    </>
  );
}
