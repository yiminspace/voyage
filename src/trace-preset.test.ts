import { describe, expect, it } from 'vitest';

import {
  VOYAGE_APP_DEFAULTS,
  VOYAGE_PRESETS,
  VOYAGE_THEMES,
  voyagePresetPrefs,
} from './index';

describe('Trace preset', () => {
  it('公开 brainws 的记录纸默认组合', () => {
    expect(VOYAGE_APP_DEFAULTS.brainws).toEqual({
      theme: 'trace',
      mode: 'light',
      style: 'classic',
      tone: 'quiet',
    });
  });

  it('同时纳入合法主题轴与策展主题', () => {
    expect(VOYAGE_THEMES).toContain('trace');

    const preset = VOYAGE_PRESETS.find(({ id }) => id === 'trace');
    expect(preset).toBeDefined();
    expect(voyagePresetPrefs(preset!, 'dark')).toEqual({
      theme: 'trace',
      mode: 'dark',
      style: 'classic',
      tone: 'quiet',
    });
  });
});
