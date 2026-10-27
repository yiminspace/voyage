import { beforeEach, describe, expect, it } from 'vitest';
import {
  VOYAGE_APP_DEFAULTS, VOYAGE_PRESETS, VOYAGE_THEMES,
  loadVoyagePrefs, saveVoyagePrefs, voyageExamAttrs,
  type VoyageExamTheme,
} from './index';

beforeEach(() => localStorage.clear());

describe('IELTS theme', () => {
  it('has an independent theme, preset and application defaults', () => {
    expect(VOYAGE_THEMES).toContain('ielts');
    expect(VOYAGE_APP_DEFAULTS.ielts).toEqual({ theme: 'ielts', mode: 'light', style: 'plain', tone: 'crisp' });
    expect(VOYAGE_PRESETS.find(({ id }) => id === 'ielts')).toMatchObject({
      label: { en: 'IELTS Lab' }, theme: 'ielts', style: 'plain', tone: 'crisp',
    });
    saveVoyagePrefs(VOYAGE_APP_DEFAULTS.ielts, 'ielts:prefs');
    expect(loadVoyagePrefs(VOYAGE_APP_DEFAULTS.engram, 'ielts:prefs')).toEqual(VOYAGE_APP_DEFAULTS.ielts);
  });

  it('keeps the selected IELTS theme across contrast and size changes', () => {
    expect(voyageExamAttrs({ theme: 'ielts', contrast: 'yellow-on-black', text: 'large' })).toEqual({
      className: 'vg vg-exam', 'data-theme': 'ielts', 'data-mode': 'dark',
      'data-style': 'plain', 'data-tone': 'crisp',
      'data-exam-contrast': 'yellow-on-black', 'data-exam-text': 'large',
    });
    expect(voyageExamAttrs()['data-theme']).toBe('examhall');
    expect(voyageExamAttrs({ theme: 'legacy' as VoyageExamTheme })['data-theme']).toBe('examhall');
  });
});
