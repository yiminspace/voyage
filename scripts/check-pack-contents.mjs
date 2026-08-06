/**
 * Verify `pnpm pack` tarball contains required Voyage package entries.
 *
 * Usage:
 *   node scripts/check-pack-contents.mjs [path-to.tgz]
 *   node scripts/check-pack-contents.mjs --pack   # run pnpm pack first
 */

import { execSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

/** Paths inside the tarball (npm pack uses the `package/` prefix). */
export const REQUIRED_PACK_PATHS = [
  'package/dist/index.js',
  'package/dist/index.mjs',
  'package/dist/index.d.ts',
  'package/dist/react/index.js',
  'package/dist/react/index.mjs',
  'package/dist/react/index.d.ts',
  'package/dist/react/primitives/index.js',
  'package/dist/react/primitives/index.mjs',
  'package/dist/react/primitives/index.d.ts',
  'package/dist/react/dashboard/index.js',
  'package/dist/react/dashboard/index.mjs',
  'package/dist/react/dashboard/index.d.ts',
  'package/tokens.css',
  'package/voyage.css',
  'package/index.css',
];

/**
 * @param {string[]} entries
 * @param {string[]} [required]
 * @returns {{ ok: true } | { ok: false, missing: string[] }}
 */
export function checkPackEntries(entries, required = REQUIRED_PACK_PATHS) {
  const set = new Set(entries);
  const missing = required.filter((p) => !set.has(p));
  if (missing.length > 0) return { ok: false, missing };
  return { ok: true };
}

/**
 * @param {string} tarballPath
 * @returns {string[]}
 */
export function listPackEntries(tarballPath) {
  const result = spawnSync('tar', ['-tzf', tarballPath], {
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || `tar -tzf failed for ${tarballPath}`);
  }
  return result.stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * @returns {string} absolute path to the created tarball
 */
export function createPackTarball() {
  const dir = mkdtempSync(join(tmpdir(), 'voyage-pack-'));
  try {
    execSync(`pnpm pack --pack-destination ${JSON.stringify(dir)}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const files = readdirSync(dir).filter((f) => f.endsWith('.tgz'));
    if (files.length !== 1) {
      throw new Error(`Expected one tarball in ${dir}, found: ${files.join(', ') || '(none)'}`);
    }
    return join(dir, files[0]);
  } catch (err) {
    rmSync(dir, { recursive: true, force: true });
    throw err;
  }
}

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  const args = {
    pack: false,
    tarball: /** @type {string | undefined} */ (undefined),
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--pack') args.pack = true;
    else if (!a.startsWith('-')) args.tarball = a;
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv);
  let tarball = args.tarball;
  let cleanupDir = /** @type {string | undefined} */ (undefined);

  if (args.pack || !tarball) {
    tarball = createPackTarball();
    cleanupDir = join(tarball, '..');
  }

  try {
    const entries = listPackEntries(tarball);
    const result = checkPackEntries(entries);
    if (!result.ok) {
      console.error('Pack is missing required files:');
      for (const path of result.missing) console.error(`  - ${path}`);
      process.exit(1);
    }
    console.log(`Pack OK (${entries.length} entries): ${tarball}`);
  } finally {
    if (cleanupDir) rmSync(cleanupDir, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
