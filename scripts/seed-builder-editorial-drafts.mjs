// Staging-only Gutenberg draft copies of selected builder roundup editorial.
// Existing published pages are never updated. Run with --apply to write.
import { parseDocument } from 'htmlparser2';
import { latestContentSnapshot } from '../src/lib/migration-preview.mjs';
import { extractBuilderRoundup } from '../src/lib/builder-roundup-preview.mjs';
import { classicHtmlToBlocks } from '../src/lib/classic-to-gutenberg.mjs';

const specs = [
  { id: 75678, uri: '/best-bookie-for-lucky-15-bets-uk-ireland', modified: '2026-09-25T18:18:17', blocks: 58, withheld: 45 },
  { id: 75043, uri: '/what-is-best-way-to-bet-on-greyhounds', modified: '2026-09-25T18:37:08', blocks: 80, withheld: 16 },
  { id: 75853, uri: '/high-stakes-betting-sites-for-high-rollers-vips', modified: '2026-09-25T18:27:05', blocks: 70, withheld: 16 },
];
const site = new URL(process.env.EVERYTIP_WP_BASE_URL ?? 'https://wordpress-159231-2098144.cloudwaysapps.com');
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') {
  throw new Error('Only the named EveryTip staging host is permitted');
}
const apply = process.argv.includes('--apply');
const text = (html) => {
  const walk = (node) => node.type === 'text' ? node.data : (node.children ?? []).map(walk).join('');
  return parseDocument(html.replace(/<\/(?:p|h[2-4]|li|blockquote|ul|ol)>/gi, '$& '), { decodeEntities: true })
    .children.map(walk).join('').replace(/\s+/g, ' ').trim();
};
const snapshot = await latestContentSnapshot();
if (!snapshot) throw new Error('Missing captured source snapshot');
const prepared = specs.map((spec) => {
  const source = snapshot.pages.find((page) => page.databaseId === spec.id && page.uri === spec.uri);
  if (!source || source.modified !== spec.modified || !source.content) throw new Error(`Source changed: ${spec.id}`);
  const editorial = extractBuilderRoundup(source);
  const selected = `${editorial.intro}\n${editorial.body}`;
  const content = classicHtmlToBlocks(selected);
  if (text(content) !== text(selected) || (content.match(/<!-- wp:/g) ?? []).length !== spec.blocks ||
      editorial.withheldNodes !== spec.withheld || /<\s*(?:script|iframe|form)\b|\bfl-builder\b|\/go\/|sign-up-offer/i.test(content)) {
    throw new Error(`Unsafe or changed conversion: ${spec.id}`);
  }
  const slug = spec.uri.slice(1);
  return { ...spec, slug, content,
    draftSlug: `staging-gutenberg-editorial-${slug}-2026`,
    draftTitle: `STAGING ONLY — ${source.title} editorial conversion`,
  };
});
if (!apply) {
  console.log(JSON.stringify({ mode: 'dry-run', prepared: prepared.map(({ id, uri, blocks, withheld }) => ({ id, uri, blocks, withheld })) }, null, 2));
  process.exit(0);
}
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!username || !password) throw new Error('Missing staging REST credentials');
const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
const json = async (path, options = {}) => {
  const response = await fetch(new URL(path, site), {
    ...options, headers: { Authorization: authorization, ...options.headers }, signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Staging REST ${options.method ?? 'GET'} ${path}: HTTP ${response.status}`);
  return response.json();
};
const results = [];
for (const item of prepared) {
  const source = await json(`/wp-json/wp/v2/pages/${item.id}?context=edit`);
  if (source.id !== item.id || source.slug !== item.slug || source.status !== 'publish' || source.modified !== item.modified) {
    throw new Error(`Published source differs from snapshot: ${item.id}`);
  }
  const matches = await json(`/wp-json/wp/v2/pages?slug=${item.draftSlug}&status=draft&context=edit&per_page=10`);
  if (matches.length > 1 || matches.some((page) => page.title?.raw !== item.draftTitle)) {
    throw new Error(`Unexpected draft identity: ${item.id}`);
  }
  let draft = matches[0];
  if (!draft) {
    draft = await json('/wp-json/wp/v2/pages', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: item.draftTitle, slug: item.draftSlug, status: 'draft', content: item.content,
        excerpt: 'Staging-only editorial conversion. Legacy rankings, claims and offers are withheld. Do not publish.' }),
    });
  } else if (draft.content?.raw !== item.content) {
    draft = await json(`/wp-json/wp/v2/pages/${draft.id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: item.content }),
    });
  }
  const verified = await json(`/wp-json/wp/v2/pages/${draft.id}?context=edit`);
  const ok = verified.status === 'draft' && verified.slug === item.draftSlug &&
    verified.title?.raw === item.draftTitle && verified.content?.raw === item.content;
  results.push({ sourceId: item.id, draftId: verified.id, status: verified.status, blocks: item.blocks, verified: ok });
  if (!ok) throw new Error(`Staging read-back mismatch: ${item.id}`);
}
console.log(JSON.stringify({ environment: 'staging', results }, null, 2));
