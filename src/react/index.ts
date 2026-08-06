/**
 * @yiminlab/voyage/react — React 薄封装
 *
 * 挂载时读取/应用四轴偏好 (VoyageProvider + useVoyage), 并提供开箱即用的
 * 顶栏控件。样式仍来自 tokens.css / voyage.css, 本模块不引入任何字面量色值。
 *
 * 顶栏优先用 VoyageToolbar —— 它把语言/明暗/调色板三颗钮按固定顺序排好;
 * 下面两个单品导出留给需要自定义排布的宿主, 用了就要自己对顺序负责。
 */

export { VoyageProvider, useVoyage, type VoyageContextValue, type VoyageProviderProps } from './voyage-provider';
export { VoyageToolbar, type VoyageToolbarProps } from './voyage-toolbar';
export { VoyageSwitcher, type VoyageSwitcherProps, type VoyageSwitcherIcons } from './voyage-switcher';
export { VoyageLangSwitcher, type VoyageLangSwitcherProps } from './voyage-lang-switcher';
export {
  VoyageSpinner,
  VoyageStateView,
  type VoyageSpinnerProps,
  type VoyageSpinnerSize,
  type VoyageStateViewProps,
  type VoyageStateViewSize,
  type VoyageStateViewVariant,
} from './primitives';
export {
  VoyageAccountMenu,
  type VoyageAccountIdentity,
  type VoyageAccountMenuLabels,
  type VoyageAccountMenuProps,
} from './voyage-account-menu';
export {
  VoyageIssueReporter,
  type VoyageIssueReporterProps,
  type VoyageIssueSubmitResult,
} from './voyage-issue-reporter';
export * from './dashboard';
