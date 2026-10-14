// Read-only live comparison for the owner's rolling older-than-12-months rule.
// Never writes WordPress or changes Yoast fields.
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { columnistNoindexCutoff } from '../src/lib/columnist-noindex-cutoff.mjs';
import { columnistKeyForUri } from '../src/lib/columnist-profiles.mjs';

const live = new URL('https://www.everytip.co.uk');
const directory = new URL('../data/raw/', import.meta.url);
const filename = (await readdir(directory)).filter((name) =>
  /^staging-wordpress-public-.*\.json$/.test(name)).sort().at(-1);
if (!filename) throw new Error('No dated staging snapshot for candidate identities');
const snapshot = JSON.parse(await readFile(new URL(filename, directory), 'utf8'));
const cutoff = columnistNoindexCutoff();
const expected = snapshot.posts.filter((post) => columnistKeyForUri(post.uri) && post.date?.slice(0, 10) < cutoff)
  .map((post) => ({ id: post.databaseId, slug: post.slug, uri: post.uri, family: columnistKeyForUri(post.uri) }));
const rows = [];
for (let offset = 0; offset < expected.length; offset += 50) {
  const batch = expected.slice(offset, offset + 50);
  const url = new URL('/wp-json/wp/v2/posts', live);
  url.searchParams.set('per_page', '50');
  url.searchParams.set('include', batch.map((post) => post.id).join(','));
  url.searchParams.set('_fields', 'id,slug,date,status,link,yoast_head_json');
  const response = await fetch(url, { signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error(`Live REST HTTP ${response.status} at batch ${offset}`);
  const found = new Map((await response.json()).map((post) => [post.id, post]));
  for (const item of batch) {
    const current = found.get(item.id);
    const reason = !current ? 'missing-live' : current.slug !== item.slug ? 'slug-changed' :
      current.status !== 'publish' ? 'not-published' :
      current.date?.slice(0, 10) >= cutoff ? 'newer-than-cutoff' :
      new URL(current.link).pathname !== item.uri ? 'path-changed' :
      !['index', 'noindex'].includes(current.yoast_head_json?.robots?.index) ? 'unknown-robots' : null;
    rows.push({ ...item, liveDate: current?.date?.slice(0, 10),
      robotsIndex: current?.yoast_head_json?.robots?.index ?? null,
      robotsFollow: current?.yoast_head_json?.robots?.follow ?? null,
      reason, needsNoindex: !reason && current.yoast_head_json.robots.index === 'index' });
  }
}
const audit = { auditedAt: new Date().toISOString(), environment: 'live', mode: 'read-only',
  snapshot: filename, cutoffExclusive: cutoff, candidates: rows.length,
  alreadyNoindex: rows.filter((row) => !row.reason && row.robotsIndex === 'noindex').length,
  needsNoindex: rows.filter((row) => row.needsNoindex).length,
  exceptions: rows.filter((row) => row.reason).length,
  byFamily: Object.fromEntries(['john', 'seymour'].map((name) => [name, {
    candidates: rows.filter((row) => row.family === name).length,
    needsNoindex: rows.filter((row) => row.family === name && row.needsNoindex).length,
  }])),
  needsNoindexRows: rows.filter((row) => row.needsNoindex),
  exceptionRows: rows.filter((row) => row.reason) };
const outputDirectory = new URL('../artifacts/live-columnist-noindex/', import.meta.url);
await mkdir(outputDirectory, { recursive: true });
const outputPath = new URL(`audit-${audit.auditedAt.replaceAll(':', '-')}.json`, outputDirectory);
await writeFile(outputPath, JSON.stringify(audit, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ auditedAt: audit.auditedAt, cutoffExclusive: cutoff, candidates: audit.candidates,
  alreadyNoindex: audit.alreadyNoindex, needsNoindex: audit.needsNoindex,
  exceptions: audit.exceptions, byFamily: audit.byFamily, report: outputPath.pathname }, null, 2));
