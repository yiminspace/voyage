'use client';

import type { VoyageLocale } from '../index';

/** 文案与"切换到哪"的目标语言一一对应, 与 VoyageSwitcher 的 toLight/toDark 同一模式:
 *  aria-label 用当前 locale 的语言, 描述点击后会切到的目标语言。 */
const STRINGS: Record<VoyageLocale, { label: string; next: VoyageLocale; ariaLabel: string }> = {
  zh: { label: '中', next: 'en', ariaLabel: '切换为英文' },
  en: { label: 'EN', next: 'zh', ariaLabel: 'Switch to Chinese' },
};

export interface VoyageLangSwitcherProps {
  className?: string;
  /** 当前 locale */
  locale: VoyageLocale;
  /** 点击后触发, 参数为切换目标 locale */
  onLocaleChange: (locale: VoyageLocale) => void;
}

/**
 * 语言切换钮: "文字胶囊"风格, 复用 .vg-badge 的圆角/内边距/字重规范
 * (而不是套用 .vg-iconbtn 的圆形图标按钮尺寸) —— 裸文字 "中"/"EN" 本就不是
 * 矢量图标, 塞进图标按钮槽位会和周围图标风格冲突, 胶囊才是它的原生形态。
 *
 * 根节点直接叠加 vg-badge 类名而非另写一份相同的圆角/内边距魔数, 保证与
 * .vg-badge 的视觉规范逐字节同源 (顶栏其余胶囊改规格时这里自动跟随)。
 */
export function VoyageLangSwitcher({ className, locale, onLocaleChange }: VoyageLangSwitcherProps) {
  const tr = STRINGS[locale];
  return (
    <button
      type="button"
      className={['vg-badge', 'vg-lang-switch', className].filter(Boolean).join(' ')}
      aria-label={tr.ariaLabel}
      onClick={() => onLocaleChange(tr.next)}
    >
      {tr.label}
    </button>
  );
}
