import { describe, expect, it } from 'vitest';
import {
  compareSemVer,
  decidePublish,
  fetchPublishedVersion,
  parseSemVer,
  resolvePublishDecision,
} from './publish-decision.mjs';
import { checkPackEntries, REQUIRED_PACK_PATHS } from './check-pack-contents.mjs';

describe('parseSemVer', () => {
  it('parses release versions', () => {
    expect(parseSemVer('1.2.3')).toEqual({
      major: '1',
      minor: '2',
      patch: '3',
      prerelease: [],
    });
  });

  it('parses prerelease versions', () => {
    expect(parseSemVer('1.2.3-beta.1')).toEqual({
      major: '1',
      minor: '2',
      patch: '3',
      prerelease: ['beta', '1'],
    });
  });

  it('rejects invalid versions', () => {
    expect(parseSemVer('')).toBeNull();
    expect(parseSemVer('1.2')).toBeNull();
    expect(parseSemVer('v1.2.3')).toBeNull();
    expect(parseSemVer('01.2.3')).toBeNull();
    expect(parseSemVer('not-a-version')).toBeNull();
  });

  it('rejects surrounding whitespace', () => {
    expect(parseSemVer(' 1.2.3')).toBeNull();
    expect(parseSemVer('1.2.3 ')).toBeNull();
    expect(parseSemVer('\t1.2.3\n')).toBeNull();
  });
});

describe('compareSemVer', () => {
  it('orders by major.minor.patch', () => {
    expect(compareSemVer(parseSemVer('0.12.0')!, parseSemVer('0.11.9')!)).toBe(1);
    expect(compareSemVer(parseSemVer('0.12.0')!, parseSemVer('0.12.0')!)).toBe(0);
    expect(compareSemVer(parseSemVer('0.12.0')!, parseSemVer('0.13.0')!)).toBe(-1);
  });

  it('ranks release above prerelease of the same core', () => {
    expect(compareSemVer(parseSemVer('1.0.0')!, parseSemVer('1.0.0-rc.1')!)).toBe(1);
    expect(compareSemVer(parseSemVer('1.0.0-rc.1')!, parseSemVer('1.0.0')!)).toBe(-1);
  });

  it('orders prerelease identifiers', () => {
    expect(compareSemVer(parseSemVer('1.0.0-alpha')!, parseSemVer('1.0.0-alpha.1')!)).toBe(-1);
    expect(compareSemVer(parseSemVer('1.0.0-alpha.1')!, parseSemVer('1.0.0-beta')!)).toBe(-1);
    expect(compareSemVer(parseSemVer('1.0.0-beta.2')!, parseSemVer('1.0.0-beta.11')!)).toBe(-1);
  });

  it('compares numeric identifiers beyond Number.MAX_SAFE_INTEGER', () => {
    const high = parseSemVer('9007199254740993.0.0')!;
    const low = parseSemVer('9007199254740992.0.0')!;
    expect(high).not.toBeNull();
    expect(low).not.toBeNull();
    expect(compareSemVer(high, low)).toBe(1);
    expect(decidePublish('9007199254740993.0.0', '9007199254740992.0.0').action).toBe(
      'publish',
    );
  });
});

describe('decidePublish', () => {
  it('publishes when current is strictly higher', () => {
    expect(decidePublish('0.13.0', '0.12.0')).toEqual({
      action: 'publish',
      current: '0.13.0',
      published: '0.12.0',
    });
  });

  it('skips when versions are equal', () => {
    expect(decidePublish('0.12.0', '0.12.0')).toEqual({
      action: 'skip',
      current: '0.12.0',
      published: '0.12.0',
      reason: 'Version 0.12.0 is already published',
    });
  });

  it('fails when current is behind published', () => {
    const result = decidePublish('0.11.0', '0.12.0');
    expect(result.action).toBe('fail');
    expect(result).toMatchObject({
      current: '0.11.0',
      published: '0.12.0',
    });
  });

  it('publishes a release over a published prerelease', () => {
    expect(decidePublish('1.0.0', '1.0.0-rc.1')).toEqual({
      action: 'publish',
      current: '1.0.0',
      published: '1.0.0-rc.1',
    });
  });

  it('fails when current prerelease is behind a published release', () => {
    expect(decidePublish('1.0.0-rc.1', '1.0.0').action).toBe('fail');
  });

  it('fails on invalid current or published SemVer', () => {
    expect(decidePublish('nope', '1.0.0').action).toBe('fail');
    expect(decidePublish('1.0.0', 'nope').action).toBe('fail');
    expect(decidePublish('1.0', '1.0.0').action).toBe('fail');
  });
});

describe('resolvePublishDecision', () => {
  it('uses an injected fetcher for the published version', () => {
    const decision = resolvePublishDecision({
      currentVersion: '0.13.0',
      fetchPublished: () => '0.12.0',
    });
    expect(decision).toEqual({
      action: 'publish',
      current: '0.13.0',
      published: '0.12.0',
    });
  });

  it('fails closed when the registry fetcher throws', () => {
    const decision = resolvePublishDecision({
      currentVersion: '0.13.0',
      fetchPublished: () => {
        throw new Error('npm registry query failed for @yiminlab/voyage: network down');
      },
    });
    expect(decision.action).toBe('fail');
    expect(decision.reason).toMatch(/npm registry query failed/);
  });

  it('does not invent 0.0.0 when registry fails', () => {
    const decision = resolvePublishDecision({
      currentVersion: '0.1.0',
      fetchPublished: () => {
        throw new Error('npm registry query failed');
      },
    });
    expect(decision.action).toBe('fail');
    expect(decision).not.toMatchObject({ published: '0.0.0' });
  });
});

describe('fetchPublishedVersion', () => {
  it('accepts npm string and single-version array payloads', () => {
    expect(fetchPublishedVersion('@yiminlab/voyage', {
      execSync: (() => JSON.stringify('0.12.4')) as never,
    })).toBe('0.12.4');
    expect(fetchPublishedVersion('@yiminlab/voyage', {
      execSync: (() => JSON.stringify(['0.12.4'])) as never,
    })).toBe('0.12.4');
  });

  it('rejects ambiguous or empty array payloads', () => {
    expect(() => fetchPublishedVersion('@yiminlab/voyage', {
      execSync: (() => JSON.stringify([])) as never,
    })).toThrow(/Unexpected npm view payload/);
    expect(() => fetchPublishedVersion('@yiminlab/voyage', {
      execSync: (() => JSON.stringify(['0.12.3', '0.12.4'])) as never,
    })).toThrow(/Unexpected npm view payload/);
  });
});

describe('checkPackEntries', () => {
  it('accepts a complete pack listing', () => {
    expect(checkPackEntries([...REQUIRED_PACK_PATHS, 'package/README.md'])).toEqual({
      ok: true,
    });
  });

  it('reports missing root, react, primitives, and css entries', () => {
    const result = checkPackEntries(['package/package.json']);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.missing).toEqual(expect.arrayContaining([
      'package/dist/index.js',
      'package/dist/react/index.js',
      'package/dist/react/primitives/index.js',
      'package/tokens.css',
      'package/voyage.css',
      'package/index.css',
    ]));
  });
});
