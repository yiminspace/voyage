/**
 * 考场层 (examhall × plain × crisp + .vg-exam) 的运行时契约。
 *
 * 颜色全部在真实排版引擎里求值后再断言: 把 token 喂给探针元素的 color,
 * 读计算值 (jsdom 不解析 var(), 读源码也看不出 color-mix / 覆写链的最终结果)。
 * 对比度门槛与精确值见 README「考场层」。
 */
import { expect, test, type Locator, type Page } from '@playwright/test';
import { VOYAGE_EXAM_CONTRASTS, type VoyageExamContrast } from '../src';

const DEMO_URL = 'http://127.0.0.1:4173/demo/exam-tokens.html';

const CONTRAST_LABELS: Record<VoyageExamContrast, string> = {
  'black-on-white': 'Black on white',
  'white-on-black': 'White on black',
  'yellow-on-black': 'Yellow on black',
};

type Rgb = [number, number, number];

function toRgb(value: string): Rgb {
  const nums = value.match(/[\d.]+/g);
  if (!nums || nums.length < 3) throw new Error(`解析不了颜色: "${value}"`);
  const [r, g, b] = nums.slice(0, 3).map(Number);
  return value.startsWith('color(') ? [r * 255, g * 255, b * 255] : [r, g, b];
}

function hex(value: string): Rgb {
  return [1, 3, 5].map((at) => Number.parseInt(value.slice(at, at + 2), 16)) as Rgb;
}

function luminance([r, g, b]: Rgb): number {
  const channel = (v: number) => {
    const n = v / 255;
    return n <= 0.04045 ? n / 12.92 : ((n + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

function contrast(a: Rgb, b: Rgb): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** 在 host 内读一组自定义属性的计算色 (哨兵 rgb(1,2,3) = 变量不存在) */
async function readColors(host: Locator, names: readonly string[]): Promise<Record<string, Rgb>> {
  const raw = await host.evaluate((element, vars) => {
    const probe = document.createElement('span');
    element.appendChild(probe);
    try {
      return Object.fromEntries(vars.map((name) => {
        probe.style.color = '';
        probe.style.color = `var(${name}, rgb(1, 2, 3))`;
        return [name, getComputedStyle(probe).color];
      }));
    } finally {
      probe.remove();
    }
  }, names as string[]);
  return Object.fromEntries(Object.entries(raw).map(([name, value]) => [name, toRgb(value)]));
}

const exam = (token: string) => `--vg-exam-${token}`;

/** 每档配色的精确值: light 的 panel / rule / solid / step-off 与参照机考界面实测一致 */
const EXPECTED: Record<VoyageExamContrast, Record<string, string>> = {
  'black-on-white': {
    paper: '#ffffff', ink: '#000000', muted: '#5b5b5b', subtle: '#686868',
    panel: '#f1f2ec', hover: '#dddddd', rule: '#d5d5d5', field: '#767676',
    focus: '#2f78ad', link: '#22669c', solid: '#000000', 'solid-ink': '#ffffff',
    'step-off': '#dddddd', 'step-off-ink': '#5b5b5b', current: '#000000', done: '#000000', todo: '#767676',
    flag: '#a35f00', mark: '#fff200', 'mark-ink': '#000000', alert: '#b3261e', 'alert-ink': '#ffffff',
    ok: '#17633c', 'ok-bg': '#e7f3eb', bad: '#923a2c', 'bad-bg': '#f9e9e5', part: '#755400', 'part-bg': '#fff2cc',
  },
  'white-on-black': {
    paper: '#000000', ink: '#ffffff', muted: '#d6d6d6', subtle: '#b8b8b8',
    panel: '#262626', hover: '#333333', rule: '#555555', field: '#b0b0b0',
    focus: '#89c8ff', link: '#a6d6ff', solid: '#ffffff', 'solid-ink': '#000000',
    'step-off': '#333333', 'step-off-ink': '#d6d6d6', current: '#ffffff', done: '#ffffff', todo: '#b0b0b0',
    flag: '#f0a840', mark: '#ffea00', 'mark-ink': '#000000', alert: '#ff9088', 'alert-ink': '#000000',
    ok: '#6fdc98', 'ok-bg': '#0e2a18', bad: '#ff9088', 'bad-bg': '#3a1412', part: '#f2bd5c', 'part-bg': '#33250a',
  },
  'yellow-on-black': {
    paper: '#000000', ink: '#ffea00', muted: '#e5d65c', subtle: '#d6c64e',
    panel: '#232323', hover: '#303030', rule: '#6b6420', field: '#d9c84a',
    focus: '#ffffff', link: '#ffea00', solid: '#ffea00', 'solid-ink': '#000000',
    'step-off': '#303030', 'step-off-ink': '#e5d65c', current: '#ffea00', done: '#ffea00', todo: '#d9c84a',
    flag: '#ffffff', mark: '#ffffff', 'mark-ink': '#000000', alert: '#ffffff', 'alert-ink': '#000000',
    ok: '#7ae6a2', 'ok-bg': '#0e2a18', bad: '#ffa098', 'bad-bg': '#3a1412', part: '#ffc970', 'part-bg': '#33250a',
  },
};

/** [前景, 背景, 门槛]: 正文 7, 文字 4.5, 非文字 3 (WCAG 1.4.3 / 1.4.6 / 1.4.11) */
const CONTRAST_PAIRS: ReadonlyArray<[string, string, number]> = [
  ['ink', 'paper', 7], ['ink', 'panel', 7],
  ['muted', 'paper', 4.5], ['muted', 'panel', 4.5], ['muted', 'hover', 4.5],
  ['subtle', 'paper', 4.5], ['subtle', 'panel', 4.5],
  ['link', 'paper', 4.5], ['link', 'panel', 4.5],
  ['field', 'paper', 3], ['field', 'panel', 3], ['todo', 'paper', 3],
  ['focus', 'paper', 3], ['focus', 'panel', 3],
  ['solid-ink', 'solid', 7], ['solid', 'paper', 3],
  ['step-off-ink', 'step-off', 4.5],
  ['mark-ink', 'mark', 7],
  ['flag', 'paper', 3], ['flag', 'panel', 3],
  ['ok', 'ok-bg', 4.5], ['bad', 'bad-bg', 4.5], ['part', 'part-bg', 4.5],
  ['ok-line', 'paper', 3], ['bad-line', 'paper', 3],
  ['alert-ink', 'alert', 4.5], ['alert', 'paper', 3],
];

const EXAM_TOKEN_NAMES = [
  ...new Set([...Object.keys(EXPECTED['black-on-white']), ...CONTRAST_PAIRS.flatMap(([a, b]) => [a, b])]),
].map(exam);

async function chooseContrast(page: Page, contrast: VoyageExamContrast) {
  await page.getByRole('radio', { name: CONTRAST_LABELS[contrast], exact: true }).check();
  await expect(page.locator('#exam-root')).toHaveAttribute('data-exam-contrast', contrast);
}

test.beforeEach(async ({ page }) => {
  await page.goto(DEMO_URL);
  await expect(page.locator('#exam-root')).toBeVisible();
});

test.describe('考场根节点', () => {
  test('由 voyageExamAttrs 写死四轴, 缺省黑字白底 + Regular', async ({ page }) => {
    const root = page.locator('#exam-root');
    await expect(root).toHaveClass(/\bvg\b.*\bvg-exam\b/);
    await expect(root).toHaveAttribute('data-theme', 'examhall');
    await expect(root).toHaveAttribute('data-mode', 'light');
    await expect(root).toHaveAttribute('data-style', 'plain');
    await expect(root).toHaveAttribute('data-tone', 'crisp');
    await expect(root).toHaveAttribute('data-exam-contrast', 'black-on-white');
    await expect(root).toHaveAttribute('data-exam-text', 'regular');

    const style = await root.evaluate((element) => {
      const computed = getComputedStyle(element);
      return { font: computed.fontFamily, scheme: computed.colorScheme };
    });
    expect(style.font.replace(/["']/g, '')).toMatch(/^Arial, Helvetica, Liberation Sans, Arimo\b/);
    expect(style.scheme.split(' ').sort()).toEqual(['light', 'only']);
  });

  test('黑字白底下说明条、Next 与首题 Previous 的计算色等于参照值', async ({ page }) => {
    const read = (selector: string) => page.locator(selector).evaluate((element) => {
      const style = getComputedStyle(element);
      return { background: style.backgroundColor, border: style.borderTopColor, color: style.color };
    });

    const rubric = await read('#exam-rubric');
    expect(toRgb(rubric.background)).toEqual(hex('#f1f2ec'));
    expect(toRgb(rubric.border)).toEqual(hex('#d5d5d5'));

    const next = await read('#exam-next');
    expect(toRgb(next.background)).toEqual(hex('#000000'));
    expect(toRgb(next.color)).toEqual(hex('#ffffff'));

    const previous = await read('#exam-previous');
    expect(toRgb(previous.background)).toEqual(hex('#dddddd'));

    const root = await read('#exam-root');
    expect(toRgb(root.background)).toEqual(hex('#ffffff'));
    expect(toRgb(root.color)).toEqual(hex('#000000'));
  });

  for (const contrastName of VOYAGE_EXAM_CONTRASTS) {
    test(`${contrastName}: token 精确值与 WCAG 门槛`, async ({ page }) => {
      await chooseContrast(page, contrastName);
      const root = page.locator('#exam-root');
      await expect(root).toHaveAttribute('data-mode', contrastName === 'black-on-white' ? 'light' : 'dark');

      const colors = await readColors(root, EXAM_TOKEN_NAMES);
      for (const name of EXAM_TOKEN_NAMES) {
        expect(colors[name], `${contrastName} 缺少 ${name}`).not.toEqual([1, 2, 3]);
      }
      for (const [token, value] of Object.entries(EXPECTED[contrastName])) {
        expect(colors[exam(token)], `${contrastName} 的 ${exam(token)}`).toEqual(hex(value));
      }
      const mark = await page.locator('#exam-root mark.vg-exam-mark').evaluate((element) => {
        const computed = getComputedStyle(element);
        return { background: computed.backgroundColor, color: computed.color };
      });
      expect(toRgb(mark.background)).toEqual(hex(EXPECTED[contrastName].mark));
      expect(toRgb(mark.color)).toEqual(hex(EXPECTED[contrastName]['mark-ink']));

      for (const [foreground, background, minimum] of CONTRAST_PAIRS) {
        const ratio = contrast(colors[exam(foreground)], colors[exam(background)]);
        expect(ratio, `${contrastName}: ${foreground} / ${background} = ${ratio.toFixed(2)}`)
          .toBeGreaterThanOrEqual(minimum);
      }
    });
  }

  test('三档字号: Regular 16 / Large 19 / Extra large 22', async ({ page }) => {
    const root = page.locator('#exam-root');
    const gap = page.locator('#exam-gap-1');
    for (const [label, value, px] of [
      ['Large', 'large', '19px'],
      ['Extra large', 'x-large', '22px'],
      ['Regular', 'regular', '16px'],
    ] as const) {
      await page.getByRole('radio', { name: label, exact: true }).check();
      await expect(root).toHaveAttribute('data-exam-text', value);
      expect(await root.evaluate((element) => getComputedStyle(element).fontSize)).toBe(px);
      expect(await gap.evaluate((element) => getComputedStyle(element).fontSize)).toBe(px);
    }
  });

  test('黄字黑底覆写只在考场根节点 + dark 上生效', async ({ page }) => {
    await chooseContrast(page, 'yellow-on-black');
    const root = page.locator('#exam-root');
    expect((await readColors(root, ['--vg-exam-ink']))['--vg-exam-ink']).toEqual(hex('#ffea00'));

    // 同一组属性落在 mode=light 上不成立, 覆写不应生效
    await root.evaluate((element) => element.setAttribute('data-mode', 'light'));
    expect((await readColors(root, ['--vg-exam-ink']))['--vg-exam-ink']).toEqual(hex('#000000'));
  });

  test('焦点环: examhall 下 2px 实色、偏移 2px', async ({ page }) => {
    for (const contrastName of VOYAGE_EXAM_CONTRASTS) {
      await chooseContrast(page, contrastName);
      const gap = page.locator('#exam-gap-1');
      await gap.focus();
      const outline = await gap.evaluate((element) => {
        const style = getComputedStyle(element);
        return { width: style.outlineWidth, offset: style.outlineOffset, color: style.outlineColor, style: style.outlineStyle };
      });
      expect(outline).toMatchObject({ width: '2px', offset: '2px', style: 'solid' });
      expect(toRgb(outline.color)).toEqual(hex(EXPECTED[contrastName].focus));
    }
  });
});

test.describe('examhall 与外层的隔离', () => {
  const EXAM_SAMPLE = ['ink', 'paper', 'panel', 'solid', 'field', 'focus', 'link'].map(exam);
  const DAILY_SAMPLE = [
    '--fg', '--fg2', '--fg3', '--acc-text', '--fill-grad', '--fill-ink',
    '--vg-color-border', '--vg-color-focus', '--vg-color-mark',
  ];

  for (const mode of ['light', 'dark'] as const) {
    test(`${mode}: tone 轴改不动 examhall 的文字、实心钮与边框`, async ({ page }) => {
      const html = page.locator('html');
      const root = page.locator('#exam-root');
      const samples: string[] = [];
      for (const tone of ['normal', 'quiet', 'crisp'] as const) {
        await html.evaluate((element, next) => {
          element.setAttribute('data-mode', next.mode);
          element.setAttribute('data-tone', next.tone);
        }, { mode, tone });
        await root.evaluate((element, next) => element.setAttribute('data-tone', next), tone);
        samples.push(JSON.stringify({
          daily: await readColors(html, DAILY_SAMPLE),
          exam: await readColors(root, EXAM_SAMPLE),
        }));
      }
      expect(new Set(samples).size, samples.join('\n')).toBe(1);
    });
  }

  test('日常界面: 控件边框 ≥3:1, 实心钮是墨色, 文字三级达标', async ({ page }) => {
    for (const mode of ['light', 'dark'] as const) {
      await page.locator('html').evaluate((element, next) => element.setAttribute('data-mode', next), mode);
      const colors = await readColors(page.locator('html'), ['--bg1', '--fg', '--fg2', '--fg3', '--vg-color-border-strong']);
      expect(contrast(colors['--fg'], colors['--bg1'])).toBeGreaterThanOrEqual(7);
      expect(contrast(colors['--fg2'], colors['--bg1'])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(colors['--fg3'], colors['--bg1'])).toBeGreaterThanOrEqual(4.5);
      expect(contrast(colors['--vg-color-border-strong'], colors['--bg1'])).toBeGreaterThanOrEqual(3);

      const input = await page.locator('#daily-input').evaluate((element) => getComputedStyle(element).borderTopColor);
      expect(toRgb(input)).toEqual(colors['--vg-color-border-strong']);

      const primary = await page.locator('#daily-surface .vg-btn.primary').evaluate((element) => {
        const style = getComputedStyle(element);
        return { background: style.backgroundColor, color: style.color };
      });
      expect(toRgb(primary.background)).toEqual(colors['--fg']);
      expect(toRgb(primary.color)).toEqual(colors['--bg1']);
    }
  });

  test('嵌套的 .vg-exam 不受外层明暗切换与主题预览影响', async ({ page }) => {
    const root = page.locator('#exam-root');
    const before = await readColors(root, EXAM_SAMPLE);

    await page.getByRole('button', { name: 'Switch to dark mode' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark');

    await page.getByRole('button', { name: 'Theme settings' }).click();
    await page.getByRole('menuitemradio', { name: 'Signal' }).hover();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'signal');

    await expect(root).toHaveAttribute('data-theme', 'examhall');
    await expect(root).toHaveAttribute('data-mode', 'light');
    expect(await readColors(root, EXAM_SAMPLE)).toEqual(before);
  });

  test('palette={false} 时工具条只剩明暗钮', async ({ page }) => {
    const toolbar = page.locator('.demo-head .vg-topbar');
    await expect(toolbar.getByRole('button', { name: 'Theme settings' })).toBeVisible();

    await page.getByRole('checkbox', { name: 'Theme palette' }).uncheck();
    await expect(toolbar.getByRole('button', { name: 'Theme settings' })).toHaveCount(0);
    await expect(toolbar.locator('button')).toHaveCount(1);

    await toolbar.getByRole('button', { name: 'Switch to dark mode' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-mode', 'dark');
  });
});
