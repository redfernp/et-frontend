// Staging-only Gutenberg draft copied from the reviewed PayPal conversion preview.
// Never modifies the published source or creates a live article.
import { readFile } from 'node:fs/promises';

const base = process.env.EVERYTIP_WP_BASE_URL;
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!base || !username || !password) throw new Error('Missing staging REST credentials');
const site = new URL(base);
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') {
  throw new Error('PayPal pilot is restricted to EveryTip staging');
}
const sourceId = 58743;
const sourceSlug = 'best-paypal-betting-sites';
const sourceModified = '2026-09-25T18:21:16';
const slug = 'staging-gutenberg-conversion-paypal-roundup-2026';
const title = 'STAGING ONLY — PayPal roundup Gutenberg review';
const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
const json = async (path, options = {}) => {
  const response = await fetch(new URL(path, site), {
    ...options,
    headers: { Authorization: authorization, ...options.headers },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Staging REST ${options.method ?? 'GET'} ${path} returned HTTP ${response.status}`);
  return response.json();
};

const source = await json(`/wp-json/wp/v2/posts/${sourceId}?context=edit`);
if (source.id !== sourceId || source.slug !== sourceSlug || source.status !== 'publish' || source.modified !== sourceModified) {
  throw new Error('Published PayPal guide changed; refresh the snapshot and reconvert before seeding');
}
if (!Array.isArray(source.categories) || !source.categories.length) throw new Error('Source guide categories unavailable');
const content = await readFile(new URL(`../data/raw/wp-gutenberg-preview-${sourceId}.html`, import.meta.url), 'utf8');
if ((content.match(/<!-- wp:/g) ?? []).length !== 200 ||
    (content.match(/<!-- wp:acf\/everytip-offer-slot /g) ?? []).length !== 4 ||
    (content.match(/<!-- wp:table -->/g) ?? []).length !== 1 ||
    /<a\b|fl-builder|ninja_table/i.test(content)) {
  throw new Error('Local guide conversion failed the draft safety guard');
}
const matches = await json(`/wp-json/wp/v2/posts?slug=${slug}&status=draft&context=edit&per_page=10`);
if (matches.length > 1 || matches.some((post) => post.title?.raw !== title)) {
  throw new Error('Unexpected existing draft identity; refusing write');
}
let pilot = matches[0];
if (!pilot) {
  pilot = await json('/wp-json/wp/v2/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, slug, status: 'draft', content, categories: source.categories, excerpt: 'Staging-only conversion; payment facts and offers require verification. Do not publish.' }),
  });
} else if (pilot.content?.raw !== content || JSON.stringify(pilot.categories) !== JSON.stringify(source.categories)) {
  pilot = await json(`/wp-json/wp/v2/posts/${pilot.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, categories: source.categories }),
  });
}
const readBack = await json(`/wp-json/wp/v2/posts/${pilot.id}?context=edit`);
const verified = readBack.status === 'draft' && readBack.slug === slug &&
  readBack.title?.raw === title && readBack.content?.raw === content &&
  JSON.stringify(readBack.categories) === JSON.stringify(source.categories);
console.log(JSON.stringify({ environment: 'staging', sourceId, pilotId: pilot.id, status: readBack.status, blocks: (content.match(/<!-- wp:/g) ?? []).length, verified }, null, 2));
if (!verified) process.exitCode = 1;
