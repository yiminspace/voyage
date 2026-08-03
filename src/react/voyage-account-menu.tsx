'use client';

import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from 'react';
import type { VoyageLocale } from '../index';
import { VoyageSpinner } from './primitives';

export interface VoyageAccountIdentity {
  /** 主显示名；不提供时使用本地化的“用户” */
  name?: string;
  /** 邮箱、账号名等次级说明 */
  secondary?: string;
  imageUrl?: string;
}

export interface VoyageAccountMenuLabels {
  loading: string;
  login: string;
  logout: string;
  menu: string;
  user: string;
}

const STRINGS: Record<VoyageLocale, VoyageAccountMenuLabels> = {
  zh: {
    loading: '正在加载账户',
    login: '登录',
    logout: '退出登录',
    menu: '用户菜单',
    user: '用户',
  },
  en: {
    loading: 'Loading account',
    login: 'Sign in',
    logout: 'Sign out',
    menu: 'Account menu',
    user: 'User',
  },
};

interface PopoverElement extends HTMLDivElement {
  showPopover: () => void;
  hidePopover: () => void;
}

function supportsPopover(el: Element | null): el is PopoverElement {
  return !!el && typeof (el as PopoverElement).showPopover === 'function';
}

function fallbackText(name: string): string {
  return Array.from(name.trim())[0]?.toLocaleUpperCase() || '?';
}

export interface VoyageAccountMenuProps {
  className?: string;
  locale?: VoyageLocale;
  labels?: Partial<VoyageAccountMenuLabels>;
  isAuthenticated: boolean;
  isLoading?: boolean;
  identity?: VoyageAccountIdentity | null;
  onLogin?: () => void;
  onLogout?: () => void;
  loginIcon?: ReactNode;
  logoutIcon?: ReactNode;
  /** 菜单边缘相对触发按钮的对齐方式；默认 end */
  align?: 'start' | 'end';
}

/**
 * 受控账户菜单：只认识展示信息与登录/登出回调，不依赖任何认证 SDK。
 * 浮层优先使用原生 Popover API，并保留无 Popover 环境的 React fallback。
 */
export function VoyageAccountMenu({
  className,
  locale = 'zh',
  labels,
  isAuthenticated,
  isLoading = false,
  identity,
  onLogin,
  onLogout,
  loginIcon,
  logoutIcon,
  align = 'end',
}: VoyageAccountMenuProps) {
  const tr = { ...STRINGS[locale], ...labels };
  const displayName = identity?.name?.trim() || tr.user;
  const [open, setOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [panelPosition, setPanelPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const panelId = useId();

  useEffect(() => setImageFailed(false), [identity?.imageUrl]);
  useEffect(() => {
    if (!isAuthenticated || isLoading) setOpen(false);
  }, [isAuthenticated, isLoading]);

  const setPanelRef = useCallback((element: HTMLDivElement | null) => {
    panelRef.current = element;
    element?.setAttribute('popover', 'auto');
  }, []);

  const updatePanelPosition = useCallback(() => {
    const trigger = triggerRef.current;
    const panel = panelRef.current;
    if (!trigger || !panel || typeof window === 'undefined') return;
    const triggerRect = trigger.getBoundingClientRect();
    const panelWidth = panel.offsetWidth || 232;
    const desiredLeft = align === 'end'
      ? triggerRect.right - panelWidth
      : triggerRect.left;
    const left = Math.min(
      Math.max(8, desiredLeft),
      Math.max(8, window.innerWidth - panelWidth - 8)
    );
    setPanelPosition({ top: triggerRect.bottom + 8, left });
  }, [align]);

  const close = useCallback((restoreFocus = false) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    if (!panel) return;

    const onToggle = (event: Event) => {
      if ((event as Event & { newState?: string }).newState === 'closed') setOpen(false);
    };
    panel.addEventListener('toggle', onToggle);
    if (supportsPopover(panel)) {
      try {
        panel.showPopover();
      } catch {
        /* 已打开时原生 API 会抛错，React state 仍是事实源 */
      }
    }
    updatePanelPosition();
    panel.querySelector<HTMLElement>('[role="menuitem"]')?.focus();

    return () => {
      panel.removeEventListener('toggle', onToggle);
      if (supportsPopover(panel)) {
        try {
          panel.hidePopover();
        } catch {
          /* 已关闭或已离开文档 */
        }
      }
    };
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      close(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close(true);
    };
    const onReposition = () => updatePanelPosition();
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
  }, [close, open, updatePanelPosition]);

  const onMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])')
    );
    if (items.length === 0) return;
    event.preventDefault();
    const current = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === 'Home') return items[0].focus();
    if (event.key === 'End') return items[items.length - 1].focus();
    const delta = event.key === 'ArrowDown' ? 1 : -1;
    items[(current + delta + items.length) % items.length].focus();
  };

  if (isLoading) {
    return (
      <div className={['vg-account-menu', className].filter(Boolean).join(' ')}>
        <button type="button" className="vg-account-trigger" disabled aria-label={tr.loading} aria-busy="true">
          <VoyageSpinner size="sm" decorative />
        </button>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={['vg-account-menu', className].filter(Boolean).join(' ')}>
        <button type="button" className="vg-btn vg-account-login" onClick={onLogin}>
          {loginIcon == null ? null : <span className="vg-account-action-icon" aria-hidden="true">{loginIcon}</span>}
          {tr.login}
        </button>
      </div>
    );
  }

  return (
    <div className={['vg-account-menu', className].filter(Boolean).join(' ')}>
      <button
        type="button"
        ref={triggerRef}
        className="vg-account-trigger"
        aria-label={tr.menu}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="vg-account-avatar" aria-hidden="true">
          <span className="vg-account-avatar-fallback">{fallbackText(displayName)}</span>
          {identity?.imageUrl && !imageFailed ? (
            <img
              src={identity.imageUrl}
              alt=""
              onError={() => setImageFailed(true)}
            />
          ) : null}
        </span>
      </button>
      {open ? (
        <div
          id={panelId}
          ref={setPanelRef}
          className="vg-account-panel"
          role="menu"
          aria-label={tr.menu}
          style={panelPosition ?? undefined}
          onKeyDown={onMenuKeyDown}
        >
          <div className="vg-account-summary" role="presentation">
            <span className="vg-account-avatar vg-account-avatar-lg" aria-hidden="true">
              <span className="vg-account-avatar-fallback">{fallbackText(displayName)}</span>
              {identity?.imageUrl && !imageFailed ? (
                <img
                  src={identity.imageUrl}
                  alt=""
                  onError={() => setImageFailed(true)}
                />
              ) : null}
            </span>
            <span className="vg-account-copy">
              <strong>{displayName}</strong>
              {identity?.secondary ? <small>{identity.secondary}</small> : null}
            </span>
          </div>
          {onLogout ? (
            <>
              <span className="vg-account-separator" role="separator" />
              <button
                type="button"
                className="vg-account-item"
                role="menuitem"
                onClick={() => {
                  close(false);
                  onLogout();
                }}
              >
                {logoutIcon == null ? null : <span className="vg-account-action-icon" aria-hidden="true">{logoutIcon}</span>}
                {tr.logout}
              </button>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
