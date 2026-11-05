'use client';

import type { ReactNode } from 'react';
import type { VoyageLocale } from '../index';
import {
  VoyageIssueReporter,
  VoyageReportIcon,
  type VoyageIssueReporterProps,
} from './voyage-issue-reporter';
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
  /** 保留标准语言钮但禁用，适合功能尚未接入的占位阶段。 */
  language?: VoyageToolbarPlaceholder;
  /** 宿主用自家图标体系时传入 (如 quarry 传 tabler webfont 的 <i>) */
  icons?: VoyageSwitcherIcons;
  /**
   * 是否提供调色板 (主题面板); 缺省 true。主题由产品固定、只开放明暗的宿主
   * 传 false, 工具条里只剩明暗钮。
   */
  palette?: boolean;
  /**
   * 可选 UI 问题上报。传入后顺序为 反馈 | 语言 → 明暗 → 调色板；
   * endpoint 接收证据包并由服务端创建带 intake 标签的 GitHub Issue。
   */
  reporter?: Omit<VoyageIssueReporterProps, 'locale' | 'className'> | VoyageToolbarPlaceholder;
  /** 可选 GitHub 仓库链接，在主题控件之后、账户入口之前打开新标签页。 */
  githubHref?: string;
  /**
   * 可选账户入口，固定排在末尾。通常传 VoyageAccountMenu，或由
   * @yiminlab/authkit/voyage 提供的 VoyageAuthMenu；不传则不渲染也不留空位。
   */
  account?: ReactNode;
}

export interface VoyageToolbarPlaceholder {
  disabled: true;
  /** 禁用原因；同时作为原生 title。 */
  title?: string;
}

function isPlaceholder(value: unknown): value is VoyageToolbarPlaceholder {
  return !!value && typeof value === 'object' && (value as VoyageToolbarPlaceholder).disabled === true;
}

const PLACEHOLDER_LABELS: Record<VoyageLocale, { reporter: string; language: string; reason: string }> = {
  zh: { reporter: '问题上报', language: '语言切换', reason: '尚未接入' },
  en: { reporter: 'Issue reporting', language: 'Language switcher', reason: 'Not available yet' },
};

/**
 * 顶栏工具条: 把反馈、语言、主题切换器 (明暗 + 调色板)、GitHub 与可选账户入口
 * 按固定顺序排成一行。
 *
 * 完整顺序为 反馈 | 语言 → 明暗 → 调色板 → GitHub → 账户，由这里的 DOM 结构固化，
 * 不再交给宿主自己拼 JSX。
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
 *
 * account 是语义插槽而不是认证配置：Voyage 只管位置，不读取 session/token；
 * 认证状态仍由宿主或 AuthKit 适配组件负责。
 */
export function VoyageToolbar({
  className,
  locale = 'zh',
  onLocaleChange,
  language,
  icons,
  palette = true,
  reporter,
  githubHref,
  account,
}: VoyageToolbarProps = {}) {
  const placeholderLabels = PLACEHOLDER_LABELS[locale];
  const languagePlaceholder = isPlaceholder(language) ? language : null;
  return (
    <div className={['vg-topbar', className].filter(Boolean).join(' ')}>
      {reporter ? (
        <>
          {isPlaceholder(reporter) ? (
            <button
              type="button"
              className="vg-iconbtn vg-reporter-trigger vg-toolbar-placeholder"
              disabled
              aria-label={`${placeholderLabels.reporter}（${reporter.title ?? placeholderLabels.reason}）`}
              title={reporter.title ?? placeholderLabels.reason}
            >
              <VoyageReportIcon />
            </button>
          ) : (
            <VoyageIssueReporter {...reporter} locale={locale} />
          )}
          <span className="vg-topbar-separator" aria-hidden="true" />
        </>
      ) : null}
      {languagePlaceholder ? (
        <button
          type="button"
          className="vg-iconbtn vg-lang-switch vg-toolbar-placeholder"
          disabled
          aria-label={`${placeholderLabels.language}（${languagePlaceholder.title ?? placeholderLabels.reason}）`}
          title={languagePlaceholder.title ?? placeholderLabels.reason}
        >
          {locale === 'zh' ? '中' : 'EN'}
        </button>
      ) : onLocaleChange ? (
        <VoyageLangSwitcher locale={locale} onLocaleChange={onLocaleChange} />
      ) : null}
      <VoyageSwitcher locale={locale} icons={icons} palette={palette} />
      {githubHref ? (
        <a className="vg-iconbtn vg-topbar-github" href={githubHref} target="_blank" rel="noreferrer"
          aria-label="GitHub" title="GitHub">
          {/* Tabler Icons brand-github (MIT), sized like the appearance icons. */}
          <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 19c-4.3 1.4 -4.3 -2.5 -6 -3m12 5v-3.5c0 -1 .1 -1.4 -.5 -2c2.8 -.3 5.5 -1.4 5.5 -6a4.6 4.6 0 0 0 -1.3 -3.2a4.2 4.2 0 0 0 -.1 -3.2s-1.1 -.3 -3.5 1.3a12.3 12.3 0 0 0 -6.2 0c-2.4 -1.6 -3.5 -1.3 -3.5 -1.3a4.2 4.2 0 0 0 -.1 3.2a4.6 4.6 0 0 0 -1.3 3.2c0 4.6 2.7 5.7 5.5 6c-.6 .6 -.6 1.2 -.5 2v3.5" />
          </svg>
        </a>
      ) : null}
      {account ? <div className="vg-topbar-account">{account}</div> : null}
    </div>
  );
}
