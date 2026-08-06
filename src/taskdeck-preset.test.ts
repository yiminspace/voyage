import { describe, expect, it } from 'vitest';

import {
  VOYAGE_APP_DEFAULTS,
  VOYAGE_PRESETS,
  VOYAGE_STYLES,
  VOYAGE_THEMES,
  VOYAGE_TONES,
  voyagePresetPrefs,
} from './index';

describe('Taskdeck preset', () => {
  it('公开一个可直接使用的应用默认组合', () => {
    expect(VOYAGE_APP_DEFAULTS.taskdeck).toEqual({
      theme: 'iris',
      mode: 'light',
      style: 'cloud',
      tone: 'crisp',
    });
  });

  it('把新增取值纳入合法轴和策展主题', () => {
    expect(VOYAGE_THEMES).toContain('iris');
    expect(VOYAGE_STYLES).toContain('cloud');
    expect(VOYAGE_TONES).toContain('crisp');

    const preset = VOYAGE_PRESETS.find(({ id }) => id === 'iris');
    expect(preset).toBeDefined();
    expect(voyagePresetPrefs(preset!, 'dark')).toEqual({
      theme: 'iris',
      mode: 'dark',
      style: 'cloud',
      tone: 'crisp',
    });
  });
});
