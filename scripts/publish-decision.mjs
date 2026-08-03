/**
 * Voyage publish decision: strict SemVer compare against npm registry.
 *
 * CLI:
 *   node scripts/publish-decision.mjs decide --current X --published Y
 *   node scripts/publish-decision.mjs decide --from-registry [--package NAME]
 *
 * Exit codes: 0 = publish or skip; 1 = fail (behind / invalid / registry error)
 * Prints a single JSON object to stdout. When GITHUB_OUTPUT is set, also writes
 * should_publish / version / decision for Actions.
 */

import { execSync } from 'node:child_process';
import { appendFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

const SEMVER_RE =
  /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;

/**
 * Compare two non-negative integer strings without Number precision loss.
 * Inputs must already match SemVer numeric identifiers (no leading zeros except "0").
 *
 * @param {string} a
 * @param {string} b
 * @returns {-1 | 0 | 1}
 */
export function compareNumericId(a, b) {
  if (a === b) return 0;
  if (a.length !== b.length) return a.length < b.length ? -1 : 1;
  return a < b ? -1 : 1;
}

/**
 * @param {string} version
 * @returns {{ major: string, minor: string, patch: string, prerelease: string[] } | null}
 */
export function parseSemVer(version) {
  if (typeof version !== 'string') return null;
  // Reject surrounding whitespace; SemVer strings must match exactly.
  if (version !== version.trim()) return null;
  const m = SEMVER_RE.exec(version);
  if (!m) return null;
  return {
    major: m[1],
    minor: m[2],
    patch: m[3],
    prerelease: m[4] ? m[4].split('.') : [],
  };
}

/**
 * @param {string} id
 * @returns {{ kind: 'num', value: string } | { kind: 'str', value: string }}
 */
function prereleaseId(id) {
  if (/^(0|[1-9]\d*)$/.test(id)) return { kind: 'num', value: id };
  return { kind: 'str', value: id };
}

/**
 * @param {{ major: string, minor: string, patch: string, prerelease: string[] }} a
 * @param {{ major: string, minor: string, patch: string, prerelease: string[] }} b
 * @returns {-1 | 0 | 1}
 */
export function compareSemVer(a, b) {
  for (const key of /** @type {const} */ (['major', 'minor', 'patch'])) {
    const cmp = compareNumericId(a[key], b[key]);
    if (cmp !== 0) return cmp;
  }

  const aPre = a.prerelease;
  const bPre = b.prerelease;
  if (aPre.length === 0 && bPre.length === 0) return 0;
  // A version without prerelease has higher precedence than one with.
  if (aPre.length === 0) return 1;
  if (bPre.length === 0) return -1;

  const n = Math.max(aPre.length, bPre.length);
  for (let i = 0; i < n; i++) {
    if (i >= aPre.length) return -1;
    if (i >= bPre.length) return 1;
    const ai = prereleaseId(aPre[i]);
    const bi = prereleaseId(bPre[i]);
    if (ai.kind === 'num' && bi.kind === 'num') {
      const cmp = compareNumericId(ai.value, bi.value);
      if (cmp !== 0) return cmp;
      continue;
    }
    if (ai.kind === 'num') return -1;
    if (bi.kind === 'num') return 1;
    if (ai.value === bi.value) continue;
    return ai.value < bi.value ? -1 : 1;
  }
  return 0;
}

/**
 * @typedef {{ action: 'publish', current: string, published: string }} PublishAction
 * @typedef {{ action: 'skip', current: string, published: string, reason: string }} SkipAction
 * @typedef {{ action: 'fail', reason: string, current?: string, published?: string }} FailAction
 * @typedef {PublishAction | SkipAction | FailAction} PublishDecision
 */

/**
 * Decide whether to publish based on already-fetched versions.
 * Does not talk to the network.
 *
 * @param {string} currentVersion
 * @param {string} publishedVersion
 * @returns {PublishDecision}
 */
export function decidePublish(currentVersion, publishedVersion) {
  const current = parseSemVer(currentVersion);
  if (!current) {
    return {
      action: 'fail',
      reason: `Invalid current SemVer: ${JSON.stringify(currentVersion)}`,
      current: String(currentVersion),
    };
  }

  const published = parseSemVer(publishedVersion);
  if (!published) {
    return {
      action: 'fail',
      reason: `Invalid published SemVer: ${JSON.stringify(publishedVersion)}`,
      current: currentVersion,
      published: String(publishedVersion),
    };
  }

  const cmp = compareSemVer(current, published);
  if (cmp > 0) {
    return { action: 'publish', current: currentVersion, published: publishedVersion };
  }
  if (cmp === 0) {
    return {
      action: 'skip',
      current: currentVersion,
      published: publishedVersion,
      reason: `Version ${currentVersion} is already published`,
    };
  }
  return {
    action: 'fail',
    reason: `Current version ${currentVersion} is behind published ${publishedVersion}`,
    current: currentVersion,
    published: publishedVersion,
  };
}

/**
 * @param {string} packageName
 * @param {{ execSync?: typeof execSync }} [deps]
 * @returns {string}
 */
export function fetchPublishedVersion(packageName, deps = {}) {
  const run = deps.execSync ?? execSync;

  try {
    const raw = run(`npm view ${packageName} version --json`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const text = String(raw).trim();
    const parsed = JSON.parse(text);
    if (typeof parsed !== 'string' || !parsed) {
      throw new Error(`Unexpected npm view payload: ${text}`);
    }
    return parsed;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const error = new Error(`npm registry query failed for ${packageName}: ${message}`);
    error.cause = err;
    throw error;
  }
}

/**
 * @param {{
 *   currentVersion: string,
 *   packageName?: string,
 *   publishedVersion?: string,
 *   fetchPublished?: (name: string) => string,
 * }} input
 * @returns {PublishDecision}
 */
export function resolvePublishDecision(input) {
  const packageName = input.packageName ?? '@yiminlab/voyage';
  let publishedVersion = input.publishedVersion;

  if (publishedVersion === undefined) {
    const fetch = input.fetchPublished ?? ((name) => fetchPublishedVersion(name));
    try {
      publishedVersion = fetch(packageName);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return {
        action: 'fail',
        reason: message,
        current: input.currentVersion,
      };
    }
  }

  return decidePublish(input.currentVersion, publishedVersion);
}

/**
 * @param {PublishDecision} decision
 * @param {string | undefined} githubOutput
 */
function writeGithubOutput(decision, githubOutput) {
  if (!githubOutput) return;
  const shouldPublish = decision.action === 'publish' ? 'true' : 'false';
  const version = 'current' in decision && decision.current ? decision.current : '';
  const lines = [
    `should_publish=${shouldPublish}`,
    `version=${version}`,
    `decision=${decision.action}`,
  ];
  appendFileSync(githubOutput, `${lines.join('\n')}\n`);
}

function readPackageJson() {
  const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
  return { name: pkg.name, version: pkg.version };
}

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  const args = {
    command: argv[2] ?? 'decide',
    current: /** @type {string | undefined} */ (undefined),
    published: /** @type {string | undefined} */ (undefined),
    fromRegistry: false,
    packageName: /** @type {string | undefined} */ (undefined),
  };
  for (let i = 3; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--from-registry') args.fromRegistry = true;
    else if (a === '--current') args.current = argv[++i];
    else if (a === '--published') args.published = argv[++i];
    else if (a === '--package') args.packageName = argv[++i];
  }
  return args;
}

function main() {
  const args = parseArgs(process.argv);
  if (args.command !== 'decide') {
    console.error(`Unknown command: ${args.command}`);
    process.exit(1);
  }

  const pkg = readPackageJson();
  const currentVersion = args.current ?? pkg.version;
  const packageName = args.packageName ?? pkg.name;

  /** @type {PublishDecision} */
  let decision;
  if (args.published !== undefined && !args.fromRegistry) {
    decision = decidePublish(currentVersion, args.published);
  } else {
    decision = resolvePublishDecision({
      currentVersion,
      packageName,
      publishedVersion: args.fromRegistry ? undefined : args.published,
    });
  }

  console.log(JSON.stringify(decision));
  writeGithubOutput(decision, process.env.GITHUB_OUTPUT);

  if (decision.action === 'fail') {
    console.error(decision.reason);
    process.exit(1);
  }
  if (decision.action === 'skip') {
    console.error(decision.reason);
  } else {
    console.error(`Will publish ${decision.current} (npm has ${decision.published})`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
