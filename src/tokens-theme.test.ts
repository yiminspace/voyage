import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const SRC_DIR = path.dirname(fileURLToPath(import.meta.url));
const TOKENS = readFileSync(path.join(SRC_DIR, '../tokens.css'), 'utf-8');

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
