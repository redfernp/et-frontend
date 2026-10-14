// Small, serialized staging Gutenberg batches. Every post still uses the
// guarded single-post writer and an independent rendered-content verifier.
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { classicHtmlToBlocks, columnistConversionOptions } from '../src/lib/classic-to-gutenberg.mjs';
import { columnistKeyForUri } from '../src/lib/columnist-profiles.mjs';

const run = promisify(execFile);
const family = process.argv.find((arg) => arg.startsWith('--family='))?.split('=')[1] ?? 'seymour';
const limit = Number(process.argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1] ?? 5);
const apply = process.argv.includes('--apply');
if (!['seymour', 'john', 'other'].includes(family) || !Number.isInteger(limit) || limit < 1 || limit > 20) {
  throw new Error('Usage: run-staging-post-conversion-queue.mjs --family=seymour|john|other --limit=1..20 [--apply]');
}
const site = new URL(process.env.EVERYTIP_WP_BASE_URL ?? '');
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') {
  throw new Error('Only the named EveryTip staging site is permitted');
}
if (!process.env.EVERYTIP_WP_USERNAME || !process.env.EVERYTIP_WP_APPLICATION_PASSWORD) {
  throw new Error('Missing staging REST credentials');
}
const directory = new URL('../data/raw/', import.meta.url);
const names = await readdir(directory);
const snapshotName = names.filter((name) => /^staging-wordpress-public-.*\.json$/.test(name)).sort().at(-1);
if (!snapshotName) throw new Error('No staging snapshot');
const snapshot = JSON.parse(await readFile(new URL(snapshotName, directory), 'utf8'));
const auditDirectory = new URL('../artifacts/staging-ninja-shortcodes/', import.meta.url);
const auditName = (await readdir(auditDirectory)).filter((name) => /^audit-.*\.json$/.test(name)).sort().at(-1);
if (!auditName) throw new Error('No authenticated raw Ninja Tables inventory');
const audit = JSON.parse(await readFile(new URL(auditName, auditDirectory), 'utf8'));
if (audit.inspected !== snapshot.posts.length + snapshot.pages.length) {
  throw new Error('Ninja inventory does not cover this snapshot');
}
const ninjaIds = new Set(audit.rows.filter((row) => row.type === 'posts').map((row) => row.id));
const backedIds = new Set(names.flatMap((name) => {
  const match = name.match(/^wp-preconversion-(\d+)-\d{4}-\d{2}-\d{2}\.json$/);
  return match ? [Number(match[1])] : [];
}));
const classification = (uri) => columnistKeyForUri(uri) ?? 'other';
const candidates = snapshot.posts.filter((post) => classification(post.uri) === family &&
  !backedIds.has(post.databaseId) && !ninjaIds.has(post.databaseId)).sort((a, b) =>
  String(b.date).localeCompare(String(a.date)));
const convertible = candidates.filter((post) => {
  try { classicHtmlToBlocks(post.content, { ...columnistConversionOptions(post.uri), rejectLinkedImages: true }); return true; }
  catch { return false; }
});
const summary = { environment: 'staging', family, mode: apply ? 'apply' : 'read-only-plan',
  snapshot: snapshotName, ninjaAudit: auditName, offlineCandidates: convertible.length,
  previewTopCandidates: convertible.slice(0, limit).map((post) => ({ id: post.databaseId, uri: post.uri, date: post.date })),
  verified: [], skippedStale: [] };
if (!apply) {
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}
const command = (script, args) => run(process.execPath, [fileURLToPath(new URL(script, import.meta.url)), ...args],
  { timeout: 120000, maxBuffer: 1024 * 1024 });
for (const post of convertible) {
  if (summary.verified.length >= limit) break;
  const id = String(post.databaseId);
  try { await command('./apply-staging-gutenberg-batch.mjs', [id]); }
  catch (error) {
    const detail = `${error.stdout ?? ''}\n${error.stderr ?? ''}`;
    if (/Identity, status, modified time or classic-editor body changed; refusing write/.test(detail)) {
      summary.skippedStale.push(Number(id));
      continue;
    }
    throw new Error(`Dry-run stopped on ${id}: ${detail.slice(-400)}`);
  }
  const write = await command('./apply-staging-gutenberg-batch.mjs', [id, '--apply']);
  if (!/"contentVerified":true/.test(write.stdout) || !/"seoStable":true/.test(write.stdout)) {
    throw new Error(`Apply readback uncertain for ${id}; inspect saved backup`);
  }
  const verify = await command('./verify-staging-gutenberg-batch.mjs', [id]);
  if (!/"verified":true/.test(verify.stdout)) throw new Error(`Independent verification uncertain for ${id}`);
  summary.verified.push(Number(id));
  console.log(`Verified staging Gutenberg ${summary.verified.length}/${limit}: ${id}`);
}
console.log(JSON.stringify(summary, null, 2));
