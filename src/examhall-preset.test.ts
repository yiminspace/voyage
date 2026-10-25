import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it } from 'vitest';

import {
  VOYAGE_APP_DEFAULTS,
  VOYAGE_EXAM_CONTRASTS,
  VOYAGE_EXAM_TEXT_SIZES,
  VOYAGE_PRESETS,
  VOYAGE_STYLES,
  VOYAGE_THEMES,
  VOYAGE_VERSION,
  loadVoyagePrefs,
  saveVoyagePrefs,
  voyageExamAttrs,
  voyagePresetPrefs,
  type VoyageExamContrast,
  type VoyageExamTextSize,
} from './index';

const SRC_DIR = path.dirname(fileURLToPath(import.meta.url));
const TOKENS = readFileSync(path.join(SRC_DIR, '../tokens.css'), 'utf-8');
const VOYAGE_CSS = readFileSync(path.join(SRC_DIR, '../voyage.css'), 'utf-8');
const PACKAGE = JSON.parse(readFileSync(path.join(SRC_DIR, '../package.json'), 'utf-8')) as { version: string };

/** 取某个 selector 声明的全部块 (同一 selector 可拆成多块写) */
function blocks(source: string, selector: string): string {
  const out: string[] = [];
  let from = 0;
  for (;;) {
    const at = source.indexOf(`${selector} {`, from);
    if (at === -1) break;
    const open = source.indexOf('{', at);
    const close = source.indexOf('}', open);
    out.push(source.slice(open + 1, close));
    from = close;
  }
  return out.join('\n');
}

beforeEach(() => {
  window.localStorage.clear();
});

describe('examhall preset', () => {
  it('公开 Prism 的应用默认组合', () => {
    expect(VOYAGE_APP_DEFAULTS.prism).toEqual({
      theme: 'examhall',
      mode: 'light',
      style: 'plain',
      tone: 'crisp',
    });
  });

  it('examhall 进入主题轴, plain 进入风格轴', () => {
    expect(VOYAGE_THEMES).toContain('examhall');
    expect(VOYAGE_STYLES).toContain('plain');
  });

  it('策展卡固定 examhall × plain × crisp, 明暗跟随全局', () => {
    const preset = VOYAGE_PRESETS.find(({ id }) => id === 'examhall');
    expect(preset).toMatchObject({
      label: { zh: '考场', en: 'Exam Hall' },
      hint: { zh: '白底黑字的机考界面', en: 'Plain computer-based test screen' },
      theme: 'examhall',
      style: 'plain',
      tone: 'crisp',
    });
    expect(voyagePresetPrefs(preset!, 'dark')).toEqual({
      theme: 'examhall',
      mode: 'dark',
      style: 'plain',
      tone: 'crisp',
    });
  });

  it('存下的 examhall × plain 偏好可以读回', () => {
    saveVoyagePrefs(VOYAGE_APP_DEFAULTS.prism, 'prism:vg_prefs');
    expect(loadVoyagePrefs(VOYAGE_APP_DEFAULTS.engram, 'prism:vg_prefs')).toEqual(VOYAGE_APP_DEFAULTS.prism);
  });

  it('VOYAGE_VERSION 与 package.json 同步', () => {
    expect(VOYAGE_VERSION).toBe(PACKAGE.version);
  });
});

describe('voyageExamAttrs', () => {
  it('缺省是黑字白底 + Regular, 四轴写死', () => {
    expect(voyageExamAttrs()).toEqual({
      className: 'vg vg-exam',
      'data-theme': 'examhall',
      'data-mode': 'light',
      'data-style': 'plain',
      'data-tone': 'crisp',
      'data-exam-contrast': 'black-on-white',
      'data-exam-text': 'regular',
    });
  });

  it('黄字黑底 + Large 走深色模式', () => {
    expect(voyageExamAttrs({ contrast: 'yellow-on-black', text: 'large' })).toEqual({
      className: 'vg vg-exam',
      'data-theme': 'examhall',
      'data-mode': 'dark',
      'data-style': 'plain',
      'data-tone': 'crisp',
      'data-exam-contrast': 'yellow-on-black',
      'data-exam-text': 'large',
    });
  });

  it.each([
    ['black-on-white', 'light'],
    ['white-on-black', 'dark'],
    ['yellow-on-black', 'dark'],
  ] as const)('%s → data-mode=%s', (contrast, mode) => {
    expect(voyageExamAttrs({ contrast })['data-mode']).toBe(mode);
  });

  it('不合法的取值逐项回落到缺省', () => {
    const stale = { contrast: 'neon-on-grey' as VoyageExamContrast, text: 'huge' as VoyageExamTextSize };
    expect(voyageExamAttrs(stale)).toMatchObject({
      'data-mode': 'light',
      'data-exam-contrast': 'black-on-white',
      'data-exam-text': 'regular',
    });
    expect(voyageExamAttrs({ contrast: 'white-on-black', text: 'huge' as VoyageExamTextSize })).toMatchObject({
      'data-mode': 'dark',
      'data-exam-contrast': 'white-on-black',
      'data-exam-text': 'regular',
    });
  });

  it('取值顺序就是 Options 的顺序, 首项是缺省', () => {
    expect(VOYAGE_EXAM_CONTRASTS).toEqual(['black-on-white', 'white-on-black', 'yellow-on-black']);
    expect(VOYAGE_EXAM_TEXT_SIZES).toEqual(['regular', 'large', 'x-large']);
  });

  it('每档对比度和字号在 tokens.css 里都有对应的考场层规则', () => {
    expect(TOKENS).toContain(".vg.vg-exam[data-mode='dark'][data-exam-contrast='yellow-on-black']");
    expect(TOKENS).toContain(".vg-exam[data-exam-text='large'] { --vg-exam-text: 1.1875rem; }");
    expect(TOKENS).toContain(".vg-exam[data-exam-text='x-large'] { --vg-exam-text: 1.375rem; }");
    expect(blocks(TOKENS, '.vg-exam')).toMatch(/--vg-exam-text:\s*1rem;/);
  });
});

describe('examhall / plain token 源码', () => {
  const light = blocks(TOKENS, ".vg[data-theme='examhall'][data-mode='light']");
  const dark = blocks(TOKENS, ".vg[data-theme='examhall'][data-mode='dark']");

  it('light 的说明条底、禁用步进底、说明条边框与参照值一致', () => {
    expect(light).toMatch(/--bg0:#ffffff/);
    expect(light).toMatch(/--bg2:#f1f2ec/);
    expect(light).toMatch(/--bg3:#dddddd/);
    expect(light).toMatch(/--line:#d5d5d5/);
    expect(light).toMatch(/--fg:\s*#000000/);
  });

  it('实心按钮是墨色, 控件边框改用 border-strong', () => {
    for (const block of [light, dark]) {
      expect(block).toMatch(/--fill-grad:\s*var\(--fg\)/);
      expect(block).toMatch(/--fill-ink:\s*var\(--bg1\)/);
      expect(block).toMatch(/--line2-c:\s*var\(--vg-color-border-strong\)/);
    }
  });

  it('plain: 控件 3px / 窗口 4px, 无阴影、发光和模糊, 表头不转大写', () => {
    const plain = blocks(TOKENS, ".vg[data-style='plain']");
    expect(plain).toMatch(/--r-win:\s*4px/);
    expect(plain).toMatch(/--r-btn:\s*3px/);
    expect(plain).toMatch(/--btn-pad:\s*8px 15px/);
    expect(plain).toMatch(/--btn-sh:\s*none/);
    expect(plain).toMatch(/--glow:\s*none/);
    expect(plain).toMatch(/--blur:\s*none/);
    expect(plain).not.toMatch(/--th-tt/);
  });

  it('五个通用 token 在有效变量层有缺省值, 焦点环沿用 0.16 的公式', () => {
    const effective = blocks(TOKENS, '.vg');
    expect(effective).toMatch(/--vg-color-focus:\s*color-mix\(in srgb, var\(--acc\) 70%, transparent\)/);
    for (const token of [
      '--vg-color-border-strong', '--vg-color-mark', '--vg-color-mark-text', '--vg-color-flag',
      '--vg-color-danger-solid', '--vg-color-danger-solid-text',
    ]) {
      expect(effective).toMatch(new RegExp(`${token}:\\s*\\S`));
    }
  });

  it('焦点环改用 --vg-color-focus, 只有 examhall 偏移 2px', () => {
    expect(VOYAGE_CSS).toMatch(/\.vg :focus-visible \{\s*outline: 2px solid var\(--vg-color-focus\);\s*outline-offset: 1px;/);
    expect(VOYAGE_CSS).toContain(".vg[data-theme='examhall'] :focus-visible { outline-offset: 2px; }");
  });
});
