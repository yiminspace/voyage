'use client';

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import {
  VOYAGE_MODES,
  VOYAGE_STYLES,
  VOYAGE_THEMES,
  VOYAGE_TONES,
  type VoyageMode,
  type VoyageStyle,
  type VoyageTheme,
  type VoyageTone,
} from '../index';
import { useVoyage } from './voyage-provider';

const THEME_LABELS: Record<VoyageTheme, string> = {
  slate: '板岩铜',
  ink: '纸墨朱',
  navy: '深海黄铜',
  jade: '玄武玉',
  aurora: '极光',
  sunset: '日暮',
  horizon: '苍穹',
  oolong: '蜜桃乌龙',
};

const MODE_LABELS: Record<VoyageMode, string> = { dark: '暗', light: '亮' };
const STYLE_LABELS: Record<VoyageStyle, string> = {
  classic: '经典',
  glass: '玻璃',
  soft: '圆软',
  sharp: '方锐',
};
const TONE_LABELS: Record<VoyageTone, string> = { normal: '标准', quiet: '柔和' };

/** 有原生 showPopover 才启用; jsdom / 旧浏览器静默跳过, 交互仍由 React state 驱动 */
function supportsPopover(el: Element | null): el is HTMLElement & {
  showPopover: () => void;
  hidePopover: () => void;
} {
  return !!el && typeof (el as HTMLElement).showPopover === 'function';
}

/** 描边风格, 与站内其余图标(tabler)同一视觉语言; 用 currentColor 跟随按钮色。 */
function MoonIcon() {
  return (
    <svg
      className="vg-mode-icon"
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      className="vg-mode-icon"
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4.5" />
      <path d="M12 2.5v2.2M12 19.3v2.2M4.4 4.4l1.55 1.55M18.05 18.05l1.55 1.55M2.5 12h2.2M19.3 12h2.2M4.4 19.6l1.55-1.55M18.05 5.95l1.55-1.55" />
    </svg>
  );
}

export interface VoyageSwitcherProps {
  className?: string;
}

/**
 * 顶栏切换器: 一个 vg-iconbtn 一键切明暗 + 一个展开按钮弹出完整面板
 * (主题色点阵 + 明暗/风格/对比三组分段)。
 *
 * 浮层用原生 Popover API (有支持时启用 top-layer + 系统级 light-dismiss),
 * 同时始终由 React state 驱动可见性与交互, 保证在不支持 Popover 的环境下
 * (包括测试用的 jsdom) 依然可用。
 */
export function VoyageSwitcher({ className }: VoyageSwitcherProps = {}) {
  const { prefs, setTheme, setMode, setStyle, setTone } = useVoyage();
  const [open, setOpen] = useState(false);
  const [panelPos, setPanelPos] = useState<{ top: number; right: number } | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

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

  return (
    <div className={['vg-switcher', className].filter(Boolean).join(' ')}>
      <button
        type="button"
        className="vg-iconbtn vg-switcher-mode"
        aria-label={prefs.mode === 'dark' ? '切换为亮色模式' : '切换为暗色模式'}
        onClick={toggleMode}
      >
        {prefs.mode === 'dark' ? <MoonIcon key="moon" /> : <SunIcon key="sun" />}
      </button>
      <button
        type="button"
        ref={triggerRef}
        className="vg-iconbtn vg-switcher-trigger"
        aria-label="展开主题设置"
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        ⚙
      </button>
      {open ? (
        <div
          id={panelId}
          ref={setPanelRef}
          className="vg-switcher-panel"
          role="menu"
          aria-label="主题设置"
          style={panelPos ? { top: panelPos.top, right: panelPos.right } : undefined}
        >
          <div className="vg-switcher-group" role="group" aria-label="主题色">
            {VOYAGE_THEMES.map((theme) => (
              <button
                key={theme}
                type="button"
                role="menuitemradio"
                aria-checked={prefs.theme === theme}
                aria-label={THEME_LABELS[theme]}
                title={THEME_LABELS[theme]}
                className={`vg vg-theme-dot${prefs.theme === theme ? ' on' : ''}`}
                data-theme={theme}
                data-mode={prefs.mode}
                onClick={() => setTheme(theme)}
              />
            ))}
          </div>

          <div className="vg-switcher-row" role="radiogroup" aria-label="明暗">
            {VOYAGE_MODES.map((mode) => (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={prefs.mode === mode}
                className={`vg-seg${prefs.mode === mode ? ' on' : ''}`}
                onClick={() => setMode(mode)}
              >
                {MODE_LABELS[mode]}
              </button>
            ))}
          </div>

          <div className="vg-switcher-row" role="radiogroup" aria-label="风格">
            {VOYAGE_STYLES.map((style) => (
              <button
                key={style}
                type="button"
                role="radio"
                aria-checked={prefs.style === style}
                className={`vg-seg${prefs.style === style ? ' on' : ''}`}
                onClick={() => setStyle(style)}
              >
                {STYLE_LABELS[style]}
              </button>
            ))}
          </div>

          <div className="vg-switcher-row" role="radiogroup" aria-label="对比">
            {VOYAGE_TONES.map((tone) => (
              <button
                key={tone}
                type="button"
                role="radio"
                aria-checked={prefs.tone === tone}
                className={`vg-seg${prefs.tone === tone ? ' on' : ''}`}
                onClick={() => setTone(tone)}
              >
                {TONE_LABELS[tone]}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
