import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REACT_SRC_DIR = path.dirname(fileURLToPath(import.meta.url));
const VOYAGE_CSS_PATH = path.join(REACT_SRC_DIR, '../../voyage.css');

/** 字面量色值: #RGB / #RRGGBB / #RRGGBBAA, 或 rgb(...) / rgba(...) */
export const LITERAL_COLOR = /#[0-9a-fA-F]{3,8}\b|rgba?\(/;

/** 去掉 CSS 块注释后再判色, 避免 issue #428 一类注释编号误报 */
export function stripCssComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '');
}

export function findLiteralColors(source: string): string[] {
  return stripCssComments(source).match(new RegExp(LITERAL_COLOR, 'g')) ?? [];
}

function listPublishableReactSources(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => entry.isDirectory()
      ? listPublishableReactSources(path.join(directory, entry.name))
      : [path.join(directory, entry.name)])
    .filter((file) => /\.(ts|tsx)$/.test(file) && !/\.test\.(ts|tsx)$/.test(file));
}

describe('组件层颜色门禁: 可见颜色只能引用 Voyage tokens', () => {
  it('注释中的 issue 编号不会被当成十六进制色值', () => {
    expect(findLiteralColors('/* issue #428 */ .x { color: var(--fg); }')).toEqual([]);
    expect(findLiteralColors('/* #fff in comment */ .x { color: var(--ok); }')).toEqual([]);
  });

  it('任意区段的字面量色值都会被检出 (含 VoyageSwitcher 标记之前)', () => {
    expect(findLiteralColors('.vg-dot.ok { background: #4e9a6b; }')).toEqual(['#4e9a6b']);
    expect(findLiteralColors('.vg-modal { background: rgba(0, 0, 0, 0.5); }')).toEqual(['rgba(']);
    expect(findLiteralColors('.early { color: #fff; }\n/* ---- 主题切换器 ---- */\n.late { color: var(--fg); }'))
      .toEqual(['#fff']);
  });

  it('src/react 可发布源码不出现字面量色值 (测试 fixture 除外)', () => {
    const files = listPublishableReactSources(REACT_SRC_DIR);
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      expect(
        findLiteralColors(content),
        `${path.relative(REACT_SRC_DIR, file)} 不应包含字面量色值 (#xxx / rgb())`,
      ).toEqual([]);
    }
  });

  it('完整 voyage.css 不出现字面量色值 (token 定义层 tokens.css 除外)', () => {
    const content = readFileSync(VOYAGE_CSS_PATH, 'utf-8');
    expect(findLiteralColors(content), 'voyage.css 任意区段不应含字面量色值').toEqual([]);
  });
});
