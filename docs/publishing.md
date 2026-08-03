# 发布流程

Voyage 用 GitHub Actions 自动发布 `@yiminlab/voyage`。维护时以本页与 `scripts/publish-decision.mjs` 为准。

## 触发顺序

1. Push（或合并）到 `main` → 跑 `ci.yml`（Vitest + Playwright → **Result**）。
2. 仅当该次 CI **成功完成** 后，`publish.yml` 经 `workflow_run` 启动，并 checkout **同一 head SHA**。
3. CI 失败、取消或尚未完成时不会 publish，也不会写 `voyage-v*` tag。
4. 手动 `workflow_dispatch` 只针对所选 `main` commit：先用 GitHub API 确认该 SHA 已有成功的 CI push run，再执行与自动发布相同的版本 / 产物检查。
5. 所有 main 发布共用 concurrency group `publish-main`（`cancel-in-progress: false`），跨 SHA 串行化后再查 registry，避免并行 TOCTOU。

## 版本判定

`node scripts/publish-decision.mjs decide --from-registry`：

- 读取本地 `package.json` version，查询 npm `version`。
- **严格 SemVer**：当前 > npm → publish；相等 → skip（exit 0）；当前 < npm、非法版本、或 registry 查询失败 → fail（exit 1）。
- Registry 失败 **fail closed**，不会伪造 `0.0.0`。

本地可复现：

```bash
node scripts/publish-decision.mjs decide --current 0.13.0 --published 0.12.0
pnpm exec vitest run scripts/publish-decision.test.ts
```

## 产物与 tag

1. `pnpm install --frozen-lockfile` → typecheck → build  
2. `node scripts/check-pack-contents.mjs --pack`（根 / React / primitives 入口 + 三份 CSS）  
3. `pnpm publish`（Trusted Publishing）  
4. 确保 `voyage-v<version>` 指向触发发布的 commit：缺失则创建；已存在且同 SHA 则不变；指向其他 commit 则失败（不覆盖）。  
5. 版本 equal/skip 时不重复 publish，但仍会幂等校验 / 补建 tag（用于 npm 已成功但 tag 步骤曾失败的重跑）。
