# Project Conventions

This repository is the source of truth for `@yiminlab/voyage`.

## Visual system

- Voyage is a four-axis token matrix: `data-theme` × `data-mode` × `data-style` × `data-tone`.
- Quarry's `slate × dark × classic × normal` appearance is the compatibility baseline.
- Visible colors must use Voyage tokens. Do not add literal color values to components.
- Use native platform behavior for interaction: `<dialog>` for dialogs and the Popover API for floating surfaces. Do not introduce Radix or shadcn.
- Public component classes use the `vg-*` prefix.

## Verification

- Run `pnpm typecheck`, `pnpm test`, and `pnpm build` for every publishable change.
- Run `pnpm test:e2e` for CSS, geometry, visual behavior, or browser interaction changes.
- Playwright must resolve from `node_modules/.bin/playwright`; if it is missing, run `pnpm install`.

## Releases

- Bump `package.json` for every change to publishable source or package output.
- Publish runs only after the same `main` commit’s CI Result succeeds (`workflow_run` on `CI`, or manual dispatch that re-checks that SHA).
- Version gate is strict SemVer (`scripts/publish-decision.mjs`): higher → publish, equal → skip, lower / invalid / registry failure → fail closed.
- Before npm publish, `scripts/check-pack-contents.mjs` asserts pack contains root / React / React primitives entries and the three CSS files.
- Main publishes share concurrency group `publish-main` so registry checks are serialized across SHAs.
- npm Trusted Publishing (OIDC) publishes first; `voyage-v<version>` is ensured after publish (and on equal/skip reruns) and is never moved.
