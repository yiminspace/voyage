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

/**
 * 策展主题 (preset): 四轴空间上一个被设计过的点。
 *
 * UI 层 (VoyageSwitcher) 只暴露 preset, 不再暴露 style/tone 原始轴 ——
 * 用户面对的是「一列设计师保证好看的完整主题」, 而不是可自由组合的引擎参数
 * (VS Code / JetBrains 的主题列表模式)。四轴 token 引擎本身不动, 每个 preset
 * 就是一组固定的 theme x style x tone; mode 不入 preset, 每套主题都同时支持
 * 暗/亮, 明暗是用户的全局偏好 (顶栏一键切换)。
 */
export interface VoyagePreset {
  /** 与 theme 同名: 每个色系恰好一个策展组合 */
  id: VoyageTheme;
  label: string;
  /** 一句话气质描述, 主题卡 tooltip 用 */
  hint: string;
  theme: VoyageTheme;
  style: VoyageStyle;
  tone: VoyageTone;
}

export const VOYAGE_PRESETS: readonly VoyagePreset[] = [
  // slate 是 quarry 原版基准: classic + normal (实色 accent 填充), 见 README
  { id: 'slate',   label: '板岩铜',   hint: 'Quarry 原版基准',   theme: 'slate',   style: 'classic', tone: 'normal' },
  { id: 'ink',     label: '纸墨朱',   hint: '纸感阅读',          theme: 'ink',     style: 'soft',    tone: 'quiet' },
  { id: 'navy',    label: '深海黄铜', hint: '玻璃质感夜航',      theme: 'navy',    style: 'glass',   tone: 'quiet' },
  { id: 'jade',    label: '玄武玉',   hint: '冷静克制',          theme: 'jade',    style: 'classic', tone: 'quiet' },
  { id: 'aurora',  label: '极光',     hint: '紫青渐变',          theme: 'aurora',  style: 'glass',   tone: 'quiet' },
  { id: 'sunset',  label: '日暮',     hint: '橙品红渐变',        theme: 'sunset',  style: 'soft',    tone: 'quiet' },
  { id: 'horizon', label: '苍穹',     hint: '蓝青绿渐变',        theme: 'horizon', style: 'classic', tone: 'quiet' },
  { id: 'oolong',  label: '蜜桃乌龙', hint: '暖金玫瑰渐变',      theme: 'oolong',  style: 'soft',    tone: 'quiet' },
] as const;

/** preset + 当前明暗 -> 完整四轴偏好 */
export function voyagePresetPrefs(preset: VoyagePreset, mode: VoyageMode): VoyagePrefs {
  return { theme: preset.theme, mode, style: preset.style, tone: preset.tone };
}

/**
 * 当前偏好归属哪个 preset (按 theme 归属; 旧版四轴 UI 留下的 style/tone
 * 偏离组合也归到同色系卡片, 点击该卡即归位到策展组合)。
 */
export function matchVoyagePreset(prefs: VoyagePrefs): VoyagePreset {
  return VOYAGE_PRESETS.find((p) => p.theme === prefs.theme) ?? VOYAGE_PRESETS[0];
}

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
