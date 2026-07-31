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
- Merging to `main` publishes through `.github/workflows/publish.yml` using npm Trusted Publishing.
- Release tags use `voyage-v<version>`.
