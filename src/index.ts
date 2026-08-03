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
  | 'slate'      // 板岩铜 — quarry 原版基准 (自研)
  | 'ink'        // 纸墨朱 — 阅读应用主场 (自研)
  | 'github'     // 石墨 — GitHub Primer
  | 'nord'       // 北极 — Nord
  | 'tokyo'      // 东京夜 — Tokyo Night
  | 'catppuccin' // 摩卡 — Catppuccin Mocha/Latte
  | 'onedark'    // 原子 — One Dark / One Light (Atom)
  | 'solarized'  // 日晒 — Solarized
  | 'rosepine'   // 玫瑰松 — Rosé Pine main/dawn
  | 'everforest'; // 常青林 — Everforest

export type VoyageMode = 'dark' | 'light';
export type VoyageStyle = 'classic' | 'glass' | 'soft' | 'sharp';
export type VoyageTone = 'normal' | 'quiet';

/** 与 package.json 同步；报告证据用它定位实际生效的 Voyage 版本。 */
export const VOYAGE_VERSION = '0.12.3';

export interface VoyagePrefs {
  theme: VoyageTheme;
  mode: VoyageMode;
  style: VoyageStyle;
  tone: VoyageTone;
}

export const VOYAGE_THEMES: readonly VoyageTheme[] = [
  'slate', 'ink', 'github', 'nord', 'tokyo',
  'catppuccin', 'onedark', 'solarized', 'rosepine', 'everforest',
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
  engram:     { theme: 'ink',        mode: 'light', style: 'soft',    tone: 'quiet' },
  jsontailor: { theme: 'tokyo',      mode: 'dark',  style: 'glass',   tone: 'quiet' },
  ai:         { theme: 'everforest', mode: 'dark',  style: 'classic', tone: 'quiet' },
  // quarry 是本规格的原始基准: tone 用 normal (原版是实色 accent 填充,
  // 不是 quiet 的压明度+白字), 以贴合它现有视觉不变。
  quarry:     { theme: 'slate', mode: 'dark', style: 'classic', tone: 'normal' },
};

/** 切换器 UI 文案语言 (token 引擎与存储无关语言) */
export type VoyageLocale = 'zh' | 'en';

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
  label: Record<VoyageLocale, string>;
  /** 一句话气质描述, 主题卡 tooltip 用 */
  hint: Record<VoyageLocale, string>;
  theme: VoyageTheme;
  style: VoyageStyle;
  tone: VoyageTone;
}

export const VOYAGE_PRESETS: readonly VoyagePreset[] = [
  // slate 是 quarry 原版基准: classic + normal (实色 accent 填充), 见 README;
  // 其余经典配色的出处见 tokens.css 主题矩阵注释
  { id: 'slate',      label: { zh: '板岩铜', en: 'Slate & Copper' }, hint: { zh: 'Quarry 原版基准',      en: 'Quarry original' },      theme: 'slate',      style: 'classic', tone: 'normal' },
  { id: 'ink',        label: { zh: '纸墨朱', en: 'Ink & Cinnabar' }, hint: { zh: '纸感阅读',             en: 'Paper-and-ink reading' }, theme: 'ink',        style: 'soft',    tone: 'quiet' },
  { id: 'github',     label: { zh: '石墨',   en: 'GitHub' },         hint: { zh: 'GitHub Primer 工具蓝', en: 'Primer workhorse blue' }, theme: 'github',     style: 'classic', tone: 'quiet' },
  { id: 'nord',       label: { zh: '北极',   en: 'Nord' },           hint: { zh: 'Nord 冷蓝灰',          en: 'Cool arctic blue-gray' }, theme: 'nord',       style: 'classic', tone: 'quiet' },
  { id: 'tokyo',      label: { zh: '东京夜', en: 'Tokyo Night' },    hint: { zh: 'Tokyo Night 靛蓝夜航', en: 'Indigo city night' },     theme: 'tokyo',      style: 'glass',   tone: 'quiet' },
  { id: 'catppuccin', label: { zh: '摩卡',   en: 'Catppuccin' },     hint: { zh: 'Catppuccin 柔和粉彩',  en: 'Soothing pastel mocha' }, theme: 'catppuccin', style: 'soft',    tone: 'quiet' },
  { id: 'onedark',    label: { zh: '原子',   en: 'One Dark' },       hint: { zh: 'One Dark 中性耐看',    en: 'Atom classic' },          theme: 'onedark',    style: 'classic', tone: 'quiet' },
  { id: 'solarized',  label: { zh: '日晒',   en: 'Solarized' },      hint: { zh: 'Solarized 学院经典',   en: 'The academic classic' },  theme: 'solarized',  style: 'classic', tone: 'quiet' },
  { id: 'rosepine',   label: { zh: '玫瑰松', en: 'Rosé Pine' },      hint: { zh: 'Rosé Pine 哑光玫瑰',   en: 'Muted rosé elegance' },   theme: 'rosepine',   style: 'soft',    tone: 'quiet' },
  { id: 'everforest', label: { zh: '常青林', en: 'Everforest' },     hint: { zh: 'Everforest 护眼绿',    en: 'Comfy forest green' },    theme: 'everforest', style: 'soft',    tone: 'quiet' },
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

export * from './report';
