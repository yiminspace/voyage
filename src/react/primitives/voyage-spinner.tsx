import type { HTMLAttributes } from 'react';

export type VoyageSpinnerSize = 'sm' | 'md' | 'lg';

export interface VoyageSpinnerProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** 视觉尺寸；默认 md */
  size?: VoyageSpinnerSize;
  /** 辅助技术读出的加载文案；默认“加载中” */
  label?: string;
  /** 嵌在已有 status 容器中时设为 true，避免重复播报 */
  decorative?: boolean;
}

/** token 驱动的加载指示；独立使用时自带可访问状态文案。 */
export function VoyageSpinner({
  size = 'md',
  label = '加载中',
  decorative = false,
  className,
  ...props
}: VoyageSpinnerProps) {
  return (
    <span
      {...props}
      className={['vg-spinner', `vg-spinner-${size}`, className].filter(Boolean).join(' ')}
      role={decorative ? undefined : props.role ?? 'status'}
      aria-label={decorative ? undefined : props['aria-label'] ?? label}
      aria-hidden={decorative ? true : props['aria-hidden']}
    />
  );
}
