import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REACT_SRC_DIR = path.dirname(fileURLToPath(import.meta.url));
const VOYAGE_CSS_PATH = path.join(REACT_SRC_DIR, '../../voyage.css');
const SWITCHER_CSS_MARKER = '/* ---- 主题切换器 (VoyageSwitcher, @yiminlab/voyage/react) ---- */';

// 字面量色值: #xxx / #xxxxxx 十六进制, 或 rgb(...) / rgba(...)
const LITERAL_COLOR = /#[0-9a-fA-F]{3,8}\b|rgba?\(/;

describe('VoyageSwitcher 样式约束: 可见颜色只能引用 tokens 变量', () => {
  it('src/react 源码不出现字面量色值', () => {
    const sourceFiles = (directory: string): string[] => readdirSync(directory, { withFileTypes: true })
      .flatMap((entry) => entry.isDirectory()
        ? sourceFiles(path.join(directory, entry.name))
        : [path.join(directory, entry.name)])
      .filter((file) => /\.(ts|tsx)$/.test(file) && !file.endsWith('.test.ts') && !file.endsWith('.test.tsx'));
    const files = sourceFiles(REACT_SRC_DIR);
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const content = readFileSync(file, 'utf-8');
      expect(content, `${path.relative(REACT_SRC_DIR, file)} 不应包含字面量色值 (#xxx / rgb())`).not.toMatch(LITERAL_COLOR);
    }
  });

  it('voyage.css 中 VoyageSwitcher 新增区块不出现字面量色值', () => {
    const content = readFileSync(VOYAGE_CSS_PATH, 'utf-8');
    const markerIndex = content.indexOf(SWITCHER_CSS_MARKER);
    expect(markerIndex, 'voyage.css 应包含 VoyageSwitcher 样式区块').toBeGreaterThan(-1);

    const switcherCss = content.slice(markerIndex);
    expect(switcherCss).not.toMatch(LITERAL_COLOR);
  });
});
