import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { VOYAGE_MODES, VOYAGE_THEMES } from './index';

const SRC_DIR = path.dirname(fileURLToPath(import.meta.url));
const TOKENS = readFileSync(path.join(SRC_DIR, '../tokens.css'), 'utf-8');

/** 取某个 theme x mode 组合在主题矩阵里声明的全部块 (一套主题可拆成多块写) */
function themeBlocks(theme: string, mode: string): string {
  const selector = `.vg[data-theme='${theme}'][data-mode='${mode}']`;
  const out: string[] = [];
  let from = 0;
  for (;;) {
    const at = TOKENS.indexOf(selector, from);
    if (at === -1) break;
    const open = TOKENS.indexOf('{', at);
    const close = TOKENS.indexOf('}', open);
    out.push(TOKENS.slice(open + 1, close));
    from = close;
  }
  return out.join('\n');
}

/**
 * 主题微调层 (第 6 段) 覆写全主题共用的灰阶基座。它与 `.vg[data-tone][data-mode]`
 * 特异度相同, 完全靠源码顺序取胜 —— 一旦被挪到对比层之前就会静默失效
 * (quiet+dark 的 --fg2 会反过来盖住它), 页面上只表现为"次级文字颜色不对",
 * 极难察觉。这里把顺序钉死。
 */
describe('tokens.css 主题微调层', () => {
  it('排在对比层之后 (否则 quiet+dark 会盖掉主题级灰阶覆写)', () => {
    const toneQuietDark = TOKENS.indexOf(".vg[data-tone='quiet'][data-mode='dark']");
    const inkTweak = TOKENS.lastIndexOf(".vg[data-theme='ink'][data-mode='dark']");

    expect(toneQuietDark).toBeGreaterThan(-1);
    expect(inkTweak).toBeGreaterThan(toneQuietDark);
  });

  it('ink 暗色用暖灰次级文字, 不用全主题共用的冷灰', () => {
    // 微调层里的 ink 块 (lastIndexOf 取到的是第 6 段那份, 不是主题矩阵那份)
    const inkTweak = TOKENS.slice(TOKENS.lastIndexOf(".vg[data-theme='ink'][data-mode='dark']"));
    const block = inkTweak.slice(0, inkTweak.indexOf('}'));

    expect(block).toMatch(/--fg2:\s*#c4bcae/);
    expect(block).toMatch(/--fg3:\s*#a09a8e/);

    // 冷灰基座本身没被动过 (其余 9 套主题仍用它)
    expect(TOKENS).toMatch(/--fg2:\s*#b9c0ca/);
    expect(TOKENS).toMatch(/--fg3:\s*#a3abb8/);
  });
});

/**
 * 语义色种子 (--ok / --warn / --red) 随主题走, 不再是全主题共用的一枚。
 *
 * 漏给任一组合不会回落到某个默认值 —— CSS 自定义属性没有继承兜底, 组件层
 * 的 .vg-badge / .vg-state 会直接吃到空值变透明, 页面上表现为"徽章没了",
 * 而不是"颜色不对"。20 种组合逐一断言, 新增主题时这里会立刻红。
 */
describe('tokens.css 语义色矩阵', () => {
  const SEEDS = ['--ok', '--warn', '--red'] as const;

  it.each(VOYAGE_THEMES.flatMap((t) => VOYAGE_MODES.map((m) => [t, m] as const)))(
    '%s x %s 三枚语义种子色齐备',
    (theme, mode) => {
      const block = themeBlocks(theme, mode);
      expect(block).not.toBe('');

      for (const seed of SEEDS) {
        // 值必须是实打实的颜色字面量, 不能是空值或悬空的 var() 引用
        expect(block).toMatch(new RegExp(`${seed}:\\s*(#[0-9a-f]{3,8}|rgba?\\()`, 'i'));
      }
    },
  );

  it('语义色已迁出明暗基座 (第 1 段只剩灰阶与数据类型色)', () => {
    const modeBase = TOKENS.slice(0, TOKENS.indexOf("2. 主题矩阵"));

    for (const seed of SEEDS) {
      expect(modeBase).not.toMatch(new RegExp(`${seed}:`));
    }
    // 灰阶与数据类型色仍留在基座
    expect(modeBase).toMatch(/--fg:/);
    expect(modeBase).toMatch(/--uuid:/);
  });

  it('染色底与彩色文字由有效变量层从种子色推导', () => {
    const effective = TOKENS.slice(TOKENS.indexOf('3. 有效变量层'));

    for (const seed of SEEDS) {
      expect(effective).toMatch(new RegExp(`${seed}-bg:\\s*color-mix\\(.*var\\(${seed}\\)`));
      expect(effective).toMatch(new RegExp(`${seed}-fg:\\s*color-mix\\(.*var\\(${seed}\\)`));
    }
  });

  /** slate 是 quarry 基准: 推导公式复现不出原值, 这几位必须手写保真 */
  it('slate 的 ok/red 仍是 quarry 原版实测值', () => {
    expect(themeBlocks('slate', 'dark')).toMatch(/--ok:\s*#8fb48c/);
    expect(themeBlocks('slate', 'dark')).toMatch(/--ok-bg:\s*#232f24/);
    expect(themeBlocks('slate', 'dark')).toMatch(/--red:\s*#c0504a/);
    expect(themeBlocks('slate', 'dark')).toMatch(/--red-bg:\s*#3a2222/);
    expect(themeBlocks('slate', 'dark')).toMatch(/--red-fg:\s*#e79a93/);
    expect(themeBlocks('slate', 'light')).toMatch(/--ok:\s*#4f7a48/);
    expect(themeBlocks('slate', 'light')).toMatch(/--red:\s*#b23b34/);
  });

  /** github 是 evolve GUI 基准 (yiminlab#406): 逐值对齐它既有的 Primer 配色 */
  it('github 逐值对齐 evolve 的 Primer 配色', () => {
    const dark = themeBlocks('github', 'dark');
    expect(dark).toMatch(/--bg0:\s*#0d1117/);
    expect(dark).toMatch(/--bg1:\s*#161b22/);
    expect(dark).toMatch(/--bg2:\s*#1c2128/);
    expect(dark).toMatch(/--line:\s*#30363d/);
    expect(dark).toMatch(/--accent:\s*#58a6ff/); // 链接蓝, 非按钮蓝 #1f6feb
    expect(dark).toMatch(/--ok:\s*#3fb950/);
    expect(dark).toMatch(/--warn:\s*#d29922/);
    expect(dark).toMatch(/--red:\s*#f85149/);

    const light = themeBlocks('github', 'light');
    expect(light).toMatch(/--accent:\s*#2563eb/);
    expect(light).toMatch(/--ok:\s*#17803d/);
    expect(light).toMatch(/--warn:\s*#92610a/);
    expect(light).toMatch(/--red:\s*#b32d2d/);
  });
});
