// Apply an owner-reviewed columnist block conversion to its original staging post.
// Never run against live. Usage:
// node --env-file=.env.local scripts/apply-staging-article-conversion.mjs seymour --apply
// node --env-file=.env.local scripts/apply-staging-article-conversion.mjs john --apply
// node --env-file=.env.local scripts/apply-staging-article-conversion.mjs seymour_2026_09_26 --apply
import { readFile, writeFile } from 'node:fs/promises';

const candidates = {
  seymour: {
    id: 77061,
    slug: 'saturdays-horse-racing-preview-tips-7th-december-2024-seymour-biz',
    modified: '2025-06-04T21:55:16',
    blocks: 33,
  },
  john: {
    id: 90351,
    slug: 'epl-game-week-4-2026-27-season-premier-league-tips-john-newsome',
    modified: '2026-09-07T08:23:00',
    blocks: 280,
  },
  seymour_2026_09_26: {
    id: 90616,
    slug: 'saturdays-horse-racing-preview-tips-26th-september-2026-seymour-biz',
    modified: '2026-09-25T16:18:42',
    blocks: 36,
  },
};
const candidate = candidates[process.argv[2]];
if (!candidate || process.argv[3] !== '--apply') throw new Error('Choose a listed article key and pass --apply');
const base = process.env.EVERYTIP_WP_BASE_URL;
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!base || !username || !password) throw new Error('Missing staging REST credentials');
const site = new URL(base);
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') {
  throw new Error('Conversion is restricted to EveryTip staging');
}

const { id } = candidate;
const endpoint = new URL(`/wp-json/wp/v2/posts/${id}`, site);
const auth = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
const request = async (path, options = {}) => {
  const response = await fetch(new URL(path, site), {
    ...options,
    headers: { Authorization: auth, ...options.headers },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Staging REST ${options.method ?? 'GET'} failed: HTTP ${response.status}`);
  return response.json();
};
const read = () => request(`/wp-json/wp/v2/posts/${id}?context=edit`);
const before = await read();
const converted = await readFile(new URL(`../data/raw/wp-gutenberg-preview-${id}.html`, import.meta.url), 'utf8');
if (before.slug !== candidate.slug || before.status !== 'publish' || before.id !== id) {
  throw new Error('Source identity/status changed; refusing conversion');
}
if (before.content?.raw === converted) {
  console.log(JSON.stringify({ environment: 'staging', id, alreadyConverted: true, status: before.status }));
  process.exit(0);
}
const original = await readFile(new URL(`../data/raw/wp-rest-post-${id}.raw.html`, import.meta.url), 'utf8');
if (before.modified !== candidate.modified || before.content?.raw !== original) {
  throw new Error('Source was edited after the local backup; refusing conversion');
}
if ((converted.match(/<!-- wp:/g) ?? []).length !== candidate.blocks ||
    converted.includes('saturday-horse-racing-tips-and-previews-from-expert-tipster-seymour-biz-on-everytip.png') ||
    converted.includes('John-Newsome-Football-Betting-Tips-everytip.png')) {
  throw new Error('Unexpected converted block source');
}
const stable = (post) => ({
  slug: post.slug,
  status: post.status,
  title: post.title?.raw,
  date: post.date,
  author: post.author,
  categories: post.categories,
  tags: post.tags,
});
const seo = (post) => {
  const value = post.yoast_head_json;
  return value ? { title: value.title, description: value.description, canonical: value.canonical, robots: value.robots } : null;
};
await writeFile(new URL(`../data/raw/wp-preconversion-${id}.json`, import.meta.url),
  JSON.stringify({ id, savedAt: new Date().toISOString(), ...stable(before), content: original, seo: seo(before) }, null, 2),
  { flag: 'wx' });
await request(endpoint.pathname, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: converted }),
});
const after = await read();
const contentVerified = after.content?.raw === converted;
const metadataStable = JSON.stringify(stable(after)) === JSON.stringify(stable(before));
const seoComparable = seo(before) !== null && seo(after) !== null;
const seoStable = seoComparable ? JSON.stringify(seo(after)) === JSON.stringify(seo(before)) : null;
console.log(JSON.stringify({ environment: 'staging', id, status: after.status, contentVerified, metadataStable, seoComparable, seoStable }));
if (!contentVerified || !metadataStable || seoStable === false) process.exitCode = 1;
