'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  VOYAGE_DEFAULT_PREFS,
  VOYAGE_STORAGE_KEY,
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
  /** 四轴属性实际作用的元素；SSR 时且未显式传 target 时为 null。 */
  target?: Element | null;
  setTheme: (theme: VoyageTheme) => void;
  setMode: (mode: VoyageMode) => void;
  setStyle: (style: VoyageStyle) => void;
  setTone: (tone: VoyageTone) => void;
  /** 批量落定多个轴 (选中一个策展 preset 时 theme/style/tone 一起变) */
  setPrefs: (patch: Partial<VoyagePrefs>) => void;
  reset: () => void;
}

const VoyageContext = createContext<VoyageContextValue | null>(null);

function defaultTarget(): Element | null {
  return typeof document === 'undefined' ? null : document.documentElement;
}

function syncDarkClass(target: Element | null, mode: VoyageMode): void {
  target?.classList.toggle('dark', mode === 'dark');
}

export interface VoyageProviderProps {
  /** 应用推荐默认组合, 见 VOYAGE_APP_DEFAULTS */
  defaults?: VoyagePrefs;
  /**
   * 四轴属性的作用元素；缺省仍为 document.documentElement。
   * 嵌入宿主页时可传应用自己的根节点，避免改写宿主的 <html>。
   */
  target?: Element | null;
  /** 偏好持久化 key；缺省仍为全局 VOYAGE_STORAGE_KEY。 */
  storageKey?: string;
  /**
   * 需要同时维护 tailwind `.dark` class 的应用传 true
   * (voyage 本体只消费 data-mode, 不依赖 `.dark`)
   */
  syncDarkClass?: boolean;
  children: ReactNode;
}

/**
 * 挂载时读取 localStorage，将偏好应用到 target（缺省 <html>），
 * 并把偏好与四个 setter 通过 context 分发给子树的 useVoyage()。
 * defaults / target / storageKey / syncDarkClass 都是 mount-time 配置；Provider
 * 存活期间即使宿主 rerender 传入新值也不会半途换作用域，需 remount 才生效。
 *
 * SSR 场景仍需配合 voyageInitScript 在 <head> 内提前打属性防闪烁;
 * 本组件只负责挂载后的偏好状态与交互, 不做首屏注入。
 */
export function VoyageProvider({
  defaults = VOYAGE_DEFAULT_PREFS,
  target,
  storageKey = VOYAGE_STORAGE_KEY,
  syncDarkClass: shouldSyncDarkClass = false,
  children,
}: VoyageProviderProps) {
  const configRef = useRef<{
    defaults: VoyagePrefs;
    target: Element | null;
    storageKey: string;
    syncDarkClass: boolean;
  } | null>(null);
  if (!configRef.current) {
    configRef.current = {
      defaults,
      target: target === undefined ? defaultTarget() : target,
      storageKey,
      syncDarkClass: shouldSyncDarkClass,
    };
  }
  const config = configRef.current;
  const [prefs, setPrefs] = useState<VoyagePrefs>(config.defaults);

  useEffect(() => {
    const applied = initVoyage(config.defaults, {
      target: config.target,
      storageKey: config.storageKey,
    });
    setPrefs(applied);
    if (config.syncDarkClass) syncDarkClass(config.target, applied.mode);
  }, [config]);

  const update = useCallback(
    (patch: Partial<VoyagePrefs>) => {
      setPrefs((prev) => {
        const next = { ...prev, ...patch };
        saveVoyagePrefs(next, config.storageKey);
        if (config.target) applyVoyagePrefs(config.target, next);
        if (config.syncDarkClass) syncDarkClass(config.target, next.mode);
        return next;
      });
    },
    [config]
  );

  const setTheme = useCallback((theme: VoyageTheme) => update({ theme }), [update]);
  const setMode = useCallback((mode: VoyageMode) => update({ mode }), [update]);
  const setStyle = useCallback((style: VoyageStyle) => update({ style }), [update]);
  const setTone = useCallback((tone: VoyageTone) => update({ tone }), [update]);
  const reset = useCallback(() => update(config.defaults), [config, update]);

  const value = useMemo<VoyageContextValue>(
    () => ({
      prefs,
      target: config.target,
      setTheme,
      setMode,
      setStyle,
      setTone,
      setPrefs: update,
      reset,
    }),
    [prefs, config, setTheme, setMode, setStyle, setTone, update, reset]
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
