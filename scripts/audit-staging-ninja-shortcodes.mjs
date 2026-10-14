// Read-only staging inventory of Ninja Tables placements in retained content.
import { mkdir, writeFile } from 'node:fs/promises';
import { latestContentSnapshot } from '../src/lib/migration-preview.mjs';

const site = new URL(process.env.EVERYTIP_WP_BASE_URL ?? '');
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') {
  throw new Error('EveryTip staging host only');
}
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!username || !password) throw new Error('Missing staging REST credentials');
const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
const snapshot = await latestContentSnapshot();
if (!snapshot) throw new Error('No dated WordPress snapshot');

const rows = [];
let inspected = 0;
const normalizedSlug = (value) => {
  try { return decodeURIComponent(value); } catch { return value; }
};
for (const type of ['posts', 'pages']) {
  // The public GraphQL snapshot contains rendered table HTML, not necessarily
  // the underlying shortcode. Screen every retained ID by authenticated raw
  // content; filtering snapshot.content would silently miss placements.
  const ids = snapshot[type].map((item) => item.databaseId);
  const known = new Map(snapshot[type].map((item) => [item.databaseId, item]));
  for (let start = 0; start < ids.length; start += 25) {
    const url = new URL(`/wp-json/wp/v2/${type}`, site);
    url.searchParams.set('context', 'edit');
    url.searchParams.set('per_page', '25');
    url.searchParams.set('include', ids.slice(start, start + 25).join(','));
    url.searchParams.set('_fields', 'id,status,slug,modified,content.raw');
    const response = await fetch(url, { headers: { Authorization: authorization }, signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`Staging ${type} read failed: HTTP ${response.status}`);
    const records = await response.json();
    if (records.length !== ids.slice(start, start + 25).length) throw new Error(`Incomplete ${type} Ninja Tables read`);
    for (const item of records) {
      const source = known.get(item.id);
      if (!source || normalizedSlug(item.slug) !== normalizedSlug(source.slug) || item.status !== 'publish') {
        throw new Error(`Staging identity changed: ${type} ${item.id}`);
      }
      if (typeof item.content?.raw !== 'string') throw new Error(`Missing raw content: ${type} ${item.id}`);
      inspected++;
      const shortcodes = [...(item.content?.raw ?? '').matchAll(/\[ninja_tables?\b([^\]]*)\]/gi)].map((match) => ({
        tableId: match[1].match(/\bid\s*=\s*["']?(\d+)/i)?.[1] ?? null,
        filter: match[1].match(/\bfilter\s*=\s*["']([^"']+)/i)?.[1] ?? null,
      }));
      if (shortcodes.length) rows.push({ type, id: item.id, uri: source.uri, modified: item.modified, shortcodes });
    }
    if (inspected % 100 < 25 || start + 25 >= ids.length) console.error(`Audited ${inspected} published raw records`);
  }
}
const tableIds = [...new Set(rows.flatMap((row) => row.shortcodes.map((item) => item.tableId).filter(Boolean)))].sort((a, b) => Number(a) - Number(b));
const audit = { source: 'authenticated staging REST raw read', capturedAt: new Date().toISOString(),
  inspected, posts: rows.filter((row) => row.type === 'posts').length,
  pages: rows.filter((row) => row.type === 'pages').length, tableIds, rows };
if (process.argv.includes('--write')) {
  const directory = new URL('../artifacts/staging-ninja-shortcodes/', import.meta.url);
  await mkdir(directory, { recursive: true });
  const path = new URL(`audit-${audit.capturedAt.replaceAll(':', '-')}.json`, directory);
  await writeFile(path, JSON.stringify(audit, null, 2), { flag: 'wx' });
  console.log(JSON.stringify({ inspected, posts: audit.posts, pages: audit.pages,
    distinctTableIds: tableIds.length, output: path.pathname }, null, 2));
} else console.log(JSON.stringify(audit, null, 2));
