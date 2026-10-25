# Changelog

本文件从 0.17.0 开始记录；更早的版本见 git 历史与 `voyage-v<version>` tag。

## 0.17.0

考场层的 token 与 helper。只做加法，既有主题外观不变；`vg-exam-*` 外观原子（顶栏、说明条、题号导航等）不在本版。

### 新增

- 主题 `examhall`（考场）：浅色白底黑字、深色白字黑底，判定色手写 `-fg` / `-bg`；墨色实心按钮；控件边框提到 ≥3:1。排在对比层之后，`quiet` 改不动它。
- 样式 `plain`（素）：控件 3px / 窗口 4px，比 `sharp` 宽松，无阴影、发光和模糊，表头不转大写。
- 5 个通用 token：`--vg-color-focus`、`--vg-color-border-strong`、`--vg-color-mark` / `-mark-text`、`--vg-color-flag`、`--vg-color-danger-solid` / `-solid-text`，所有主题都有缺省值。
- 考场层（`tokens.css` 第 7 段）：`.vg-exam` 上的 `--vg-exam-*`，`data-exam-text` 三档字号（16 / 19 / 22），`data-exam-contrast="yellow-on-black"` 覆写。
- `voyage.css`：`.vg-exam` 根节点规则（字体、字号、`color-scheme`、`accent-color`）与 `.vg-exam-mark` 荧光笔（含 forced-colors）。
- `voyageExamAttrs()`、`VoyageExamContrast`、`VoyageExamTextSize`、`VoyageExamDisplay`、`VoyageExamAttrs`、`VOYAGE_EXAM_CONTRASTS`、`VOYAGE_EXAM_TEXT_SIZES`。
- `VOYAGE_APP_DEFAULTS.prism = { examhall, light, plain, crisp }`；`VOYAGE_PRESETS` 增加「考场 / Exam Hall」卡。
- `VoyageToolbar` / `VoyageSwitcher` 的 `palette?: boolean`（缺省 true）：传 false 只渲染明暗钮。
- `demo/exam-tokens.html` 与 `e2e/exam-tokens.spec.ts`（三引擎：精确色值、WCAG 门槛、三档字号、tone 隔离、嵌套隔离、焦点环）。

### 变更

- `.vg :focus-visible` 改用 `--vg-color-focus`（缺省值与原公式相同）；examhall 下 `outline-offset` 为 2px。

### 兼容性

- 0.15 / 0.16 的运行时读到存了 `examhall` 或 `plain` 的偏好会整体回落到缺省；只有同一个源下混用新旧版本时才会碰到。
