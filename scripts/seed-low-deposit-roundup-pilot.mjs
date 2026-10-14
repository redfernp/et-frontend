// Create or refresh one private staging draft; never change the published guide.
import { parseDocument } from 'htmlparser2';
import { latestContentSnapshot } from '../src/lib/migration-preview.mjs';
import { classicHtmlToBlocks } from '../src/lib/classic-to-gutenberg.mjs';

const base = process.env.EVERYTIP_WP_BASE_URL;
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!base || !username || !password) throw new Error('Missing staging REST credentials');
const site = new URL(base);
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') {
  throw new Error('Low-deposit pilot is restricted to EveryTip staging');
}
const sourceId = 33470;
const sourceSlug = 'low-or-no-minimum-deposit-betting-sites';
const sourceUri = '/low-or-no-minimum-deposit-betting-sites.html';
const draftSlug = 'staging-gutenberg-conversion-low-deposit-roundup-2026';
const draftTitle = 'STAGING ONLY — low-deposit roundup Gutenberg review';
const snapshot = await latestContentSnapshot();
const sourceCapture = snapshot?.posts?.find((post) => post.databaseId === sourceId && post.uri === sourceUri);
if (!sourceCapture?.content || sourceCapture.slug !== sourceSlug || sourceCapture.modified !== '2026-09-25T10:41:58') {
  throw new Error('Exact captured source identity or modification date changed');
}
const content = classicHtmlToBlocks(sourceCapture.content, { imageMode: 'wordpress-upload' });
const text = (html) => {
  const walk = (node) => node.type === 'text' ? node.data : (node.children ?? []).map(walk).join('');
  return parseDocument(html, { decodeEntities: true }).children.map(walk).join('').replace(/\s+/g, ' ').trim();
};
const blocks = (content.match(/<!-- wp:/g) ?? []).length;
if (blocks !== 67 || text(sourceCapture.content) !== text(content) ||
    (content.match(/<!-- wp:image/g) ?? []).length !== 4 ||
    /<\s*(?:script|iframe|form)\b|\bfl-builder\b/i.test(content)) {
  throw new Error('Low-deposit conversion failed structure or editorial text-parity guard');
}

const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
const json = async (path, options = {}) => {
  const response = await fetch(new URL(path, site), {
    ...options,
    headers: { Authorization: authorization, ...options.headers },
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Staging REST ${options.method ?? 'GET'} ${path} returned HTTP ${response.status}`);
  return response.json();
};
const source = await json(`/wp-json/wp/v2/posts/${sourceId}?context=edit`);
if (source.id !== sourceId || source.slug !== sourceSlug || source.status !== 'publish' ||
    source.modified !== sourceCapture.modified || !Array.isArray(source.categories)) {
  throw new Error('Published source changed; refresh the snapshot before seeding');
}
const drafts = await json(`/wp-json/wp/v2/posts?slug=${draftSlug}&status=draft&context=edit&per_page=10`);
if (drafts.length > 1 || drafts.some((post) => post.title?.raw !== draftTitle)) {
  throw new Error('Unexpected existing draft identity; refusing write');
}
let draft = drafts[0];
if (!draft) {
  draft = await json('/wp-json/wp/v2/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: draftTitle, slug: draftSlug, status: 'draft', content,
      categories: source.categories,
      excerpt: 'Staging-only conversion. Legacy minimum-deposit figures, bookmaker offers and terms require editorial verification. Do not publish.',
    }),
  });
} else if (draft.content?.raw !== content || JSON.stringify(draft.categories) !== JSON.stringify(source.categories)) {
  draft = await json(`/wp-json/wp/v2/posts/${draft.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, categories: source.categories }),
  });
}
const readBack = await json(`/wp-json/wp/v2/posts/${draft.id}?context=edit`);
const verified = readBack.status === 'draft' && readBack.slug === draftSlug &&
  readBack.title?.raw === draftTitle && readBack.content?.raw === content &&
  JSON.stringify(readBack.categories) === JSON.stringify(source.categories);
console.log(JSON.stringify({ environment: 'staging', sourceId, draftId: draft.id, status: readBack.status, blocks, verified }, null, 2));
if (!verified) process.exitCode = 1;
