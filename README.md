# @yiminlab/voyage

yiminlab 统一样式系统。**所有 GUI 应用的视觉基础**: 一套 quarry 血统的组件规格 + 四轴正交的 token 矩阵。

- 规格血统: 色板公式与组件尺寸源自 quarry 的 Slate & Copper 主题 (带色温的四级灰阶 + 一枚金属色 accent + 数据类型着色)。**quarry 是本规格的基准**: `slate x dark x classic x normal` 必须和 quarry 现有视觉一致, 出现偏差改这里, 不在这里加 quarry 特判。
- 零运行时依赖: 样式是纯 CSS; JS 入口只有主题偏好读写与免闪烁脚本。
- 交互行为约定: 弹窗用原生 `<dialog>`, 浮层用 Popover API, 不引入 Radix/shadcn。

## 四根轴

| 轴 | 取值 | 管什么 |
|---|---|---|
| `data-theme` | 自研: `slate` 板岩铜 (quarry 基准) / `ink` 纸墨朱; 经典采编 (MIT, 出处见 tokens.css): `github` 石墨 (兼 evolve GUI 基准, accent 取 Primer 链接蓝) / `nord` 北极 / `tokyo` 东京夜 / `catppuccin` 摩卡 / `onedark` 原子 / `solarized` 日晒 / `rosepine` 玫瑰松 / `everforest` 常青林 | 颜色 |
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

**语义色**: `--ok` / `--warn` / `--red` 三枚种子色**随主题走**, 每套主题在 tokens.css 第 2 段自报 dark 与 light 两档 —— 全主题共用一枚 Primer 红会让 everforest、rosepine 这类有自己色相语言的主题出戏。配套的染色底 `--*-bg` 与彩色文字 `--*-fg` 由第 3 段用 `color-mix` 从种子色推导, 不必逐主题手调; 只有 `slate` (quarry 基准) 与 `github` (evolve GUI 基准) 在主题矩阵里手写覆写这几位, 因为它们要逐值保真既有视觉。

新增主题时**必须给全三枚种子色**: CSS 自定义属性没有继承兜底, 漏给会让 `.vg-badge` / `.vg-state` 吃到空值直接变透明 —— 表现为「徽章没了」而非「颜色不对」, 极难察觉。`tokens-theme.test.ts` 对 10 × 2 共 20 种组合逐一断言, 漏给即红。

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

子路径导出开箱即用的主题切换 UI, 参照 [`@yiminlab/authkit`](https://www.npmjs.com/package/@yiminlab/authkit) 的分发方式 (peerDependencies react, 不打进包体)。

```bash
pnpm add @yiminlab/voyage react react-dom
```

```tsx
import { VoyageProvider, VoyageToolbar } from '@yiminlab/voyage/react';
import { VOYAGE_APP_DEFAULTS } from '@yiminlab/voyage';

function App() {
  const [locale, setLocale] = useState('zh');
  return (
    <VoyageProvider defaults={VOYAGE_APP_DEFAULTS.engram}>
      <header className="vg-header">
        {/* ... */}
        <VoyageToolbar locale={locale} onLocaleChange={setLocale} />
      </header>
    </VoyageProvider>
  );
}
```

- **`VoyageProvider`** — 挂载时执行 `initVoyage`, 通过 context 分发偏好与 setter; 需要同时维护 tailwind `.dark` class 的应用传 `syncDarkClass`。SSR 场景仍需配合 `voyageInitScript` 防闪烁 (本组件只管挂载后的状态)。
- **`useVoyage()`** — 返回 `{ prefs, setTheme, setMode, setStyle, setTone, setPrefs, reset }`, 每次调用写入 `localStorage('vg_prefs')` 并同步宿主元素属性。
- **`VoyageToolbar`** — **顶栏首选**: 把反馈入口、语言钮与主题切换器按固定顺序排成一行。缺省仍是 **语言 → 明暗 → 调色板**；传 `reporter` 后是 **反馈 | 语言 → 明暗 → 调色板**。明暗与调色板同属主题外观、天然相邻; 语言是另一维度的设置, 整体靠边而非夹在主题族旁边。不传 `onLocaleChange` 则不渲染语言钮 (不做多语言的宿主直接省略)。`icons` 透传给内部的 `VoyageSwitcher`。

  顺序之所以要由组件固化: 此前两个单品各自导出、谁左谁右无人约束, 两个宿主排成了相反的顺序 —— 设计系统管住了每颗钮"长什么样", 却没管"站哪儿"。需要自定义排布的宿主仍可直接用下面两个单品, 但那样顺序就是宿主自己的责任了。

  根节点类名是 **`.vg-topbar`**, 与卡片内一排按钮 (`.vg-section` 里的 `.vg-toolbar`, 见 `voyage.css` 「工具条 / 按钮 / 输入」段: `padding: 9px 14px; background: var(--surf-1); border-bottom: 1px solid`) 是两个独立的类名, 不再共用。`.vg-topbar` 只负责排列 (`display / align-items / gap`), 不带 padding / 背景 / 边框 —— 外观完全交给宿主的 `.vg-header` 等容器。
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

- **`VoyageLangSwitcher`** — 语言切换钮 (单品导出; 顶栏一般经 `VoyageToolbar` 使用)。与明暗钮/调色板钮**共用 `.vg-iconbtn` 这一个盒子** —— 同高、同最小宽、同圆角、同悬停底, 只在内容排版上区分: "中"/"EN" 是裸文字不是矢量图标, 按 15px 图标的光学重量折算到 12.5px/600。受控组件: 传入当前 `locale` 与 `onLocaleChange`, 组件本身不持有语言状态。

  **宽度是锁死的** (`--vg-lang-w`, 缺省取控件高 `--vg-ctl-h`), 不随文案伸缩: "中" 与 "EN" 字宽本就不等, 若靠内容撑开, 切换语言时按钮会变宽并把同排右侧控件横向推走, 表现为切一次语言抖一下。锁死后"不抖"是结构保证而非巧合。文案确实更宽的宿主覆盖 `--vg-lang-w` 即可, 不要改回自适应:

```css
.vg-header { --vg-lang-w: 72px; }
```

```tsx
<VoyageLangSwitcher locale={locale} onLocaleChange={setLocale} />
```

### 认证界面基础组件

Voyage 只提供展示与交互契约，不读取 session/token，也不依赖任何认证 SDK。`Spinner` 和 `StateView` 可从 SSR-safe 子路径导入：

```tsx
import {
  VoyageSpinner,
  VoyageStateView,
} from '@yiminlab/voyage/react/primitives';

<VoyageStateView
  variant="loading"
  size="section"
  heading="正在确认登录状态"
  description="请稍候…"
/>

<VoyageStateView
  variant="error"
  size="page"
  heading="登录失败"
  description="授权回调没有完成。"
  action={<button className="vg-btn">重试</button>}
/>
```

`VoyageAccountMenu` 是 client component，由宿主或 AuthKit 适配层传入已归一化的用户信息和登录/退出回调：

```tsx
import { VoyageAccountMenu } from '@yiminlab/voyage/react';

<VoyageAccountMenu
  locale="zh"
  isLoading={auth.isLoading}
  isAuthenticated={auth.isAuthenticated}
  identity={auth.user && {
    name: auth.user.name,
    secondary: auth.user.email,
    imageUrl: auth.user.avatarUrl,
  }}
  onLogin={auth.login}
  onLogout={auth.logout}
/>
```

- **`VoyageSpinner`** — `sm` / `md` / `lg` 三档；独立使用时提供 `role="status"`，嵌入已有文案的状态组件时传 `decorative`。系统开启 reduced motion 时停止旋转。
- **`VoyageStateView`** — `section` / `page` 布局和 `loading` / `info` / `error` 语义，可替换图标与 action，默认补齐 ARIA live region。
- **`VoyageAccountMenu`** — 受控账户菜单；未登录显示登录动作，已登录显示头像和原生 Popover 菜单，并包含键盘导航与焦点恢复。

推荐由 `@yiminlab/authkit/voyage` 这类适配入口负责把 AuthKit 的 session/user 映射为上述 props，避免 Voyage 与 AuthKit 双向依赖。

## 页面问题上报

`VoyageIssueReporter` 让用户直接点选有问题的界面或文字，比只附截图多一层可机器读取的定位证据。它只负责浏览器端的选择、脱敏、取证与 `POST`；GitHub token、仓库路由和 Issue 创建必须留在服务端。

顶栏接入只需要配置 intake 地址与应用身份：

```tsx
<VoyageToolbar
  locale={locale}
  onLocaleChange={setLocale}
  reporter={{
    endpoint: '/api/ui-issue-intake',
    app: {
      name: 'quarry',
      release: process.env.NEXT_PUBLIC_APP_VERSION,
    },
  }}
/>
```

也可以单独摆放：

```tsx
import { VoyageIssueReporter } from '@yiminlab/voyage/react';

<VoyageIssueReporter
  endpoint="https://intake.example.com/v1/ui-issues"
  app="engram"
  labels={['intake']}
  metadata={{ routeName: 'reader' }}
  headers={{ 'x-csrf-token': csrfToken }}
/>
```

交互约定：

- 顶栏按钮进入选择模式，页面仍可滚动；点击目标只完成选择，不会触发原业务按钮或链接。`Esc` 随时退出。
- 如果触发前已有划词，直接以文字引用进入「内容有误」，保留上下文前后缀。
- 一个问题涉及多个位置时，选完第一个后点「添加区域」继续选择；已有区域保持高亮，可在表单中逐个移除，最终一起进入 `targets[]`。
- 问题类型支持多选且至少保留一项；协议同时发送完整 `kinds[]`，并用 `kind: kinds[0]` 兼容旧 intake。
- `Cmd/Ctrl + Shift + .` 可从当前指针位置直接取目标；不需要快捷键的宿主传 `shortcut={false}`。
- 选中后冻结当时证据，再在侧边表单补充类型与期望；失败保留现场和描述，成功时 intake API 可返回 GitHub Issue 链接。

证据包 schema 是 `voyage-ui-issue/v1`，默认 `labels: ['intake']`、`destination.provider: 'github-issue'`，包含：

- 一次反馈会话内稳定的 `reportId`，服务端可据此幂等创建 Issue；失败原地重试时 ID 不变，新反馈重新生成；
- 问题主类型 `kind` 与完整多选类型 `kinds[]`；
- 应用、Voyage 版本与四轴主题偏好；
- 去掉 query 的页面地址、标题、viewport、设备像素比和系统偏好；
- 目标 selector、`vg-*` 组件血统、语义标识、ARIA 角色/名称、采集时间，以及标明坐标系的 viewport/document 双份几何位置；
- 一组有限的 computed styles 与 Voyage tokens；
- 最多 4 层、140 个节点、12,000 字符的局部 DOM，或精确划词与前后文。

隐私边界：

- `password` / `email` / `tel` 输入、`textarea`、可编辑区域和任何 `[data-vg-private]` 子树都会遮蔽；公共父节点的文本摘要也会跳过这些后代。
- 不读取 input value、cookie、localStorage、token、网络请求或页面 query。
- 动态内容区域应主动标记 `data-vg-private`；希望 selector 长期稳定的组件可标 `data-vg-id` 或 `data-vg-component`。
- `metadata` 与自定义 headers 由宿主负责，禁止放 GitHub token 或用户输入。

intake API 接收完整 JSON 报告。成功响应可以直接返回 GitHub 风格字段，也可以包在 `issue` 下：

```json
{
  "issueUrl": "https://github.com/yiminspace/yiminlab/issues/501",
  "issueNumber": 501
}
```

服务端应验证 schema 与大小、鉴权/限流、以 `reportId` 幂等创建、把证据渲染进 Issue body、按应用路由到仓库，并强制补上 `intake` 标签。浏览器端的 `labels` 只是路由提示，不能代替服务端策略。

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

功能试驾（会打开浏览器，加载真实 React 组件）：

```bash
pnpm demo
```

页面右上角会出现反馈图标。可直接点选任意元素，或先划选正文再点反馈；提交由本地 mock intake 拦截，不会创建真实 GitHub Issue。提交后左侧自动展示完整 `voyage-ui-issue/v1` JSON，可检查 selector、局部 DOM、computed styles、Voyage tokens、运行环境和隐私遮蔽结果。

只查看零构建静态视觉基准：

```
open demo/fitting-room.html
```

被测样式全部来自 tokens.css / voyage.css 本体; 改 token 后先开这页对照四轴组合。`file://` 模式不加载 React，页面顶栏内嵌一个 `vg-topbar` 静态实例 (原生 JS 驱动, 与 `VoyageToolbar` 组件同一份标记/样式), 兼作顶栏控件的视觉基准 —— 三颗钮的等高/同圆角、以及切换语言时右侧控件不位移, 都在这页上量。卡片内的 `.vg-toolbar` 按钮行 (「hysteresis」卡片下方) 是另一语境的静态实例, 两者不共用类名。

手工对照仍可用 (改 token 后开页肉眼核对四轴组合), 但上述尺寸契约已由 `e2e/` 下的 Playwright 用例自动守住: 真实浏览器排版引擎跑 `getBoundingClientRect()` / `getComputedStyle()`, 断言三颗钮等高等宽同圆角、语言钮在多种文案 (含明显更宽的文案) 下宽度恒定、切换语言不推动右侧控件、圆角随 `data-style` 轴变化、`--vg-lang-w` 覆盖生效且可回落默认。这类断言 jsdom 测不出来 (不解析 `var()`、无字体引擎、不跑 flex 布局), 只有真实渲染才能当场暴露。

```
pnpm test        # vitest — 组件行为/token 解析
pnpm test:e2e    # playwright — 三引擎几何/交互/a11y + Chromium 视觉基线
pnpm test:all    # 两者都跑
```

### 多引擎与可访问性

`playwright.config.ts` 定义四个 project：`chromium`、`firefox`、`webkit`（几何 / 交互 / a11y）以及 `chromium-visual`（像素基线）。`pnpm test:e2e` 会跑完全部；`retries: 0`，不靠重试掩盖不稳定。本地首次需要安装浏览器：

```
pnpm exec playwright install --with-deps chromium firefox webkit
```

CI（`.github/workflows/ci.yml`）同样安装三种引擎与系统依赖；缓存 key 含 `runner.os`、Playwright 版本与引擎范围 `chromium-firefox-webkit`。失败时上传 `playwright-report/` 与 `test-results/`（含 trace，以及视觉失败时的 expected / actual / diff 图像）。CI Result job 会在任一引擎失败时失败。

可访问性门禁用 `@axe-core/playwright`，覆盖试衣间主界面、主题菜单、AccountMenu 退出项与 Reporter 表单；只拦截 serious/critical。认证组件另有键盘契约（AccountMenu Enter 打开、方向键/Home/End、Esc 归还焦点）与 StateView role/live region/busy 断言。Popover 相关用例在引擎支持原生 API 时校验 `:popover-open`，否则校验 React fallback 可见性，两者焦点与可见行为一致。

跑单引擎或单文件时可用 Playwright 项目过滤，例如：

```
pnpm exec playwright test --project=chromium e2e/auth-components.spec.ts
pnpm exec playwright test --project=webkit e2e/accessibility.spec.ts
pnpm exec playwright test --project=chromium-visual
```

### 视觉回归基线

只维护四组代表性宿主默认组合，不穷举四轴矩阵：

| 基线 | theme × mode × style × tone | 覆盖意图 |
|---|---|---|
| quarry | `slate × dark × classic × normal` | Quarry 兼容基准 |
| engram | `ink × light × soft × quiet` | Engram 默认 |
| jsontailor | `tokyo × dark × glass × quiet` | JsonTailor 默认 |
| ai | `everforest × dark × classic × quiet` | AI 预定默认 |

每组截取稳定局部容器：`#toolbar`（顶栏控件）、`#fit`（应用内容）、`#semantic` / `#semantic-badges`（语义色）、`#component-demo`（StateView / Spinner / AccountMenu 静态展示）。截图前机械断言各宿主 `data-theme` / `data-mode` / `data-style` / `data-tone` 与目标一致。

稳定化约定（本地与 CI 共用）：

- 固定 viewport `1280×800`、`deviceScaleFactor: 1`
- `prefers-reduced-motion: reduce`，禁用 caret，spinner 钉在 `rotate(90deg)`
- 等待 `document.fonts.ready`，并用 Arial / Courier New 覆盖系统字体差异
- 基线只在 `chromium-visual` 生成；Firefox / WebKit 不维护像素快照

本地核对：

```
pnpm exec playwright test --project=chromium-visual
```

同一 commit 连续跑两次应无像素差异。更新基线**仅在明确的视觉变更审查通过后**执行，且应在与 CI 同构的 Linux Chromium 环境生成（推荐 Playwright 官方镜像），避免 macOS / Linux 抗锯齿分叉：

```
# 与 CI 同构更新（Playwright 版本须与 package.json 一致）
docker run --rm -it \
  -v "$PWD":/work -w /work \
  -e CI=1 \
  mcr.microsoft.com/playwright:v1.61.1-jammy \
  bash -lc 'corepack enable && pnpm install --frozen-lockfile && pnpm exec playwright test --project=chromium-visual --update-snapshots'
```

审查要求：PR 若改 token、标题排版、账户菜单尺寸或状态图标颜色，对应快照用例应失败；合入前核对 `test-results/` 中的 expected / actual / diff，确认差异即预期视觉变更后再更新并提交 `e2e/visual-regression.spec.ts-snapshots/`。

## 发布

改可发布内容需要同步 bump `package.json` 的 `version`，否则 `publish.yml` 会判定「版本未变」并跳过发布。PR 阶段有 `version-check.yml` 拦截漏 bump 的改动。合入 `main` 后，GitHub Actions 使用 npm Trusted Publishing (OIDC) 自动发布并创建 `voyage-v<version>` tag。

## 开发

需要 Node.js 22+ 和 pnpm 10：

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
```

提交前至少运行 `pnpm typecheck && pnpm test && pnpm build`；涉及样式、布局或浏览器交互时还需运行 `pnpm test:e2e`。

## Roadmap

- [x] react/ 薄封装: VoyageProvider / useVoyage / VoyageToolbar / VoyageSwitcher (Popover API, 有支持时启用) / VoyageLangSwitcher
- [x] 认证界面基础组件: VoyageSpinner / VoyageStateView / VoyageAccountMenu
- [x] 页面问题上报: 元素/划词选择、脱敏证据包、可配置 intake endpoint
- [x] quarry 接入 (slate x dark x classic x normal, 视觉基准)
- [ ] react/ 其余薄封装: Dialog (原生 `<dialog>`) / Toast
- [ ] engram 迁移 (首个宿主) → jsontailor → ai
- [ ] focus / disabled / pressed / loading 状态完备化
- [ ] 间距与排印 scale 系统化
