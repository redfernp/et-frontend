// Read-only, current staging audit for the rolling 12-month columnist noindex rule.
import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
import { columnistNoindexCutoff } from '../src/lib/columnist-noindex-cutoff.mjs';
import { columnistKeyForUri } from '../src/lib/columnist-profiles.mjs';

const site = new URL(process.env.EVERYTIP_WP_BASE_URL ?? '');
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') {
  throw new Error('Only the named EveryTip staging site is permitted');
}
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!username || !password) throw new Error('Missing staging REST credentials');
const headers = { Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}` };
const snapshotDirectory = new URL('../data/raw/', import.meta.url);
const filename = (await readdir(snapshotDirectory)).filter((name) => /^staging-wordpress-public-.*\.json$/.test(name)).sort().at(-1);
if (!filename) throw new Error('No staging snapshot');
const snapshot = JSON.parse(await readFile(new URL(filename, snapshotDirectory), 'utf8'));
const cutoff = columnistNoindexCutoff();
const candidates = snapshot.posts.filter((post) => columnistKeyForUri(post.uri) &&
  post.date?.slice(0, 10) < cutoff).map((post) => ({
  id: post.databaseId, slug: post.slug, uri: post.uri, family: columnistKeyForUri(post.uri), date: post.date,
}));
const rows = [];
for (let offset = 0; offset < candidates.length; offset += 50) {
  const chunk = candidates.slice(offset, offset + 50);
  const url = new URL('/wp-json/wp/v2/posts', site);
  url.searchParams.set('context', 'edit');
  url.searchParams.set('per_page', '50');
  url.searchParams.set('include', chunk.map((post) => post.id).join(','));
  url.searchParams.set('_fields', 'id,slug,date,status,yoast_head_json');
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error(`Staging REST HTTP ${response.status} for offset ${offset}`);
  const current = new Map((await response.json()).map((post) => [post.id, post]));
  for (const expected of chunk) {
    const post = current.get(expected.id);
    const robots = post?.yoast_head_json?.robots;
    const reason = !post ? 'missing' : post.slug !== expected.slug ? 'slug-changed' :
      post.status !== 'publish' ? 'not-published' :
      post.date?.slice(0, 10) >= cutoff ? 'newer-than-cutoff' :
      !robots || !['index', 'noindex'].includes(robots.index) ? 'unknown-robots' : null;
    rows.push({ ...expected, currentDate: post?.date, status: post?.status,
      robotsIndex: robots?.index, robotsFollow: robots?.follow, reason,
      needsUpdate: !reason && robots.index === 'index' });
  }
  console.log(`Audited ${rows.length}/${candidates.length} old columnist posts`);
}
const output = { generatedAt: new Date().toISOString(), environment: 'staging', mode: 'read-only',
  cutoffExclusive: cutoff, dateBasis: 'WordPress publication date', snapshot: filename,
  candidates: rows.length, alreadyNoindex: rows.filter((row) => !row.reason && row.robotsIndex === 'noindex').length,
  needsUpdate: rows.filter((row) => row.needsUpdate).length,
  exceptions: rows.filter((row) => row.reason).length, rows };
const directory = new URL('../artifacts/staging-columnist-noindex/', import.meta.url);
await mkdir(directory, { recursive: true });
const path = new URL(`plan-${output.generatedAt.replaceAll(':', '-')}.json`, directory);
await writeFile(path, JSON.stringify(output, null, 2), { flag: 'wx' });
console.log(JSON.stringify({ plan: path.pathname, candidates: output.candidates,
  alreadyNoindex: output.alreadyNoindex, needsUpdate: output.needsUpdate,
  exceptions: output.exceptions }, null, 2));
