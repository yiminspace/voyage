// @vitest-environment node
import { describe, expect, it } from 'vitest';

describe('SSR 安全', () => {
  it('无 window 的环境下 import @yiminlab/voyage/react 不抛错', async () => {
    expect(typeof window).toBe('undefined');
    await expect(import('./index')).resolves.toBeDefined();
    const mod = await import('./index');
    expect(typeof mod.VoyageProvider).toBe('function');
    expect(typeof mod.useVoyage).toBe('function');
    expect(typeof mod.VoyageSwitcher).toBe('function');
    expect(typeof mod.VoyageStateView).toBe('function');
    expect(typeof mod.VoyageAccountMenu).toBe('function');
  });
});
