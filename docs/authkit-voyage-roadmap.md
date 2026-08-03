# AuthKit × Voyage 路线大纲

## 目标

让 Voyage 提供可跨业务复用的状态页、加载指示和账户菜单，让 AuthKit 保持认证逻辑所有权，
再通过 AuthKit 的 Voyage 适配入口组合两者。Voyage 不依赖 AuthKit，AuthKit 根入口也不强制
依赖 Voyage。

## 边界

- Voyage：视觉 token、通用展示组件、原生平台交互和可访问性契约。
- AuthKit：会话状态、token、登录跳转、回调处理和用户模型。
- `@yiminlab/authkit/voyage`：把 AuthKit 状态映射到 Voyage 展示组件。
- 应用：决定文案、路由、布局和应用级默认主题。

## 阶段一：Voyage 公共组件地基

由当前任务直接完成，不交给自动实现队列，因为这些 API 会约束所有下游。

- `VoyageSpinner`：token 驱动、可访问文案、支持 reduced motion。
- `VoyageStateView`：支持 page/section 与 loading/info/error 三类语义，可替换标题、描述、图标和动作。
- `VoyageAccountMenu`：受控展示组件，不认识 AuthKit `User`；未登录显示登录动作，已登录显示头像与原生 Popover 菜单。
- 组件 class 一律使用 `vg-*`，新组件不增加字面量颜色。
- 纯展示组件保持 SSR 安全；依赖浏览器交互的组件单独标记 client boundary。
- 补齐 Vitest、Playwright、试衣间实例、README 和版本发布必备验证。

## 阶段二：AuthKit Voyage 适配

Voyage 新版本发布后，在 `yiminspace/yiminlab` 创建 ready issue：

- 增加 `@yiminlab/authkit/voyage` 子入口。
- 提供 `VoyageAuthGuard`、`VoyageCallbackHandler`、`VoyageAuthMenu`。
- AuthKit 根入口继续 headless；只使用适配入口时才要求安装 Voyage。
- 增加 React 行为测试、README 和构建验证。

## 阶段三：应用迁移

- Engram：ready，迁移 Guard、Callback 和 UserMenu。
- JsonTailor：ready，迁移 Guard、Callback 和自建认证守卫。
- AI：先 intake，确认整体 Voyage 接入范围后再转 ready。
- 所有消费者迁移后，停止认证入口使用旧 `@yiminlab/ui` UserMenu。

## 阶段四：Voyage 工程门禁

适合拆成独立 ready issue：

- 发布等待完整 CI，并校验版本严格递增。
- 清除组件 CSS 字面量颜色，lint 覆盖完整组件层。
- 增加 Chromium、Firefox、WebKit 与可访问性门禁。
- 建立覆盖四轴的代表性视觉回归组合，不穷举全部矩阵。

Voyage 当前未纳入 evolve registry；创建这些 issue 前需先以 `flow: evolve-ci` 纳管并确认
registry 变更。

## 阶段五：AuthKit 1.0 安全契约与仓库边界

这部分仍由当前任务直接设计，ADR 签收前不投自动实现：

- 在 BFF + HttpOnly Cookie 与 Authorization Code + PKCE 之间确定目标模型。
- 定义 access token、refresh token、session、callback、logout 和跨标签同步契约。
- 定义 0.x localStorage 模型的迁移方式和前后端机器契约。
- 协议稳定并经历多个版本后，再决定是否把前端 SDK 提取为独立仓库。

可先独立创建一个 ready 修复：校验 callback `return` 目标，非法目标回落到同源安全路径。

## 依赖顺序

1. Voyage 公共组件地基发布。
2. AuthKit Voyage 适配入口。
3. Engram / JsonTailor 迁移与 AI 研判。
4. 旧认证 UserMenu 清理。
5. AuthKit 1.0 安全 ADR、实现拆分和应用迁移。
6. AuthKit 独立仓库复评。
