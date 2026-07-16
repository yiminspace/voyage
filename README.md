# @yiminlab/voyage

yiminlab 统一样式系统。**所有 GUI 应用的视觉基础**: 一套 quarry 血统的组件规格 + 四轴正交的 token 矩阵。

- 规格血统: 色板公式与组件尺寸源自 quarry 的 Slate & Copper 主题 (带色温的四级灰阶 + 一枚金属色 accent + 数据类型着色)。**quarry 是本规格的基准**: `slate x dark x classic x normal` 必须和 quarry 现有视觉一致, 出现偏差改这里, 不在这里加 quarry 特判。
- 零运行时依赖: 样式是纯 CSS; JS 入口只有主题偏好读写与免闪烁脚本。
- 交互行为约定: 弹窗用原生 `<dialog>`, 浮层用 Popover API, 不引入 Radix/shadcn。

## 四根轴

| 轴 | 取值 | 管什么 |
|---|---|---|
| `data-theme` | `slate` 板岩铜 / `ink` 纸墨朱 / `navy` 深海黄铜 / `jade` 玄武玉 / `aurora` 极光 / `sunset` 日暮 / `horizon` 苍穹 / `oolong` 蜜桃乌龙 | 颜色 (后四套为渐变主题) |
| `data-mode` | `dark` / `light` | 底色深浅 |
| `data-style` | `classic` / `glass` / `soft` / `sharp` | 结构: 圆角 / 密度 / 材质 / 阴影 |
| `data-tone` | `normal` / `quiet` | 对比强度; **quiet (久航) 是日常默认**, normal 留给演示 / 截图 |

四轴完全正交, 任意组合成立。主题层只有色值, 风格层只有结构值, tone 层用 `color-mix` 从种子色推导, 不需要为每套主题手调。

## 色彩三原则 (tone=quiet 的依据)

1. **实色保持全饱和但限量** — 纯色只出现在小面积 (选中指示线 / logo / 顶线);
2. **染色底用半透明纯色** — 选中行 8%、划词高亮 19%: 只降浓度不降纯度, 不掺灰;
3. **暗色下大面积填充压明度不压饱和** — 主按钮是「深色版主色 + 白字」, 对比放进控件内部, 而不是控件与页面之间 (同 GitHub / VS Code dark 的做法)。

色阶语义 (12 级, 对齐 Radix / Primer): 1–2 底面 / 3–5 染色底 / 6–8 边框 / 9–10 实色 / 11 彩色文字 / 12 正文。

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

- **`VoyageProvider`** — 挂载时执行 `initVoyage`, 通过 context 分发偏好与四个 setter; 需要同时维护 tailwind `.dark` class 的应用传 `syncDarkClass`。SSR 场景仍需配合 `voyageInitScript` 防闪烁 (本组件只管挂载后的状态)。
- **`useVoyage()`** — 返回 `{ prefs, setTheme, setMode, setStyle, setTone, reset }`, 每次调用写入 `localStorage('vg_prefs')` 并同步宿主元素属性。
- **`VoyageSwitcher`** — 顶栏放一个即可: ☾/☀ 一键切明暗 + 展开按钮弹出完整面板 (8 枚主题色点阵 + 明暗/风格/对比三组分段)。浮层用原生 Popover API (支持时启用), 交互始终由 React state 兜底, 键盘可达 (Esc 关闭, 焦点环见 voyage.css)。

## 各应用默认组合

| 应用 | theme | mode | style | tone |
|---|---|---|---|---|
| engram | ink 纸墨朱 | light | soft | quiet |
| jsontailor | navy 深海黄铜 | dark | glass | quiet |
| ai | jade 玄武玉 | dark | classic | quiet |
| quarry | slate 板岩铜 (原始基准) | dark | classic | normal |
| portal | — 搁置, 保持现有设计 | | | |

用户在任意应用内切换后经 `localStorage('vg_prefs')` 持久化, 覆盖应用默认。

## 试衣间 (视觉回归基准)

```
open demo/fitting-room.html
```

被测样式全部来自 tokens.css / voyage.css 本体; 改 token 后先开这页对照四轴组合。页面顶栏内嵌了一个 `vg-switcher` 静态实例 (原生 JS 驱动, 与 `VoyageSwitcher` 组件同一份标记/样式), 兼作切换器的视觉基准。

## Roadmap

- [x] react/ 薄封装: VoyageProvider / useVoyage / VoyageSwitcher (Popover API, 有支持时启用)
- [x] quarry 接入 (slate x dark x classic x normal, 视觉基准)
- [ ] react/ 其余薄封装: Dialog (原生 `<dialog>`) / Toast
- [ ] engram 迁移 (首个宿主) → jsontailor → ai
- [ ] focus / disabled / pressed / loading 状态完备化
- [ ] 间距与排印 scale 系统化
