'use client';

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  VOYAGE_MODES,
  VOYAGE_PRESETS,
  applyVoyagePrefs,
  matchVoyagePreset,
  voyagePresetPrefs,
  type VoyageLocale,
  type VoyageMode,
  type VoyagePreset,
} from '../index';
import { useVoyage } from './voyage-provider';

/** 切换器自身的全部 UI 文案 (预设名/描述在 VOYAGE_PRESETS 里双语) */
const STRINGS: Record<
  VoyageLocale,
  { modes: Record<VoyageMode, string>; toLight: string; toDark: string; open: string; panel: string; themes: string; modeGroup: string }
> = {
  zh: {
    modes: { dark: '暗', light: '亮' },
    toLight: '切换为亮色模式',
    toDark: '切换为暗色模式',
    open: '展开主题设置',
    panel: '主题设置',
    themes: '主题',
    modeGroup: '明暗',
  },
  en: {
    modes: { dark: 'Dark', light: 'Light' },
    toLight: 'Switch to light mode',
    toDark: 'Switch to dark mode',
    open: 'Theme settings',
    panel: 'Theme settings',
    themes: 'Themes',
    modeGroup: 'Mode',
  },
};

/** 有原生 showPopover 才启用; jsdom / 旧浏览器静默跳过, 交互仍由 React state 驱动 */
function supportsPopover(el: Element | null): el is HTMLElement & {
  showPopover: () => void;
  hidePopover: () => void;
} {
  return !!el && typeof (el as HTMLElement).showPopover === 'function';
}

/**
 * 内置图标: 取 Tabler Icons (MIT) 的原始 path, 24 网格 / stroke 2 / round cap,
 * 尺寸走 1em 跟随 .vg-iconbtn 的 font-size —— 与图标字体宿主 (如 quarry 的
 * tabler webfont) 光学一致; 宿主也可通过 icons 插槽直接传自家图标。
 */
function TablerIcon({ children }: { children: ReactNode }) {
  return (
    <svg
      className="vg-mode-icon"
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
      {children}
    </svg>
  );
}

const DEFAULT_MOON = (
  <TablerIcon>
    <path d="M12 3c.132 0 .263 0 .393 0a7.5 7.5 0 0 0 7.92 12.446a9 9 0 1 1 -8.313 -12.454z" />
  </TablerIcon>
);

const DEFAULT_SUN = (
  <TablerIcon>
    <path d="M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" />
    <path d="M3 12h1m8 -9v1m8 8h1m-9 8v1m-6.4 -15.4l.7 .7m12.1 -.7l-.7 .7m0 12.1l.7 .7m-12.1 -.7l-.7 .7" />
  </TablerIcon>
);

const DEFAULT_TRIGGER = (
  <TablerIcon>
    <path d="M12 21a9 9 0 0 1 0 -18c4.97 0 9 3.582 9 8c0 1.06 -.474 2.078 -1.318 2.828c-.844 .75 -1.989 1.172 -3.182 1.172h-2.5a2 2 0 0 0 -1 3.75a1.3 1.3 0 0 1 -1 2.25" />
    <path d="M8.5 10.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
    <path d="M12.5 7.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
    <path d="M16.5 10.5m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
  </TablerIcon>
);

export interface VoyageSwitcherIcons {
  /** 暗色模式下顶栏按钮显示的图标 (默认内置 Tabler 月亮) */
  moon?: ReactNode;
  /** 亮色模式下顶栏按钮显示的图标 (默认内置 Tabler 太阳) */
  sun?: ReactNode;
  /** 展开主题面板的触发图标 (默认内置 Tabler 调色板) */
  trigger?: ReactNode;
}

export interface VoyageSwitcherProps {
  className?: string;
  /** 宿主用自家图标体系时传入 (如 quarry 传 tabler webfont 的 <i>), 与顶栏其余图标保持同一视觉语言 */
  icons?: VoyageSwitcherIcons;
  /** UI 文案语言, 跟随宿主的语言状态传入; 缺省中文 */
  locale?: VoyageLocale;
}

/**
 * 顶栏切换器: 一个 vg-iconbtn 一键切明暗 + 一个调色板按钮弹出主题面板。
 *
 * 面板 = 明暗分段 + 8 张策展主题卡 (VOYAGE_PRESETS): 每张卡用自己的
 * data-theme/style/tone 作用域渲染 mini 预览; hover / 聚焦某张卡时把该主题
 * 临时应用到整页做即时预览 (不写 localStorage), 移出 / Esc / 关面板还原,
 * 点击才落定 —— VS Code 主题选择器的交互模型。
 *
 * 浮层用原生 Popover API (有支持时启用 top-layer + 系统级 light-dismiss),
 * 同时始终由 React state 驱动可见性与交互, 保证在不支持 Popover 的环境下
 * (包括测试用的 jsdom) 依然可用。
 */
export function VoyageSwitcher({ className, icons, locale = 'zh' }: VoyageSwitcherProps = {}) {
  const { prefs, setPrefs, setMode } = useVoyage();
  const tr = STRINGS[locale];
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState<{ top: number; right: number } | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  // 即时预览绕过 provider 直写 DOM; 还原时要拿"已落定"的偏好, 用 ref 避免
  // 事件闭包里的 prefs 过期 (落定后 provider 更新 state, 这里跟着刷新)。
  const committedRef = useRef(prefs);
  committedRef.current = prefs;

  const previewPreset = useCallback((preset: VoyagePreset) => {
    if (typeof document === 'undefined') return;
    applyVoyagePrefs(
      document.documentElement,
      voyagePresetPrefs(preset, committedRef.current.mode)
    );
  }, []);

  const revertPreview = useCallback(() => {
    if (typeof document === 'undefined') return;
    applyVoyagePrefs(document.documentElement, committedRef.current);
  }, []);

  // 面板关闭 (Esc / 点外部 / 再点触发钮 / 卸载) 时兜底还原预览;
  // 已点击落定的场合 committedRef 就是新偏好, 这里等价于 no-op。
  useEffect(() => {
    if (!open) return;
    return () => revertPreview();
  }, [open, revertPreview]);

  // popover 是较新的 DOM 属性, @types/react 18 尚未收录, 用 ref 回调 setAttribute
  // (而非 JSX 属性) 挂上去; 不支持的环境 (含测试用的 jsdom) 属性本身是惰性的。
  const setPanelRef = useCallback((el: HTMLDivElement | null) => {
    panelRef.current = el;
    el?.setAttribute('popover', 'auto');
  }, []);

  // 同步 React state -> 原生 popover 显隐 (仅在支持时生效)
  useEffect(() => {
    const el = panelRef.current;
    if (!supportsPopover(el)) return;
    try {
      if (open) {
        el.showPopover();
      } else {
        el.hidePopover();
      }
    } catch {
      /* 状态已一致 (例如已经是 open) 时原生 API 会抛错, 忽略即可 */
    }
  }, [open]);

  // 面板的展示位置按触发按钮的 viewport 坐标现算, 不依赖 .vg-switcher 作为
  // position:absolute 的包含块: 挂了 popover="auto" 的面板在支持原生 Popover
  // API 的浏览器里打开后会被提升到 top layer, 脱离 DOM 祖先的定位关系, 只能
  // 认 viewport 坐标, 所以统一用 position:fixed + JS 算好的 top/right。
  const updatePanelPosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    setPanelPos({ top: rect.bottom + 8, right: Math.max(0, window.innerWidth - rect.right) });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePanelPosition();
  }, [open, updatePanelPosition]);

  // 点击面板外部 / Esc 关闭 (不依赖原生 light-dismiss, 全环境一致);
  // 展开期间窗口滚动/缩放要跟着重算面板位置, 否则会跟触发按钮脱节。
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    function onReposition() {
      updatePanelPosition();
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
    };
  }, [open, updatePanelPosition]);

  const toggleMode = () => setMode(prefs.mode === 'dark' ? 'light' : 'dark');
  const activePreset = matchVoyagePreset(prefs);

  const commitPreset = (preset: VoyagePreset) => {
    setPrefs({ theme: preset.theme, style: preset.style, tone: preset.tone });
  };

  return (
    <div className={['vg-switcher', className].filter(Boolean).join(' ')}>
      <button
        type="button"
        className="vg-iconbtn vg-switcher-mode"
        aria-label={prefs.mode === 'dark' ? tr.toLight : tr.toDark}
        onClick={toggleMode}
      >
        {prefs.mode === 'dark' ? (
          <span className="vg-mode-wrap" key="moon">
            {icons?.moon ?? DEFAULT_MOON}
          </span>
        ) : (
          <span className="vg-mode-wrap" key="sun">
            {icons?.sun ?? DEFAULT_SUN}
          </span>
        )}
      </button>
      <button
        type="button"
        ref={triggerRef}
        className="vg-iconbtn vg-switcher-trigger"
        aria-label={tr.open}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        {icons?.trigger ?? DEFAULT_TRIGGER}
      </button>
      {open ? (
        <div
          id={panelId}
          ref={setPanelRef}
          className="vg-switcher-panel"
          role="menu"
          aria-label={tr.panel}
          style={panelPos ? { top: panelPos.top, right: panelPos.right } : undefined}
        >
          <div
            className="vg-preset-grid"
            role="group"
            aria-label={tr.themes}
            onPointerLeave={revertPreview}
          >
            {VOYAGE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                role="menuitemradio"
                aria-checked={activePreset.id === preset.id}
                aria-label={preset.label[locale]}
                title={`${preset.label[locale]} · ${preset.hint[locale]}`}
                className={`vg-preset-card${activePreset.id === preset.id ? ' on' : ''}`}
                onPointerEnter={() => previewPreset(preset)}
                onFocus={() => previewPreset(preset)}
                onClick={() => commitPreset(preset)}
              >
                {/* token 作用域只套缩略图: 卡片外框/名字用宿主面板的 tokens,
                    避免异色主题的前景色让文字在面板底色上不可读 */}
                <span
                  className="vg vg-preset-thumb"
                  data-theme={preset.theme}
                  data-mode={prefs.mode}
                  data-style={preset.style}
                  data-tone={preset.tone}
                  aria-hidden="true"
                >
                  <span className="vg-preset-thumb-bar">
                    <i className="vg-preset-thumb-dot" />
                    <i className="vg-preset-thumb-hairline" />
                  </span>
                  <span className="vg-preset-thumb-line" />
                  <span className="vg-preset-thumb-line short" />
                  <span className="vg-preset-thumb-fill" />
                </span>
                <span className="vg-preset-name">{preset.label[locale]}</span>
              </button>
            ))}
          </div>

          <div className="vg-switcher-row" role="radiogroup" aria-label={tr.modeGroup}>
            {VOYAGE_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={prefs.mode === mode}
                className={`vg-seg${prefs.mode === mode ? ' on' : ''}`}
                onClick={() => setMode(mode)}
              >
                {tr.modes[mode]}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
