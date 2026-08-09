import { expect, test } from '@playwright/test';
import { VOYAGE_APP_DEFAULTS, voyageInitScript } from '../src';

const DEMO_URL = 'http://127.0.0.1:4173/demo/scoped-host-demo.html';
const STORAGE_KEY = 'brainws:vg_prefs';

test.beforeEach(async ({ page }) => {
  await page.addInitScript((storageKey) => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({ theme: 'trace', mode: 'dark', style: 'classic', tone: 'quiet' })
    );
  }, STORAGE_KEY);
  await page.goto(DEMO_URL);
});

test('嵌入宿主反复改写 html 时，主题与持久化仍只属于应用根节点', async ({ page }) => {
  const root = page.locator('#brainws-root');
  const html = page.locator('html');

  await expect(root).toHaveAttribute('data-theme', 'trace');
  await expect(root).toHaveAttribute('data-mode', 'dark');
  await expect(html).toHaveAttribute('data-theme', 'light');
  await expect(html).not.toHaveAttribute('data-mode', /.+/);

  await page.evaluate(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.setAttribute('data-theme', 'dark');
  });
  await expect(root).toHaveAttribute('data-theme', 'trace');
  await expect(root).toHaveAttribute('data-mode', 'dark');

  await page.getByRole('button', { name: '切换为亮色模式' }).click();
  await expect(root).toHaveAttribute('data-mode', 'light');
  await expect(html).toHaveAttribute('data-theme', 'dark');

  const storage = await page.evaluate(
    (storageKey) => ({
      scoped: localStorage.getItem(storageKey),
      global: localStorage.getItem('vg_prefs'),
    }),
    STORAGE_KEY
  );
  expect(JSON.parse(storage.scoped ?? '{}').mode).toBe('light');
  expect(storage.global).toBeNull();
});

test('标准 Toolbar 保留两个 disabled 占位，明暗和调色板仍可用', async ({ page }) => {
  const toolbar = page.locator('.vg-topbar');
  const buttons = toolbar.locator('button');

  await expect(buttons).toHaveCount(4);
  await expect(buttons.nth(0)).toBeDisabled();
  await expect(buttons.nth(1)).toBeDisabled();
  await expect(buttons.nth(2)).toBeEnabled();
  await expect(buttons.nth(3)).toBeEnabled();
  await expect(buttons.nth(0)).toHaveAttribute('title', '尚未接入');
  await expect(buttons.nth(1)).toHaveText('中');

  const boxes = await buttons.evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return { width: rect.width, height: rect.height, radius: getComputedStyle(element).borderRadius };
    })
  );
  expect(new Set(boxes.map(({ width }) => width)).size).toBe(1);
  expect(new Set(boxes.map(({ height }) => height)).size).toBe(1);
  expect(new Set(boxes.map(({ radius }) => radius)).size).toBe(1);

  await buttons.nth(3).click();
  await expect(page.getByRole('menu', { name: '主题设置' })).toBeVisible();
});

test('scoped 免闪烁脚本在 React module 请求完成前已应用合法偏好', async ({ page }) => {
  let releaseModule!: () => void;
  let markRequested!: () => void;
  const moduleGate = new Promise<void>((resolve) => { releaseModule = resolve; });
  const moduleRequested = new Promise<void>((resolve) => { markRequested = resolve; });

  await page.route('**/demo/scoped-host-demo.tsx*', async (route) => {
    markRequested();
    await moduleGate;
    await route.continue();
  });

  await page.reload({ waitUntil: 'commit' });
  await moduleRequested;
  try {
    const root = page.locator('#brainws-root');
    await expect(root).toHaveAttribute('data-theme', 'trace');
    await expect(root).toHaveAttribute('data-mode', 'dark');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    const inline = (await page.locator('#voyage-scoped-init').textContent())?.trim();
    expect(inline).toBe(voyageInitScript(VOYAGE_APP_DEFAULTS.brainws, {
      targetSelector: '#brainws-root',
      storageKey: STORAGE_KEY,
    }));
  } finally {
    releaseModule();
  }
  await page.waitForLoadState('domcontentloaded');
});

test('小高度视口仍可滚动到 Trace 与明暗行并完成选择', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.getByRole('button', { name: '展开主题设置' }).click();

  const panel = page.getByRole('menu', { name: '主题设置' });
  await expect(panel).toBeVisible();
  const geometry = await panel.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      bottom: rect.bottom,
      scrollable: element.scrollHeight > element.clientHeight,
    };
  });
  expect(geometry.bottom).toBeLessThanOrEqual(568);
  expect(geometry.scrollable).toBe(true);

  const trace = page.getByRole('menuitemradio', { name: '轨迹纸' });
  await trace.scrollIntoViewIfNeeded();
  await expect(trace).toBeInViewport();
  await trace.click();

  const light = page.getByRole('menuitemradio', { name: '亮', exact: true });
  await light.scrollIntoViewIfNeeded();
  await expect(light).toBeInViewport();
  await light.click();
  await expect(page.locator('#brainws-root')).toHaveAttribute('data-mode', 'light');
});
