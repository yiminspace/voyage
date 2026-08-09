import { beforeEach, describe, expect, it } from 'vitest';

import {
  VOYAGE_APP_DEFAULTS,
  VOYAGE_STORAGE_KEY,
  initVoyage,
  loadVoyagePrefs,
  saveVoyagePrefs,
  voyageInitScript,
} from './index';

beforeEach(() => {
  window.localStorage.clear();
  document.documentElement.className = '';
  document.body.innerHTML = '';
});

describe('scoped Voyage runtime', () => {
  it('用独立 storage key 读写，不污染默认 vg_prefs', () => {
    const prefs = { ...VOYAGE_APP_DEFAULTS.brainws, mode: 'dark' as const };

    saveVoyagePrefs(prefs, 'brainws:vg_prefs');

    expect(loadVoyagePrefs(VOYAGE_APP_DEFAULTS.brainws, 'brainws:vg_prefs')).toEqual(prefs);
    expect(window.localStorage.getItem(VOYAGE_STORAGE_KEY)).toBeNull();
  });

  it('initVoyage 只把四轴写入显式 target', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);

    initVoyage(VOYAGE_APP_DEFAULTS.brainws, { target: root, storageKey: 'brainws:vg_prefs' });

    expect(root.classList.contains('vg')).toBe(true);
    expect(root.getAttribute('data-theme')).toBe('trace');
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
  });

  it('免闪烁脚本只初始化内层根节点并使用独立 key', () => {
    const root = document.createElement('div');
    root.id = 'brainws-root';
    document.body.appendChild(root);
    document.documentElement.setAttribute('data-theme', 'whistle-dark');
    window.localStorage.setItem(
      'brainws:vg_prefs',
      JSON.stringify({ ...VOYAGE_APP_DEFAULTS.brainws, mode: 'dark' })
    );
    window.localStorage.setItem(
      VOYAGE_STORAGE_KEY,
      JSON.stringify({ theme: 'ink', mode: 'light', style: 'soft', tone: 'quiet' })
    );
    const script = voyageInitScript(VOYAGE_APP_DEFAULTS.brainws, {
      targetSelector: '#brainws-root',
      storageKey: 'brainws:vg_prefs',
    });

    Function(script)();

    expect(root.getAttribute('data-theme')).toBe('trace');
    expect(root.getAttribute('data-mode')).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('whistle-dark');
  });

  it('免闪烁脚本与 runtime 对损坏或未来版本偏好的回退结果一致', () => {
    const root = document.createElement('div');
    root.id = 'brainws-root';
    document.body.appendChild(root);
    window.localStorage.setItem(
      'brainws:vg_prefs',
      JSON.stringify({ theme: 'future-theme', mode: 'dark', style: 'hologram', tone: 'quiet' })
    );
    const script = voyageInitScript(VOYAGE_APP_DEFAULTS.brainws, {
      targetSelector: '#brainws-root',
      storageKey: 'brainws:vg_prefs',
    });

    Function(script)();

    expect(root.getAttribute('data-theme')).toBe('trace');
    expect(root.getAttribute('data-mode')).toBe('light');
    expect(initVoyage(VOYAGE_APP_DEFAULTS.brainws, {
      target: root,
      storageKey: 'brainws:vg_prefs',
    })).toEqual(VOYAGE_APP_DEFAULTS.brainws);
    expect(root.getAttribute('data-theme')).toBe('trace');
    expect(root.getAttribute('data-mode')).toBe('light');
  });
});
