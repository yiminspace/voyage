# @yiminlab/voyage

yiminlab 统一样式系统。**所有 GUI 应用的视觉基础**: 一套 quarry 血统的组件规格 + 四轴正交的 token 矩阵。

- 规格血统: 色板公式与组件尺寸源自 quarry 的 Slate & Copper 主题 (带色温的四级灰阶 + 一枚金属色 accent + 数据类型着色)。**quarry 是本规格的基准**: `slate x dark x classic x normal` 必须和 quarry 现有视觉一致, 出现偏差改这里, 不在这里加 quarry 特判。
- 零运行时依赖: 样式是纯 CSS; JS 入口只有主题偏好读写与免闪烁脚本。
- 交互行为约定: 弹窗用原生 `<dialog>`, 浮层用 Popover API, 不引入 Radix/shadcn。

## 四根轴

| 轴 | 取值 | 管什么 |
|---|---|---|
| `data-theme` | 自研: `slate` 板岩铜 (quarry 基准) / `ink` 纸墨朱; 经典采编 (MIT, 出处见 tokens.css): `github` 石墨 / `nord` 北极 / `tokyo` 东京夜 / `catppuccin` 摩卡 / `onedark` 原子 / `solarized` 日晒 / `rosepine` 玫瑰松 / `everforest` 常青林 | 颜色 |
| `data-mode` | `dark` / `light` | 底色深浅 |
| `data-style` | `classic` / `glass` / `soft` / `sharp` | 结构: 圆角 / 密度 / 材质 / 阴影 |
| `data-tone` | `normal` / `quiet` | 对比强度; **quiet (久航) 是日常默认**, normal 留给演示 / 截图 |

四轴完全正交, 任意组合成立。主题层只有色值, 风格层只有结构值, tone 层用 `color-mix` 从种子色推导, 不需要为每套主题手调。

## 色彩三原则 (tone=quiet 的依据)

1. **实色保持全饱和但限量** — 纯色只出现在小面积 (选中指示线 / logo / 顶线);
2. **染色底用半透明纯色** — 选中行 8%、划词高亮 19%: 只降浓度不降纯度, 不掺灰;
3. **暗色下大面积填充压明度不压饱和** — 主按钮是「深色版主色 + 白字」, 对比放进控件内部, 而不是控件与页面之间 (同 GitHub / VS Code dark 的做法)。

色阶语义 (12 级, 对齐 Radix / Primer): 1–2 底面 / 3–5 染色底 / 6–8 边框 / 9–10 实色 / 11 彩色文字 / 12 正文。

**灰阶色温**: `--fg/fg2/fg3` 是全主题共用的中性灰 (偏冷), 绝大多数主题直接用。暖色主题下冷灰次级文字会发脏, 需在 tokens.css 第 6 段「主题微调层」按色温回调 (目前 `ink` 用暖灰 `#c4bcae` / `#a09a8e`)。该层必须排在对比层之后 —— 它与 `.vg[data-tone][data-mode]` 特异度相同, 靠源码顺序取胜, 上移会被 quiet+dark 静默盖掉。

## 用法

```bash
pnpm add @yiminlab/voyage
```

```css
/* globals.css */
@import '@yiminlab/voyage/index.css';
```

Next.js 免闪烁 (layout.tsx 的 <head> 内, 首帧前打属性):

```tsx
import { voyageInitScript, VOYAGE_APP_DEFAULTS } from '@yiminlab/voyage';

<script dangerouslySetInnerHTML={{ __html: voyageInitScript(VOYAGE_APP_DEFAULTS.engram) }} />
```

客户端切换主题:

```ts
import { loadVoyagePrefs, saveVoyagePrefs, applyVoyagePrefs } from '@yiminlab/voyage';

const prefs = { ...loadVoyagePrefs(), mode: 'light' as const };
saveVoyagePrefs(prefs);
applyVoyagePrefs(document.documentElement, prefs);
```

组件类一律 `vg-*` 前缀 (vg-app / vg-header / vg-aside / vg-row / vg-btn / vg-table / vg-state ...), 完整清单见 [voyage.css](./voyage.css)。**任何组件新增可见颜色, 只能引用 tokens 变量, 不允许写字面量色值。**

## React: `@yiminlab/voyage/react`

子路径导出开箱即用的主题切换 UI, 参照 [`@yiminlab/authkit`](../authkit) 的分发方式 (peerDependencies react, 不打进包体)。

```bash
pnpm add @yiminlab/voyage react react-dom
```

```tsx
import { VoyageProvider, VoyageSwitcher } from '@yiminlab/voyage/react';
import { VOYAGE_APP_DEFAULTS } from '@yiminlab/voyage';

function App() {
  return (
    <VoyageProvider defaults={VOYAGE_APP_DEFAULTS.engram}>
      <header className="vg-header">
        {/* ... */}
        <VoyageSwitcher />
      </header>
    </VoyageProvider>
  );
}
```

- **`VoyageProvider`** — 挂载时执行 `initVoyage`, 通过 context 分发偏好与 setter; 需要同时维护 tailwind `.dark` class 的应用传 `syncDarkClass`。SSR 场景仍需配合 `voyageInitScript` 防闪烁 (本组件只管挂载后的状态)。
- **`useVoyage()`** — 返回 `{ prefs, setTheme, setMode, setStyle, setTone, setPrefs, reset }`, 每次调用写入 `localStorage('vg_prefs')` 并同步宿主元素属性。
- **`VoyageSwitcher`** — 顶栏放一个即可: 月亮/太阳一键切明暗 + 调色板按钮弹出主题面板。面板是 **策展主题卡** (`VOYAGE_PRESETS`, 每个色系一个设计过的 style/tone 组合, 卡片用该主题自身 tokens 渲染 mini 预览) + 明暗分段; hover / 聚焦即时全页预览, 移出 / Esc 还原, 点击落定 —— VS Code 主题选择器的交互模型。style/tone 原始轴不再直接暴露给用户 (token 引擎不变, 仍可经 `useVoyage()` 编程设置)。浮层用原生 Popover API (支持时启用), 交互始终由 React state 兜底, 键盘可达 (Esc 关闭, 焦点环见 voyage.css)。
- **图标插槽** — `VoyageSwitcher` 内置图标取 Tabler Icons 原始 path (24 网格 / stroke 2 / 1em 跟随字号); 宿主用图标字体时可整体替换, 与顶栏其余图标保持同一视觉语言:

```tsx
<VoyageSwitcher
  locale={LANG}  // 'zh' | 'en', 跟随宿主语言状态; 缺省中文
  icons={{
    moon: <i className="ti ti-moon" />,
    sun: <i className="ti ti-sun" />,
    trigger: <i className="ti ti-palette" />,
  }}
/>
```

- **`VoyageLangSwitcher`** — 语言切换钮: "中"/"EN" 这类裸文字不是矢量图标, 不套 `.vg-iconbtn` 的圆形图标按钮尺寸, 而是复用 `.vg-badge` 的圆角/内边距/字重规范, 走"文字胶囊"风格; 再叠 `.vg-badge-bare` 去掉描边, 与顶栏其余无框图标按钮并排才不突兀。受控组件: 传入当前 `locale` 与 `onLocaleChange`, 组件本身不持有语言状态。

  其中 `.vg-badge-bare` 是通用修饰类, 任何 `.vg-badge` 都可叠加: 去掉边框并把 padding 各补 1px 吃掉边框宽度, 外尺寸与带框徽章保持一致, 同排混用不会矮 2px。

```tsx
<VoyageLangSwitcher locale={locale} onLocaleChange={setLocale} />
```

## 各应用默认组合

| 应用 | theme | mode | style | tone |
|---|---|---|---|---|
| engram | ink 纸墨朱 | light | soft | quiet |
| jsontailor | tokyo 东京夜 | dark | glass | quiet |
| ai | everforest 常青林 | dark | classic | quiet |
| quarry | slate 板岩铜 (原始基准) | dark | classic | normal |
| portal | — 搁置, 保持现有设计 | | | |

用户在任意应用内切换后经 `localStorage('vg_prefs')` 持久化, 覆盖应用默认。

## 试衣间 (视觉回归基准)

```
open demo/fitting-room.html
```

被测样式全部来自 tokens.css / voyage.css 本体; 改 token 后先开这页对照四轴组合。页面顶栏内嵌了一个 `vg-switcher` 静态实例 (原生 JS 驱动, 与 `VoyageSwitcher` 组件同一份标记/样式), 兼作切换器的视觉基准。

## 发布

改本包源码需要同步 bump `package.json` 的 `version`，否则 `voyage-publish.yml` 会判定「版本未变」静默跳过发布，npm 停留旧版本。PR 阶段有 `voyage-version-check.yml` 拦截漏 bump 的改动。

## Roadmap

- [x] react/ 薄封装: VoyageProvider / useVoyage / VoyageSwitcher (Popover API, 有支持时启用) / VoyageLangSwitcher
- [x] quarry 接入 (slate x dark x classic x normal, 视觉基准)
- [ ] react/ 其余薄封装: Dialog (原生 `<dialog>`) / Toast
- [ ] engram 迁移 (首个宿主) → jsontailor → ai
- [ ] focus / disabled / pressed / loading 状态完备化
- [ ] 间距与排印 scale 系统化
