'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  VOYAGE_DEFAULT_PREFS,
  applyVoyagePrefs,
  initVoyage,
  saveVoyagePrefs,
  type VoyageMode,
  type VoyagePrefs,
  type VoyageStyle,
  type VoyageTheme,
  type VoyageTone,
} from '../index';

export interface VoyageContextValue {
  prefs: VoyagePrefs;
  setTheme: (theme: VoyageTheme) => void;
  setMode: (mode: VoyageMode) => void;
  setStyle: (style: VoyageStyle) => void;
  setTone: (tone: VoyageTone) => void;
  /** 批量落定多个轴 (选中一个策展 preset 时 theme/style/tone 一起变) */
  setPrefs: (patch: Partial<VoyagePrefs>) => void;
  reset: () => void;
}

const VoyageContext = createContext<VoyageContextValue | null>(null);

function syncDarkClass(mode: VoyageMode): void {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', mode === 'dark');
}

export interface VoyageProviderProps {
  /** 应用推荐默认组合, 见 VOYAGE_APP_DEFAULTS */
  defaults?: VoyagePrefs;
  /**
   * 需要同时维护 tailwind `.dark` class 的应用传 true
   * (voyage 本体只消费 data-mode, 不依赖 `.dark`)
   */
  syncDarkClass?: boolean;
  children: ReactNode;
}

/**
 * 挂载时执行 initVoyage (读 localStorage -> 应用到 <html> -> 拿到生效值),
 * 并把偏好与四个 setter 通过 context 分发给子树的 useVoyage()。
 *
 * SSR 场景仍需配合 voyageInitScript 在 <head> 内提前打属性防闪烁;
 * 本组件只负责挂载后的偏好状态与交互, 不做首屏注入。
 */
export function VoyageProvider({
  defaults = VOYAGE_DEFAULT_PREFS,
  syncDarkClass: shouldSyncDarkClass = false,
  children,
}: VoyageProviderProps) {
  const [prefs, setPrefs] = useState<VoyagePrefs>(defaults);

  useEffect(() => {
    const applied = initVoyage(defaults);
    setPrefs(applied);
    if (shouldSyncDarkClass) syncDarkClass(applied.mode);
    // 只在挂载时执行一次; defaults 变化不重新初始化, 避免打断用户已切换的偏好
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = useCallback(
    (patch: Partial<VoyagePrefs>) => {
      setPrefs((prev) => {
        const next = { ...prev, ...patch };
        saveVoyagePrefs(next);
        if (typeof document !== 'undefined') {
          applyVoyagePrefs(document.documentElement, next);
        }
        if (shouldSyncDarkClass) syncDarkClass(next.mode);
        return next;
      });
    },
    [shouldSyncDarkClass]
  );

  const setTheme = useCallback((theme: VoyageTheme) => update({ theme }), [update]);
  const setMode = useCallback((mode: VoyageMode) => update({ mode }), [update]);
  const setStyle = useCallback((style: VoyageStyle) => update({ style }), [update]);
  const setTone = useCallback((tone: VoyageTone) => update({ tone }), [update]);
  const reset = useCallback(() => update(defaults), [update, defaults]);

  const value = useMemo<VoyageContextValue>(
    () => ({ prefs, setTheme, setMode, setStyle, setTone, setPrefs: update, reset }),
    [prefs, setTheme, setMode, setStyle, setTone, update, reset]
  );

  return <VoyageContext.Provider value={value}>{children}</VoyageContext.Provider>;
}

/** 读写四轴偏好; 必须在 <VoyageProvider> 子树内使用 */
export function useVoyage(): VoyageContextValue {
  const ctx = useContext(VoyageContext);
  if (!ctx) {
    throw new Error('useVoyage() 必须在 <VoyageProvider> 内使用');
  }
  return ctx;
}
