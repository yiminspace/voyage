/**
 * @yiminlab/voyage/react — React 薄封装
 *
 * 挂载时读取/应用四轴偏好 (VoyageProvider + useVoyage), 并提供开箱即用的
 * 顶栏切换器 (VoyageSwitcher)。样式仍来自 tokens.css / voyage.css, 本模块
 * 不引入任何字面量色值。
 */

export { VoyageProvider, useVoyage, type VoyageContextValue, type VoyageProviderProps } from './voyage-provider';
export { VoyageSwitcher, type VoyageSwitcherProps } from './voyage-switcher';
