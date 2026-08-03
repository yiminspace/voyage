import type { HTMLAttributes, ReactNode } from 'react';
import { VoyageSpinner } from './voyage-spinner';

export type VoyageStateViewVariant = 'loading' | 'info' | 'error';
export type VoyageStateViewSize = 'section' | 'page';

export interface VoyageStateViewProps extends Omit<HTMLAttributes<HTMLDivElement>, 'children'> {
  /** 状态语义；控制默认图标、ARIA 和语义色 */
  variant?: VoyageStateViewVariant;
  /** section 用于局部守卫，page 用于整页 callback */
  size?: VoyageStateViewSize;
  heading?: ReactNode;
  description?: ReactNode;
  /** undefined 使用内置图标；null 明确隐藏图标 */
  icon?: ReactNode;
  action?: ReactNode;
  /** loading 且没有可见文案时的可访问名称 */
  loadingLabel?: string;
}

function StateIcon({ variant }: { variant: Exclude<VoyageStateViewVariant, 'loading'> }) {
  if (variant === 'error') {
    return (
      <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M12 9v4" />
        <path d="M12 17h.01" />
        <path d="M10.3 3.7 2.4 17.5A2 2 0 0 0 4.1 20h15.8a2 2 0 0 0 1.7-2.5L13.7 3.7a2 2 0 0 0-3.4 0Z" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <path d="M12 8h.01" />
    </svg>
  );
}

/** 认证守卫、回调、空态等场景共用的居中状态视图。 */
export function VoyageStateView({
  variant = 'info',
  size = 'section',
  heading,
  description,
  icon,
  action,
  loadingLabel = '加载中',
  className,
  ...props
}: VoyageStateViewProps) {
  const defaultRole = variant === 'error' ? 'alert' : 'status';
  const defaultIcon = variant === 'loading'
    ? <VoyageSpinner size="lg" decorative />
    : <StateIcon variant={variant} />;
  const hasVisibleCopy = heading != null || description != null;

  return (
    <div
      {...props}
      className={[
        'vg-state-view',
        `vg-state-view-${variant}`,
        `vg-state-view-${size}`,
        className,
      ].filter(Boolean).join(' ')}
      role={props.role ?? defaultRole}
      aria-live={props['aria-live'] ?? (variant === 'error' ? 'assertive' : 'polite')}
      aria-busy={props['aria-busy'] ?? (variant === 'loading' ? true : undefined)}
      aria-label={props['aria-label'] ?? (variant === 'loading' && !hasVisibleCopy ? loadingLabel : undefined)}
    >
      <div className="vg-state-view-content">
        {icon === null ? null : (
          <div className="vg-state-view-icon" aria-hidden="true">
            {icon === undefined ? defaultIcon : icon}
          </div>
        )}
        {heading == null ? null : <h2 className="vg-state-view-heading">{heading}</h2>}
        {description == null ? null : <div className="vg-state-view-description">{description}</div>}
        {action == null ? null : <div className="vg-state-view-action">{action}</div>}
      </div>
    </div>
  );
}
