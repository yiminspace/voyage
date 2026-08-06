/**
 * 语义色矩阵的运行时契约 —— tokens-theme.test.ts 只能读源码断言"写了没有",
 * 读不出 `color-mix()` 最终算成什么颜色 (jsdom 不实现 color-mix, 拿到的是
 * 原样字符串)。而语义色的坑恰恰全在计算结果上:
 *
 *   1. 推导链断了 —— 种子色漏给时 color-mix 整条失效, 计算值为空字符串,
 *      徽章直接变透明;
 *   2. 三档语义糊在一起 —— ok / warn / red 在某套主题下彼此太近, 用户分不清
 *      "通过"和"失败"。
 *
 * 这两件事只有真实排版引擎能验, 所以放在 e2e。
 */
import { test, expect, type Page } from '@playwright/test';
import { pathToFileURL } from 'node:url';
import path from 'node:path';

const DEMO_URL = pathToFileURL(
  path.resolve(__dirname, '../demo/fitting-room.html')
).href;

const THEMES = [
  'slate', 'ink', 'github', 'nord', 'tokyo',
  'catppuccin', 'onedark', 'solarized', 'rosepine', 'everforest', 'iris',
] as const;
const MODES = ['dark', 'light'] as const;

/** 语义色的完整六位: 三枚种子 + 各自推导出的染色底与彩色文字 */
const SEMANTIC_VARS = [
  '--ok', '--ok-bg', '--ok-fg',
  '--warn', '--warn-bg', '--warn-fg',
  '--red', '--red-bg', '--red-fg',
] as const;

/**
 * 读一个 theme x mode 组合下全部语义色的**计算值**。
 *
 * 关键: 不能直接 getComputedStyle(el).getPropertyValue('--ok') —— 自定义属性
 * 的计算值就是它的 token 序列本身, hex 原样返回、color-mix() 也原样返回, 什么
 * 都没求值。必须把变量喂给一个真实的颜色属性 (这里用探针元素的 color), 让排版
 * 引擎实际解析一遍, 再读那个属性的计算值, 才拿得到 rgb()。
 */
async function sampleSemantics(page: Page, theme: string, mode: string) {
  return page.evaluate(
    ({ theme, mode, vars }) => {
      const el = document.getElementById('semantic');
      if (!el) throw new Error('#semantic 不存在: 试衣间的语义色尺被删了?');
      el.setAttribute('data-theme', theme);
      el.setAttribute('data-mode', mode);

      // 容器显式取 --fg 当正文色 —— 这是宿主里 .vg 容器的真实状态, 也让"变量
      // invalid 时回落到继承色"这件事有确定的落点。不设的话继承的是试衣间外壳
      // 的固定浅色, light 档的塌陷就测不出来 (塌陷后反而离得更远)。
      el.style.color = 'var(--fg)';

      const probe = document.createElement('span');
      el.appendChild(probe);
      const read = (v: string) => {
        probe.style.color = '';
        // 哨兵 fallback: 变量未定义时 color: var(--x) 是 invalid at computed-value
        // time, 会静默回落到继承色 —— 那样"漏给种子色"根本测不出来。给一个真实
        // 配色里不可能出现的 rgb(1,2,3) 当 fallback, 读到它就等于该变量不存在。
        probe.style.color = `var(${v}, rgb(1, 2, 3))`;
        return getComputedStyle(probe).color.trim();
      };

      try {
        return Object.fromEntries(vars.map((v) => [v, read(v)])) as Record<string, string>;
      } finally {
        probe.remove();
      }
    },
    { theme, mode, vars: SEMANTIC_VARS as unknown as string[] }
  );
}

/** 读单个变量的计算值; 主题由调用方先前的 sampleSemantics 设定, 这里不再改 */
async function readVar(page: Page, name: string) {
  return page.evaluate((n) => {
    const el = document.getElementById('semantic')!;
    const probe = document.createElement('span');
    el.appendChild(probe);
    probe.style.color = `var(${n}, rgb(1, 2, 3))`;
    const v = getComputedStyle(probe).color.trim();
    probe.remove();
    return v;
  }, name);
}

/** 把 chromium 的计算值 (rgb() / rgba() / color(srgb ...)) 解析成 0-255 三元组 */
function toRgb(value: string): [number, number, number] {
  const nums = value.match(/[\d.]+/g);
  if (!nums || nums.length < 3) throw new Error(`解析不了颜色: "${value}"`);
  const [r, g, b] = nums.slice(0, 3).map(Number);
  // color(srgb 0.1 0.2 0.3) 走 0-1 归一化, rgb() 走 0-255
  return value.startsWith('color(') ? [r * 255, g * 255, b * 255] : [r, g, b];
}

function distance(a: string, b: string): number {
  const [r1, g1, b1] = toRgb(a);
  const [r2, g2, b2] = toRgb(b);
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2);
}

test.beforeEach(async ({ page }) => {
  await page.goto(DEMO_URL);
});

for (const theme of THEMES) {
  for (const mode of MODES) {
    test.describe(`${theme} x ${mode}`, () => {
      test('九位语义色全部算得出具体颜色 (推导链没断)', async ({ page }) => {
        const got = await sampleSemantics(page, theme, mode);

        for (const v of SEMANTIC_VARS) {
          // 命中哨兵 = 该变量不存在 (种子色漏给会让整条 color-mix 一起失效)
          expect(toRgb(got[v]), `${theme}/${mode} 的 ${v} 没有定义`).not.toEqual([1, 2, 3]);
        }
      });

      test('推导出的彩色文字三档彼此可区分', async ({ page }) => {
        const got = await sampleSemantics(page, theme, mode);

        // 阈值 30: 实测最接近的一对是 solarized/light 的 ok 与 warn (相距 36),
        // 那是 Solarized 色板自身橄榄绿与土黄本就相邻, 不是推导的问题。
        expect(distance(got['--ok-fg'], got['--warn-fg']),
          `${theme}/${mode}: ok/warn 彩色文字塌成同色`).toBeGreaterThan(30);
        expect(distance(got['--ok-fg'], got['--red-fg']),
          `${theme}/${mode}: ok/red 彩色文字塌成同色`).toBeGreaterThan(30);
      });

      test('彩色文字确实带色, 没塌回正文色', async ({ page }) => {
        const got = await sampleSemantics(page, theme, mode);
        const fg = await readVar(page, '--fg');

        // 兜住哨兵漏掉的一类故障: 变量**已定义但值 invalid** (如 color-mix 语法
        // 写错) 时, CSS 是 invalid at computed-value time —— 回落到继承色而不是
        // fallback, 哨兵测不出来。而 .vg 的继承色就是 --fg, 所以塌陷表现为
        // "彩色文字 == 正文色", 距离归零。
        //
        // 只比三档彼此的距离不够: 单独一档塌回正文色时, 它与另外两档的距离反而
        // 更大, 那个断言会放过去 (实测确认)。必须逐档对正文色量。
        //
        // 阈值 40: 正常推导是 82% 种子 + 18% 正文色, 与正文色至少隔 95 (slate
        // light 档最小); slate 手写的 red-fg 也有 118。
        for (const v of ['--ok-fg', '--warn-fg', '--red-fg'] as const) {
          expect(distance(got[v], fg),
            `${theme}/${mode} 的 ${v} 塌回了正文色, 语义丢失`).toBeGreaterThan(40);
        }
      });

      test('染色底相对面色染得出来', async ({ page }) => {
        const got = await sampleSemantics(page, theme, mode);
        const bg1 = await readVar(page, '--bg1');

        // 阈值 12: 最淡的是 slate/dark 的 ok 底 (17) —— 那是 quarry 原版手写值,
        // 本就刻意克制。低于这个数就是染色底和面色糊在一起, 徽章看不见了。
        for (const v of ['--ok-bg', '--warn-bg', '--red-bg'] as const) {
          // github 用半透明叠色 (rgba alpha 0.18), 与面色的差值本就靠 alpha 表达,
          // 不透明度参与不进 RGB 距离, 故跳过
          if (got[v].startsWith('rgba')) continue;
          expect(distance(got[v], bg1),
            `${theme}/${mode} 的 ${v} 与面色几乎同色`).toBeGreaterThan(12);
        }
      });

      test('ok / warn / red 三档彼此可区分', async ({ page }) => {
        const got = await sampleSemantics(page, theme, mode);

        // 阈值 35: 取自当前矩阵里最接近的一对 (solarized 的 ok #859900 与
        // warn #b58900 相距 48) 再留一档余量。RGB 欧氏距离会低估色相差异,
        // 所以这是个宽松下界 —— 它拦的是"手滑写成同一个色"这类硬伤,
        // 观感层面的接近仍需在试衣间人工过色。
        expect(distance(got['--ok'], got['--red']),
          `${theme}/${mode}: 成功色与失败色太近, 用户分不清`).toBeGreaterThan(35);
        expect(distance(got['--ok'], got['--warn']),
          `${theme}/${mode}: 成功色与警告色太近`).toBeGreaterThan(35);
        expect(distance(got['--warn'], got['--red']),
          `${theme}/${mode}: 警告色与失败色太近`).toBeGreaterThan(35);
      });
    });
  }
}

test.describe('github 主题逐值保真 evolve GUI 基准', () => {
  test('dark 档的底色、边线与三档语义色与 evolve 原值一致', async ({ page }) => {
    const got = await page.evaluate(() => {
      const el = document.getElementById('semantic')!;
      el.setAttribute('data-theme', 'github');
      el.setAttribute('data-mode', 'dark');

      // 容器显式取 --fg 当正文色 —— 这是宿主里 .vg 容器的真实状态, 也让"变量
      // invalid 时回落到继承色"这件事有确定的落点。不设的话继承的是试衣间外壳
      // 的固定浅色, light 档的塌陷就测不出来 (塌陷后反而离得更远)。
      el.style.color = 'var(--fg)';

      const probe = document.createElement('span');
      el.appendChild(probe);
      const g = (n: string) => {
        probe.style.color = '';
        probe.style.color = `var(${n}, rgb(1, 2, 3))`;
        return getComputedStyle(probe).color.trim();
      };
      try {
        return {
          bg0: g('--bg0'), bg1: g('--bg1'), line: g('--line'),
          accent: g('--accent'), ok: g('--ok'), warn: g('--warn'), red: g('--red'),
        };
      } finally {
        probe.remove();
      }
    });

    expect(toRgb(got.bg0)).toEqual([13, 17, 23]);      // #0d1117
    expect(toRgb(got.bg1)).toEqual([22, 27, 34]);      // #161b22
    expect(toRgb(got.line)).toEqual([48, 54, 61]);     // #30363d
    expect(toRgb(got.accent)).toEqual([88, 166, 255]); // #58a6ff 链接蓝
    expect(toRgb(got.ok)).toEqual([63, 185, 80]);      // #3fb950
    expect(toRgb(got.warn)).toEqual([210, 153, 34]);   // #d29922
    expect(toRgb(got.red)).toEqual([248, 81, 73]);     // #f85149
  });
});
