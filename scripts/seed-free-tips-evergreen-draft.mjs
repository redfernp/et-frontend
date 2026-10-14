// Staging-only, source-locked Gutenberg draft of the free-tips hub's long-form
// editorial section. Never updates the published page or an existing draft.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseDocument } from 'htmlparser2';
import { extractFreeTipsEditorial } from '../src/lib/free-tips-editorial.mjs';
import { classicHtmlToBlocks } from '../src/lib/classic-to-gutenberg.mjs';

const sourceId = 76939;
const sourceSlug = 'free-betting-tips';
const sourceModified = '2026-09-30T11:11:04';
const sourceRawHash = '09ad858b6a0ffaa25cff76488e59354712972f28529b2501ef47851b342ba84f';
const draftSlug = 'staging-free-tips-evergreen-gutenberg-2026-10-13';
const draftTitle = 'STAGING ONLY — Free Betting Tips evergreen Gutenberg review';
const backup = JSON.parse(await readFile(resolve('data/raw/free-tips-source-76939-2026-10-13.json'), 'utf8'));
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const visibleText = (html) => {
  const walk = (node) => node.type === 'text' ? node.data : (node.children ?? []).map(walk).join('');
  return parseDocument(html.replace(/<\/(?:p|h[2-4]|li|blockquote|ul|ol)>/gi, '$& '), { decodeEntities: true })
    .children.map(walk).join('').replace(/\s+/g, ' ').trim();
};
if (backup.id !== sourceId || backup.slug !== sourceSlug || backup.status !== 'publish' ||
    backup.modified !== sourceModified || backup.rawSha256 !== sourceRawHash ||
    sha256(backup.raw) !== sourceRawHash || sha256(backup.rendered) !== backup.renderedSha256) {
  throw new Error('Local free-tips source backup failed identity/hash checks');
}
const editorial = extractFreeTipsEditorial({ uri: '/free-betting-tips', content: backup.rendered });
const content = classicHtmlToBlocks(editorial.html);
const plannedText = visibleText(editorial.html);
if ((content.match(/<!-- wp:/g) ?? []).length !== 34 || editorial.headingCount !== 16 ||
    plannedText !== visibleText(content) ||
    /<a\b|\/go\/|\[et_offer_news\]|\[fl_builder|\bfl-builder\b|<\s*(?:script|iframe|form|style|img|table)\b/i.test(content)) {
  throw new Error('Unsafe or changed evergreen Gutenberg extraction');
}
const receipt = { environment: 'staging', sourceId, sourceModified, sourceRawHash,
  draftSlug, blockCount: 34, editorialNodes: editorial.sourceNodeCount,
  textSha256: sha256(plannedText), contentSha256: sha256(content),
  activeLinks: 0, currentTips: 0, newsShortcodes: 0, offerSlots: 0 };
if (!process.argv.includes('--apply')) {
  console.log(JSON.stringify({ mode: 'dry-run', ...receipt }, null, 2));
  process.exit(0);
}
const site = new URL(process.env.EVERYTIP_WP_BASE_URL ?? '');
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com' ||
    site.pathname !== '/' || site.search || site.hash || site.username || site.password) {
  throw new Error('Free-tips draft writer is restricted to the named EveryTip staging host');
}
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!username || !password) throw new Error('Missing staging REST credentials');
const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
async function json(path, options = {}) {
  const response = await fetch(new URL(path, site), {
    ...options, headers: { Authorization: authorization, ...options.headers }, signal: AbortSignal.timeout(45000),
  });
  if (!response.ok) throw new Error(`Staging REST ${options.method ?? 'GET'} ${path}: HTTP ${response.status}`);
  return response.json();
}
function checkSource(source) {
  if (source.id !== sourceId || source.slug !== sourceSlug || source.status !== 'publish' ||
      source.modified !== sourceModified || sha256(source.content?.raw ?? '') !== sourceRawHash ||
      source.title?.raw !== backup.title ||
      source.yoast_head_json?.title !== backup.seo.title ||
      source.yoast_head_json?.description !== backup.seo.description ||
      source.yoast_head_json?.canonical !== backup.seo.canonical ||
      JSON.stringify(source.yoast_head_json?.robots ?? null) !== JSON.stringify(backup.seo.robots ?? null)) {
    throw new Error('Published free-tips source or SEO drifted; draft write stopped');
  }
}
const original = await json(`/wp-json/wp/v2/pages/${sourceId}?context=edit`);
checkSource(original);
const matches = await json(`/wp-json/wp/v2/pages?slug=${draftSlug}&status=any&context=edit&per_page=10`);
if (!Array.isArray(matches) || matches.length > 1 ||
    matches.some((page) => page.status !== 'draft' || page.slug !== draftSlug ||
      page.title?.raw !== draftTitle || page.content?.raw !== content)) {
  throw new Error('Draft slug is occupied or differs from planned content; no write');
}
let draft = matches[0];
let created = false;
if (!draft) {
  draft = await json('/wp-json/wp/v2/pages', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: draftTitle, slug: draftSlug, status: 'draft', content,
      excerpt: 'Unpublished staging Gutenberg editorial test. Current tips, news, bookmaker offers and active links are withheld. Editorial claims require review.' }),
  });
  created = true;
  console.log(JSON.stringify({ phase: 'created', draftId: draft.id, status: draft.status, slug: draft.slug }));
}
if (!Number.isInteger(draft.id) || draft.id === sourceId) throw new Error('Draft ID is invalid or collides with source');
const readBack = await json(`/wp-json/wp/v2/pages/${draft.id}?context=edit`);
const renderedText = visibleText(readBack.content?.rendered ?? '');
const verified = readBack.id === draft.id && readBack.status === 'draft' && readBack.slug === draftSlug &&
  readBack.title?.raw === draftTitle && readBack.content?.raw === content &&
  renderedText === plannedText &&
  !/<a\b|\/go\/|\[et_offer_news\]|\bfl-builder\b/i.test(readBack.content?.rendered ?? '');
const sourceAfter = await json(`/wp-json/wp/v2/pages/${sourceId}?context=edit`);
checkSource(sourceAfter);
const result = { mode: created ? 'created' : 'already-present', ...receipt, draftId: draft.id,
  draftStatus: readBack.status, renderedTextSha256: sha256(renderedText),
  publishedSourceUnchanged: true, draftVerified: verified };
console.log(JSON.stringify(result, null, 2));
if (!verified) process.exitCode = 1;
