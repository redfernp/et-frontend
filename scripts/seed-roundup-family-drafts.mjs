// Three private staging Gutenberg conversions. Never updates published source posts.
import { parseDocument } from 'htmlparser2';
import { latestContentSnapshot } from '../src/lib/migration-preview.mjs';
import { classicHtmlToBlocks } from '../src/lib/classic-to-gutenberg.mjs';

const specs = [
  { id: 36420, slug: 'online-bookmakers-that-accept-neteller', modified: '2026-02-19T17:57:08', blocks: 130, images: 4 },
  { id: 34873, slug: 'online-bookmakers-that-accept-skrill', modified: '2026-02-23T11:36:42', blocks: 143, images: 7 },
  { id: 34849, slug: 'best-betting-sites-for-basketball', modified: '2026-01-02T13:21:36', blocks: 92, images: 1 },
];
const base = process.env.EVERYTIP_WP_BASE_URL;
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!base || !username || !password) throw new Error('Missing staging REST credentials');
const site = new URL(base);
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') {
  throw new Error('Roundup draft seed is restricted to EveryTip staging');
}
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
const text = (html) => {
  const walk = (node) => node.type === 'text' ? node.data : (node.children ?? []).map(walk).join('');
  return parseDocument(html, { decodeEntities: true }).children.map(walk).join('').replace(/\s+/g, ' ').trim();
};
const snapshot = await latestContentSnapshot();
if (!snapshot) throw new Error('Staging snapshot missing');
const prepared = specs.map((spec) => {
  const capture = snapshot.posts.find((post) => post.databaseId === spec.id && post.uri === `/${spec.slug}.html`);
  if (!capture?.content || capture.slug !== spec.slug || capture.modified !== spec.modified) {
    throw new Error(`Captured source changed: ${spec.id}`);
  }
  const content = classicHtmlToBlocks(capture.content, { imageMode: 'wordpress-upload' });
  if ((content.match(/<!-- wp:/g) ?? []).length !== spec.blocks ||
      (content.match(/<!-- wp:image/g) ?? []).length !== spec.images ||
      text(content) !== text(capture.content) ||
      /<\s*(?:script|iframe|form)\b|\bfl-builder\b/i.test(content)) {
    throw new Error(`Conversion failed structure or text parity: ${spec.id}`);
  }
  return { ...spec, content, draftSlug: `staging-gutenberg-conversion-${spec.slug}-2026`, draftTitle: `STAGING ONLY — ${spec.slug} Gutenberg review` };
});
const results = [];
for (const item of prepared) {
  const source = await json(`/wp-json/wp/v2/posts/${item.id}?context=edit`);
  if (source.id !== item.id || source.slug !== item.slug || source.status !== 'publish' ||
      source.modified !== item.modified || !Array.isArray(source.categories)) {
    throw new Error(`Published source changed; no write for ${item.id}`);
  }
  const drafts = await json(`/wp-json/wp/v2/posts?slug=${item.draftSlug}&status=draft&context=edit&per_page=10`);
  if (drafts.length > 1 || drafts.some((draft) => draft.title?.raw !== item.draftTitle)) {
    throw new Error(`Unexpected draft identity for ${item.id}; refusing write`);
  }
  let draft = drafts[0];
  if (!draft) {
    draft = await json('/wp-json/wp/v2/posts', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: item.draftTitle, slug: item.draftSlug, status: 'draft', content: item.content,
        categories: source.categories,
        excerpt: 'Staging-only roundup conversion. Legacy bookmaker lists, payment claims and offers require editorial verification. Do not publish.',
      }),
    });
  } else if (draft.content?.raw !== item.content || JSON.stringify(draft.categories) !== JSON.stringify(source.categories)) {
    draft = await json(`/wp-json/wp/v2/posts/${draft.id}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: item.content, categories: source.categories }),
    });
  }
  const readBack = await json(`/wp-json/wp/v2/posts/${draft.id}?context=edit`);
  const verified = readBack.status === 'draft' && readBack.slug === item.draftSlug &&
    readBack.title?.raw === item.draftTitle && readBack.content?.raw === item.content &&
    JSON.stringify(readBack.categories) === JSON.stringify(source.categories);
  results.push({ sourceId: item.id, draftId: draft.id, status: readBack.status, blocks: item.blocks, verified });
  if (!verified) break;
}
console.log(JSON.stringify({ environment: 'staging', results }, null, 2));
if (results.length !== specs.length || results.some((result) => !result.verified)) process.exitCode = 1;
