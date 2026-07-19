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
 * 语言切换钮: 与 VoyageSwitcher 的明暗钮/调色板钮共用 .vg-iconbtn 这一个盒子
 * (同高、同最小宽、同圆角、同悬停底), 只在内容排版上区分 —— 三颗钮在顶栏里
 * 是一组同类控件, 盒子必须逐像素同规格, 否则悬停色块参差、间距节奏也被文字
 * 胶囊多出来的横向内边距顶开。
 *
 * 之前它走的是 .vg-badge 徽章规范 (12px 字 + 11px 横向内边距 + 独立圆角),
 * 与旁边 15px 的图标钮既不等高也不等圆角, "EN" 还因为多出的内边距在视觉上
 * 脱离了那两颗图标 —— 徽章是状态标签的规格, 不是按钮的规格。
 */
export function VoyageLangSwitcher({ className, locale, onLocaleChange }: VoyageLangSwitcherProps) {
  const tr = STRINGS[locale];
  return (
    <button
      type="button"
      className={['vg-iconbtn', 'vg-lang-switch', className].filter(Boolean).join(' ')}
      aria-label={tr.ariaLabel}
      onClick={() => onLocaleChange(tr.next)}
    >
      {tr.label}
    </button>
  );
}
