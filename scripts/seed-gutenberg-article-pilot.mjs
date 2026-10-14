// Create/read back one staging-only draft from a reviewed local conversion.
// Run with: node --env-file=.env.local scripts/seed-gutenberg-article-pilot.mjs seymour
// Or:       node --env-file=.env.local scripts/seed-gutenberg-article-pilot.mjs john
import { readFile } from 'node:fs/promises';

const base = process.env.EVERYTIP_WP_BASE_URL;
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!base || !username || !password) throw new Error('Missing staging REST credentials');
const site = new URL(base);
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') {
  throw new Error('Draft seeding is restricted to EveryTip staging');
}

const candidates = {
  seymour: {
    sourceId: 77061,
    sourceSlug: 'saturdays-horse-racing-preview-tips-7th-december-2024-seymour-biz',
    sourceModified: '2025-06-04T21:55:16',
    pilotSlug: 'staging-gutenberg-conversion-seymour-2024-12-07',
    pilotTitle: 'STAGING ONLY — Gutenberg conversion review — Seymour Biz 7 Dec 2024',
    minimumBlocks: 30,
  },
  john: {
    sourceId: 90351,
    sourceSlug: 'epl-game-week-4-2026-27-season-premier-league-tips-john-newsome',
    sourceModified: '2026-09-07T08:23:00',
    pilotSlug: 'staging-gutenberg-conversion-john-newsome-2026-gw4',
    pilotTitle: 'STAGING ONLY — Gutenberg conversion review — John Newsome GW4',
    minimumBlocks: 275,
  },
};
const candidate = candidates[process.argv[2]];
if (!candidate) throw new Error('Choose seymour or john');
const { sourceId, sourceSlug, sourceModified, pilotSlug, pilotTitle, minimumBlocks } = candidate;
const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
const headers = { Authorization: authorization };
const json = async (path, options = {}) => {
  const response = await fetch(new URL(path, site), {
    ...options,
    headers: { ...headers, ...options.headers },
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) throw new Error(`Staging REST ${options.method ?? 'GET'} failed: HTTP ${response.status}`);
  return response.json();
};

const source = await json(`/wp-json/wp/v2/posts/${sourceId}?context=edit`);
if (source.slug !== sourceSlug || source.status !== 'publish' || source.modified !== sourceModified) {
  throw new Error('Source article changed; reconvert before seeding');
}
const content = await readFile(new URL(`../data/raw/wp-gutenberg-preview-${sourceId}.html`, import.meta.url), 'utf8');
if ((content.match(/<!-- wp:/g) ?? []).length < minimumBlocks ||
    content.includes('saturday-horse-racing-tips-and-previews-from-expert-tipster-seymour-biz-on-everytip.png') ||
    content.includes('John-Newsome-Football-Betting-Tips-everytip.png')) {
  throw new Error('Pilot content failed block/portrait guard');
}
const matches = await json(`/wp-json/wp/v2/posts?slug=${pilotSlug}&status=draft&context=edit&per_page=10`);
if (matches.length > 1 || matches.some((post) => post.title?.raw !== pilotTitle)) {
  throw new Error('Pilot slug has an unexpected existing record');
}
const post = matches[0] ?? await json('/wp-json/wp/v2/posts', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: pilotTitle,
    slug: pilotSlug,
    status: 'draft',
    content,
    excerpt: 'Staging-only Gutenberg conversion pilot. Do not publish.',
  }),
});
const readBack = await json(`/wp-json/wp/v2/posts/${post.id}?context=edit`);
const verified = readBack.status === 'draft' && readBack.slug === pilotSlug &&
  readBack.title?.raw === pilotTitle && readBack.content?.raw === content;
console.log(JSON.stringify({ environment: 'staging', id: post.id, status: readBack.status, sourceId, blocks: (content.match(/<!-- wp:/g) ?? []).length, verified }));
if (!verified) process.exitCode = 1;
