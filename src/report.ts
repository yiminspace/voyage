import type { VoyagePrefs } from './index';

export const VOYAGE_ISSUE_SCHEMA = 'voyage-ui-issue/v1' as const;

export type VoyageIssueKind = 'content' | 'appearance' | 'interaction' | 'data' | 'other';

export interface VoyageReportApp {
  name: string;
  release?: string;
  build?: string;
}

export interface VoyageTextQuote {
  exact: string;
  prefix?: string;
  suffix?: string;
}

export interface VoyageIssueRect {
  x: number;
  y: number;
  width: number;
  height: number;
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface VoyageIssueTarget {
  /** 目标证据冻结的时刻。 */
  capturedAt: string;
  tagName: string;
  label: string;
  selector: string;
  componentSelector?: string;
  voyageClasses: string[];
  componentLineage: string[];
  semanticId?: string;
  role?: string;
  accessibleName?: string;
  text?: string;
  textQuote?: VoyageTextQuote;
  attributes: Record<string, string>;
  /** getBoundingClientRect() 的视口坐标快照。 */
  rect: VoyageIssueRect;
  rectSpace: 'viewport';
  /** 采集 rect 时的页面滚动位置。 */
  scroll: { x: number; y: number };
  /** 由 rect + scroll 换算出的文档坐标，便于服务端或回放工具直接定位。 */
  documentRect: VoyageIssueRect;
  clientRects: VoyageIssueRect[];
  computedStyle: Record<string, string>;
  tokens: Record<string, string>;
  html: string;
  contentMasked: boolean;
}

export interface VoyageIssueReport {
  schema: typeof VOYAGE_ISSUE_SCHEMA;
  /** 一次反馈会话的稳定幂等键；原地重试保持不变，新反馈重新生成。 */
  reportId: string;
  createdAt: string;
  title: string;
  description: string;
  /** 兼容只识别单类型的 intake；值等于 kinds[0]。 */
  kind: VoyageIssueKind;
  /** 用户选择的全部问题类型，至少一项。 */
  kinds: VoyageIssueKind[];
  labels: string[];
  destination: {
    provider: 'github-issue';
  };
  app: VoyageReportApp;
  voyage: VoyagePrefs & {
    version: string;
  };
  page: {
    url: string;
    title: string;
    referrer?: string;
  };
  environment: {
    userAgent: string;
    language: string;
    timezone: string;
    viewport: { width: number; height: number };
    screen?: { width: number; height: number };
    devicePixelRatio: number;
    colorScheme?: 'dark' | 'light';
    reducedMotion?: boolean;
  };
  targets: VoyageIssueTarget[];
  metadata?: Record<string, unknown>;
}

const PRIVATE_SELECTOR =
  '[data-vg-private],input[type="password"],input[type="email"],input[type="tel"],textarea,[contenteditable]:not([contenteditable="false"])';

const INTERACTIVE_SELECTOR = [
  'button',
  'a[href]',
  'input',
  'select',
  'textarea',
  'summary',
  '[role="button"]',
  '[role="link"]',
  '[role="checkbox"]',
  '[role="radio"]',
  '[role="switch"]',
  '[role="tab"]',
  '[role="menuitem"]',
  '[role="option"]',
].join(',');

const COMPUTED_STYLE_PROPERTIES = [
  'display',
  'position',
  'visibility',
  'opacity',
  'box-sizing',
  'width',
  'height',
  'min-width',
  'min-height',
  'max-width',
  'max-height',
  'margin',
  'padding',
  'gap',
  'overflow',
  'z-index',
  'color',
  'background-color',
  'background-image',
  'border',
  'border-radius',
  'box-shadow',
  'font-family',
  'font-size',
  'font-weight',
  'line-height',
  'letter-spacing',
  'text-align',
  'white-space',
  'text-overflow',
  'transform',
  'filter',
] as const;

const VOYAGE_TOKEN_NAMES = [
  '--fg',
  '--fg2',
  '--fg3',
  '--on-fg',
  '--bg0',
  '--bg1',
  '--bg2',
  '--bg3',
  '--line',
  '--line2',
  '--accent',
  '--accent-hi',
  '--accent-ink',
  '--acc',
  '--acc-hi',
  '--acc-ink',
  '--acc-text',
  '--fill-grad',
  '--fill-ink',
  '--sel-bg',
  '--hoverbg',
  '--surf-1',
  '--surf-2',
  '--ok',
  '--warn',
  '--red',
  '--r-win',
  '--r-btn',
  '--r-pill',
  '--nav-py',
  '--cell-py',
  '--btn-pad',
] as const;

function truncate(value: string, limit: number): string {
  if (value.length <= limit) return value;
  return `${value.slice(0, Math.max(0, limit - 1))}…`;
}

function normalizeText(value: string | null | undefined, limit = 1000): string {
  return truncate((value ?? '').replace(/\s+/g, ' ').trim(), limit);
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

function rectToIssueRect(rect: DOMRect | DOMRectReadOnly): VoyageIssueRect {
  return {
    x: round(rect.x),
    y: round(rect.y),
    width: round(rect.width),
    height: round(rect.height),
    top: round(rect.top),
    right: round(rect.right),
    bottom: round(rect.bottom),
    left: round(rect.left),
  };
}

function offsetIssueRect(rect: VoyageIssueRect, x: number, y: number): VoyageIssueRect {
  return {
    x: round(rect.x + x),
    y: round(rect.y + y),
    width: rect.width,
    height: rect.height,
    top: round(rect.top + y),
    right: round(rect.right + x),
    bottom: round(rect.bottom + y),
    left: round(rect.left + x),
  };
}

function cssEscape(value: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(value);
  return value.replace(/[^a-zA-Z0-9_-]/g, (char) => `\\${char}`);
}

function attributeSelector(name: string, value: string): string {
  return `[${name}="${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"]`;
}

/**
 * elementFromPoint 会命中按钮图标里的 path 等叶子节点。报告定位应优先落到
 * 最近的交互语义元素；非交互内容仍保留用户实际点中的节点。
 */
export function resolveVoyageIssueElement(element: Element): Element {
  const interactive = element.closest(INTERACTIVE_SELECTOR);
  if (interactive) return interactive;
  return element.closest('svg') ?? element;
}

/** 生成用于报告定位的可读 selector；稳定 data 属性优先，结构路径作为降级。 */
export function voyageElementSelector(element: Element): string {
  const stableAttributes = ['data-vg-id', 'data-testid', 'data-vg-component'] as const;
  for (const name of stableAttributes) {
    const value = element.getAttribute(name);
    if (value) return attributeSelector(name, truncate(value, 120));
  }

  if (element.id && element.id.length <= 120) return `#${cssEscape(element.id)}`;

  const parts: string[] = [];
  let current: Element | null = element;
  while (current && parts.length < 7) {
    const tagName = current.tagName.toLowerCase();
    if (tagName === 'html') {
      parts.unshift('html');
      break;
    }

    let part = tagName;
    const voyageClass = [...current.classList].find(
      (name) => name.startsWith('vg-') && !name.startsWith('vg-reporter-')
    );
    if (voyageClass) part += `.${cssEscape(voyageClass)}`;

    const parentElement: Element | null = current.parentElement;
    if (parentElement) {
      const sameTag = [...parentElement.children].filter(
        (child) => child.tagName === current!.tagName
      );
      if (sameTag.length > 1) part += `:nth-of-type(${sameTag.indexOf(current) + 1})`;
    }
    parts.unshift(part);
    current = parentElement;
  }
  return parts.join(' > ');
}

export function findVoyageComponent(element: Element): Element | null {
  let current: Element | null = element;
  while (current) {
    if (
      [...current.classList].some(
        (name) => name.startsWith('vg-') && !name.startsWith('vg-reporter-')
      )
    ) {
      return current;
    }
    current = current.parentElement;
  }
  return null;
}

function implicitRole(element: Element): string | undefined {
  const explicit = element.getAttribute('role');
  if (explicit) return explicit;
  const tagName = element.tagName.toLowerCase();
  if (tagName === 'button') return 'button';
  if (tagName === 'a' && element.hasAttribute('href')) return 'link';
  if (tagName === 'textarea') return 'textbox';
  if (tagName === 'select') return 'combobox';
  if (tagName === 'input') {
    const type = (element.getAttribute('type') ?? 'text').toLowerCase();
    if (type === 'checkbox') return 'checkbox';
    if (type === 'radio') return 'radio';
    if (['button', 'submit', 'reset'].includes(type)) return 'button';
    return 'textbox';
  }
  return undefined;
}

function safeElementText(element: Element, limit = 1000): string {
  const chunks: string[] = [];

  function visit(node: Node) {
    if (node.nodeType === Node.TEXT_NODE) {
      if (node.textContent) chunks.push(node.textContent);
      return;
    }
    if (!(node instanceof Element)) return;
    if (node !== element && node.matches(PRIVATE_SELECTOR)) return;
    for (const child of node.childNodes) visit(child);
  }

  visit(element);
  return normalizeText(chunks.join(' '), limit);
}

function accessibleName(element: Element): string | undefined {
  const labelled = element.getAttribute('aria-label');
  if (labelled) return normalizeText(labelled, 240);

  const labelledBy = element.getAttribute('aria-labelledby');
  if (labelledBy && element.ownerDocument) {
    const value = labelledBy
      .split(/\s+/)
      .map((id) => {
        const label = element.ownerDocument.getElementById(id);
        if (!label || label.closest(PRIVATE_SELECTOR)) return '';
        return safeElementText(label, 240);
      })
      .join(' ');
    const normalized = normalizeText(value, 240);
    if (normalized) return normalized;
  }

  const title = element.getAttribute('title');
  if (title) return normalizeText(title, 240);
  const text = safeElementText(element, 240);
  return text || undefined;
}

function safeAttributes(element: Element): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const attribute of [...element.attributes]) {
    const name = attribute.name.toLowerCase();
    const keep =
      name === 'id' ||
      name === 'class' ||
      name === 'role' ||
      name === 'type' ||
      name.startsWith('aria-') ||
      name.startsWith('data-vg-') ||
      name === 'data-testid';
    if (!keep) continue;
    attributes[name] = truncate(attribute.value, 500);
  }
  return attributes;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function serializeSafeNode(node: Node, depth: number, budget: { nodes: number }): string {
  if (budget.nodes <= 0 || depth > 4) return '';
  budget.nodes -= 1;

  if (node.nodeType === Node.TEXT_NODE) {
    const text = normalizeText(node.textContent, 800);
    return text ? escapeHtml(text) : '';
  }
  if (!(node instanceof Element)) return '';

  const tagName = node.tagName.toLowerCase();
  if (['script', 'style', 'link', 'iframe', 'object', 'embed'].includes(tagName)) return '';

  if (node.matches(PRIVATE_SELECTOR)) {
    return `<${tagName}>[masked]</${tagName}>`;
  }

  const attrs = safeAttributes(node);
  const attrText = Object.entries(attrs)
    .map(([name, value]) => ` ${name}="${escapeHtml(value)}"`)
    .join('');

  const children = [...node.childNodes]
    .map((child) => serializeSafeNode(child, depth + 1, budget))
    .join('');
  return `<${tagName}${attrText}>${children}</${tagName}>`;
}

function safeHtml(element: Element): string {
  return truncate(serializeSafeNode(element, 0, { nodes: 140 }), 12_000);
}

function safeCssValue(value: string): string {
  return truncate(value.replace(/url\((.*?)\)/gi, 'url([redacted])'), 1000);
}

function componentLineage(element: Element): string[] {
  const lineage: string[] = [];
  let current: Element | null = element;
  while (current) {
    const classes = [...current.classList].filter(
      (name) => name.startsWith('vg-') && !name.startsWith('vg-reporter-')
    );
    if (classes.length) lineage.unshift(...classes);
    current = current.parentElement;
  }
  return [...new Set(lineage)];
}

function targetLabel(element: Element, role: string | undefined, name: string | undefined): string {
  const voyageClass = [...element.classList].find(
    (value) => value.startsWith('vg-') && !value.startsWith('vg-reporter-')
  );
  const base = voyageClass ?? role ?? element.tagName.toLowerCase();
  return name ? `${base} “${truncate(name, 80)}”` : base;
}

/** 在用户点选瞬间生成脱敏、有限大小的目标证据。 */
export function captureVoyageIssueTarget(
  element: Element,
  textQuote?: VoyageTextQuote
): VoyageIssueTarget {
  const component = findVoyageComponent(element);
  const computed = getComputedStyle(element);
  const privateRoot = element.closest(PRIVATE_SELECTOR);
  const contentMasked = !!privateRoot;
  const role = implicitRole(element);
  const name = contentMasked ? undefined : accessibleName(element);
  const computedStyle: Record<string, string> = {};
  const tokens: Record<string, string> = {};

  for (const property of COMPUTED_STYLE_PROPERTIES) {
    const value = computed.getPropertyValue(property).trim();
    if (value) computedStyle[property] = safeCssValue(value);
  }
  for (const token of VOYAGE_TOKEN_NAMES) {
    const value = computed.getPropertyValue(token).trim();
    if (value) tokens[token] = safeCssValue(value);
  }

  const semanticHost =
    element.closest('[data-vg-id],[data-vg-component]') ?? component ?? element;
  const semanticId =
    semanticHost.getAttribute('data-vg-id') ??
    semanticHost.getAttribute('data-vg-component') ??
    undefined;
  const rect = rectToIssueRect(element.getBoundingClientRect());
  const scroll = {
    x: round(typeof window === 'undefined' ? 0 : window.scrollX),
    y: round(typeof window === 'undefined' ? 0 : window.scrollY),
  };

  return {
    capturedAt: new Date().toISOString(),
    tagName: element.tagName.toLowerCase(),
    label: targetLabel(element, role, name),
    selector: privateRoot
      ? privateRoot === element
        ? `:is(${PRIVATE_SELECTOR})`
        : `:is(${PRIVATE_SELECTOR}) ${element.tagName.toLowerCase()}`
      : voyageElementSelector(element),
    componentSelector:
      !contentMasked && component ? voyageElementSelector(component) : undefined,
    voyageClasses: [...element.classList].filter((value) => value.startsWith('vg-')),
    componentLineage: componentLineage(element),
    semanticId: contentMasked ? undefined : semanticId,
    role,
    accessibleName: name,
    text: contentMasked ? undefined : safeElementText(element) || undefined,
    textQuote: contentMasked ? undefined : textQuote,
    attributes: contentMasked ? {} : safeAttributes(element),
    rect,
    rectSpace: 'viewport',
    scroll,
    documentRect: offsetIssueRect(rect, scroll.x, scroll.y),
    clientRects: [...element.getClientRects()].slice(0, 24).map(rectToIssueRect),
    computedStyle,
    tokens,
    html: contentMasked ? `<${element.tagName.toLowerCase()}>[masked]</${element.tagName.toLowerCase()}>` : safeHtml(element),
    contentMasked,
  };
}

/** URL 默认移除 query，避免搜索词、token 等意外进入报告。 */
export function safeVoyagePageUrl(locationLike: Location = window.location): string {
  return `${locationLike.origin}${locationLike.pathname}${locationLike.hash}`;
}

export function collectVoyageEnvironment(): VoyageIssueReport['environment'] {
  const colorScheme =
    typeof matchMedia === 'function'
      ? matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : undefined;
  const reducedMotion =
    typeof matchMedia === 'function'
      ? matchMedia('(prefers-reduced-motion: reduce)').matches
      : undefined;

  return {
    userAgent: navigator.userAgent,
    language: navigator.language,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    viewport: { width: window.innerWidth, height: window.innerHeight },
    screen:
      typeof window.screen === 'object'
        ? { width: window.screen.width, height: window.screen.height }
        : undefined,
    devicePixelRatio: window.devicePixelRatio || 1,
    colorScheme,
    reducedMotion,
  };
}
