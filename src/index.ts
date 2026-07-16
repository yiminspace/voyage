/**
 * @yiminlab/voyage — 主题偏好助手
 *
 * 样式本体在 tokens.css / voyage.css (纯 CSS, 零运行时依赖)。
 * 这里只做三件事:
 *   1. 类型与常量 (四轴的合法取值、各应用默认组合);
 *   2. localStorage 偏好读写 + 应用到宿主元素;
 *   3. 生成免闪烁 (no-FOUC) 内联脚本, SSR 首屏前打上属性。
 */

export type VoyageTheme =
  | 'slate'   // 板岩铜 — quarry 原版基准
  | 'ink'     // 纸墨朱 — 阅读应用主场
  | 'navy'    // 深海黄铜 — 工具夜场
  | 'jade'    // 玄武玉 — 最冷静
  | 'aurora'  // 极光 (渐变 紫->青)
  | 'sunset'  // 日暮 (渐变 橙->品红)
  | 'horizon' // 苍穹 (渐变 蓝->青绿)
  | 'oolong'; // 蜜桃乌龙 (渐变 金->玫瑰)

export type VoyageMode = 'dark' | 'light';
export type VoyageStyle = 'classic' | 'glass' | 'soft' | 'sharp';
export type VoyageTone = 'normal' | 'quiet';

export interface VoyagePrefs {
  theme: VoyageTheme;
  mode: VoyageMode;
  style: VoyageStyle;
  tone: VoyageTone;
}

export const VOYAGE_THEMES: readonly VoyageTheme[] = [
  'slate', 'ink', 'navy', 'jade', 'aurora', 'sunset', 'horizon', 'oolong',
] as const;
export const VOYAGE_MODES: readonly VoyageMode[] = ['dark', 'light'] as const;
export const VOYAGE_STYLES: readonly VoyageStyle[] = ['classic', 'glass', 'soft', 'sharp'] as const;
export const VOYAGE_TONES: readonly VoyageTone[] = ['normal', 'quiet'] as const;

/** 全线缺省: 柔和 (久航) 是日常默认, normal 留给演示 / 截图 */
export const VOYAGE_DEFAULT_PREFS: VoyagePrefs = {
  theme: 'slate',
  mode: 'dark',
  style: 'classic',
  tone: 'quiet',
};

/** 各应用推荐默认 (用户仍可自行切换并持久化) */
export const VOYAGE_APP_DEFAULTS: Record<string, VoyagePrefs> = {
  engram:     { theme: 'ink',  mode: 'light', style: 'soft',    tone: 'quiet' },
  jsontailor: { theme: 'navy', mode: 'dark',  style: 'glass',   tone: 'quiet' },
  ai:         { theme: 'jade', mode: 'dark',  style: 'classic', tone: 'quiet' },
  // quarry 是本规格的原始基准: tone 用 normal (原版是实色 accent 填充,
  // 不是 quiet 的压明度+白字), 以贴合它现有视觉不变。
  quarry:     { theme: 'slate', mode: 'dark', style: 'classic', tone: 'normal' },
};

export const VOYAGE_STORAGE_KEY = 'vg_prefs';

function isValid(prefs: unknown): prefs is VoyagePrefs {
  if (typeof prefs !== 'object' || prefs === null) return false;
  const p = prefs as Record<string, unknown>;
  return (
    VOYAGE_THEMES.includes(p.theme as VoyageTheme) &&
    VOYAGE_MODES.includes(p.mode as VoyageMode) &&
    VOYAGE_STYLES.includes(p.style as VoyageStyle) &&
    VOYAGE_TONES.includes(p.tone as VoyageTone)
  );
}

/** 读取偏好; 无存储或不合法时回落到 defaults */
export function loadVoyagePrefs(defaults: VoyagePrefs = VOYAGE_DEFAULT_PREFS): VoyagePrefs {
  if (typeof window === 'undefined') return defaults;
  try {
    const raw = window.localStorage.getItem(VOYAGE_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as unknown;
    return isValid(parsed) ? parsed : defaults;
  } catch {
    return defaults;
  }
}

export function saveVoyagePrefs(prefs: VoyagePrefs): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(VOYAGE_STORAGE_KEY, JSON.stringify(prefs));
  } catch {
    /* storage 不可用时静默 */
  }
}

/** 把四轴属性盖到宿主元素 (推荐 document.documentElement) */
export function applyVoyagePrefs(el: Element, prefs: VoyagePrefs): void {
  el.classList.add('vg');
  el.setAttribute('data-theme', prefs.theme);
  el.setAttribute('data-mode', prefs.mode);
  el.setAttribute('data-style', prefs.style);
  el.setAttribute('data-tone', prefs.tone);
}

/** 客户端一步到位: 读偏好 -> 应用到 <html> -> 返回生效值 */
export function initVoyage(defaults: VoyagePrefs = VOYAGE_DEFAULT_PREFS): VoyagePrefs {
  const prefs = loadVoyagePrefs(defaults);
  if (typeof document !== 'undefined') {
    applyVoyagePrefs(document.documentElement, prefs);
  }
  return prefs;
}

/**
 * 生成免闪烁内联脚本 (放 <head> 里, 在首帧渲染前打属性)。
 * Next.js 用法:
 *   <script dangerouslySetInnerHTML={{ __html: voyageInitScript(VOYAGE_APP_DEFAULTS.engram) }} />
 */
export function voyageInitScript(defaults: VoyagePrefs = VOYAGE_DEFAULT_PREFS): string {
  const d = JSON.stringify(defaults);
  return (
    '(function(){try{' +
    `var d=${d};var p=d;` +
    `try{var r=localStorage.getItem('${VOYAGE_STORAGE_KEY}');if(r){var q=JSON.parse(r);` +
    'if(q&&q.theme&&q.mode&&q.style&&q.tone){p=q;}}}catch(e){}' +
    "var e=document.documentElement;e.classList.add('vg');" +
    "e.setAttribute('data-theme',p.theme);e.setAttribute('data-mode',p.mode);" +
    "e.setAttribute('data-style',p.style);e.setAttribute('data-tone',p.tone);" +
    '}catch(e){}})();'
  );
}
