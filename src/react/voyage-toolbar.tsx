'use client';

import type { VoyageLocale } from '../index';
import { VoyageLangSwitcher } from './voyage-lang-switcher';
import { VoyageSwitcher, type VoyageSwitcherIcons } from './voyage-switcher';

export interface VoyageToolbarProps {
  className?: string;
  /** UI 文案语言, 跟随宿主的语言状态传入; 缺省中文 */
  locale?: VoyageLocale;
  /**
   * 语言切换回调。不传则不渲染语言钮 —— 不做多语言的宿主直接省略,
   * 而不是自己拿 VoyageSwitcher 另拼一套。
   */
  onLocaleChange?: (locale: VoyageLocale) => void;
  /** 宿主用自家图标体系时传入 (如 quarry 传 tabler webfont 的 <i>) */
  icons?: VoyageSwitcherIcons;
}

/**
 * 顶栏工具条: 把语言钮与主题切换器 (明暗 + 调色板) 按固定顺序排成一行。
 *
 * 顺序为 语言 → 明暗 → 调色板, 由这里的 DOM 结构固化, 不再交给宿主自己拼 JSX。
 * 此前 VoyageSwitcher 与 VoyageLangSwitcher 是两个独立导出, 谁左谁右无人约束,
 * 结果两个宿主排成了相反的顺序 —— 设计系统管住了每颗钮"长什么样", 却没管
 * "站哪儿", 规格统一只做了一半。
 *
 * 之所以是这个顺序: 明暗与调色板同属主题外观 (本就是同一个组件里的两颗),
 * 天然该相邻; 语言是另一个维度的设置, 整体靠边, 而不是夹在主题族旁边让人
 * 误读成三选一。
 *
 * 需要自定义排布的宿主仍可直接用 VoyageSwitcher / VoyageLangSwitcher, 但那样
 * 顺序就重新变成宿主自己的责任了。
 */
export function VoyageToolbar({
  className,
  locale = 'zh',
  onLocaleChange,
  icons,
}: VoyageToolbarProps = {}) {
  return (
    <div className={['vg-topbar', className].filter(Boolean).join(' ')}>
      {onLocaleChange ? (
        <VoyageLangSwitcher locale={locale} onLocaleChange={onLocaleChange} />
      ) : null}
      <VoyageSwitcher locale={locale} icons={icons} />
    </div>
  );
}
