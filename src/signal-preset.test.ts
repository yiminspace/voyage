import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  VOYAGE_APP_DEFAULTS,
  VOYAGE_PRESETS,
  VOYAGE_THEMES,
  voyagePresetPrefs,
} from './index';

const SRC_DIR = path.dirname(fileURLToPath(import.meta.url));
const TOKENS = readFileSync(path.join(SRC_DIR, '../tokens.css'), 'utf-8');

function themeBlocks(mode: 'dark' | 'light'): string {
  const selector = `.vg[data-theme='signal'][data-mode='${mode}']`;
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

describe('Signal preset', () => {
  it('公开 Skillloom 的亮色默认组合', () => {
    expect(VOYAGE_APP_DEFAULTS.skillloom).toEqual({
      theme: 'signal',
      mode: 'light',
      style: 'classic',
      tone: 'quiet',
    });
  });

  it('把 signal 纳入合法主题和策展 preset', () => {
    expect(VOYAGE_THEMES).toContain('signal');

    const preset = VOYAGE_PRESETS.find(({ id }) => id === 'signal');
    expect(preset).toMatchObject({
      label: { zh: '信号', en: 'Signal' },
      hint: { zh: '纯黑白工作台', en: 'Pure black-and-white workbench' },
      theme: 'signal',
      style: 'classic',
      tone: 'quiet',
    });
    expect(voyagePresetPrefs(preset!, 'dark')).toEqual({
      theme: 'signal',
      mode: 'dark',
      style: 'classic',
      tone: 'quiet',
    });
  });

  it('亮色主表面是纯白，其余层级为中性灰', () => {
    const light = themeBlocks('light');
    expect(light).toMatch(/--bg0:\s*#ffffff/);
    expect(light).toMatch(/--bg1:\s*#ffffff/);
    expect(light).toMatch(/--bg2:\s*#f5f5f5/);
    expect(light).toMatch(/--bg3:\s*#ebebeb/);
    expect(light).toMatch(/--line:\s*#dedede/);
    expect(light).toMatch(/--line2:\s*#c6c6c6/);
    expect(light).toMatch(/--fg:\s*#111111/);
    expect(light).toMatch(/--fg2:\s*#505050/);
    expect(light).toMatch(/--fg3:\s*#767676/);
    expect(light).toMatch(/--accent:\s*#2563eb/);
    expect(light).toMatch(/--accent-hi:\s*#3b82f6/);
    expect(light).toMatch(/--accent-ink:\s*#ffffff/);
    expect(light).toMatch(/--app-img:\s*none/);
  });

  it('暗色主表面是纯黑，其余层级为中性灰', () => {
    const dark = themeBlocks('dark');
    expect(dark).toMatch(/--bg0:\s*#000000/);
    expect(dark).toMatch(/--bg1:\s*#000000/);
    expect(dark).toMatch(/--bg2:\s*#101010/);
    expect(dark).toMatch(/--bg3:\s*#1b1b1b/);
    expect(dark).toMatch(/--line:\s*#282828/);
    expect(dark).toMatch(/--line2:\s*#3b3b3b/);
    expect(dark).toMatch(/--fg:\s*#f5f5f5/);
    expect(dark).toMatch(/--fg2:\s*#c8c8c8/);
    expect(dark).toMatch(/--fg3:\s*#929292/);
    expect(dark).toMatch(/--accent:\s*#58a6ff/);
    expect(dark).toMatch(/--accent-hi:\s*#79c0ff/);
    expect(dark).toMatch(/--accent-ink:\s*#0a1220/);
    expect(dark).toMatch(/--app-img:\s*none/);
  });
});
