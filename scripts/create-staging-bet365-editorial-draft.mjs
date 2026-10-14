// One-off staging-only Bet365 editorial draft. Never updates the published page.
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { parseDocument, DomUtils } from 'htmlparser2';
import { extractBet365ReviewEditorial } from '../src/lib/bet365-review-editorial.mjs';

if (process.argv.length !== 3 || process.argv[2] !== '--apply') {
  throw new Error('Usage: node --env-file=.env.local scripts/create-staging-bet365-editorial-draft.mjs --apply');
}
const site = new URL(process.env.EVERYTIP_WP_BASE_URL ?? '');
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') {
  throw new Error('Only the named staging site is permitted');
}
const user = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!user || !password) throw new Error('Missing staging REST credentials');
const auth = `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`;
const originalId = 87553;
const slug = 'migration-draft-bet365-review-editorial-20261013';
const originalPath = `/wp-json/wp/v2/pages/${originalId}`;
const hash = (value) => createHash('sha256').update(value ?? '').digest('hex');
const text = (html) => DomUtils.textContent(parseDocument(html ?? '', { decodeEntities: true })).replace(/\s+/g, ' ').trim();
const escapeHtml = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
async function request(origin, path, options = {}, authenticated = true) {
  const response = await fetch(new URL(path, origin), {
    ...options, headers: { ...(authenticated ? { Authorization: auth } : {}), ...options.headers },
    signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error(`${options.method ?? 'GET'} ${path.split('?')[0]}: HTTP ${response.status}`);
  return response.json();
}
const [before, live] = await Promise.all([
  request(site, `${originalPath}?context=edit`),
  request('https://www.everytip.co.uk', originalPath, {}, false),
]);
if (before.id !== originalId || live.id !== originalId || before.slug !== 'bet365-review' ||
    live.slug !== 'bet365-review' || before.status !== 'publish' || live.status !== 'publish' ||
    !before.content?.raw || hash(text(before.content.rendered)) !== hash(text(live.content.rendered))) {
  throw new Error('Published source identity, body or live/staging parity changed; no draft created');
}
const existing = await request(site, `/wp-json/wp/v2/pages?slug=${slug}&status=any&context=edit&_fields=id,slug,status`);
if (!Array.isArray(existing) || existing.length) throw new Error('The unique staging draft slug is already taken');

const editorial = extractBet365ReviewEditorial({ databaseId: originalId, uri: '/bet365-review',
  slug: before.slug, status: before.status, modified: before.modified,
  content: before.content.rendered });
const onlyParagraph = (html) => {
  const nodes = parseDocument(html, { decodeEntities: true }).children.filter((node) => node.name === 'p');
  return nodes.map((node) => DomUtils.textContent(node).replace(/\s+/g, ' ').trim());
};
const method = onlyParagraph(editorial.methodHtml);
const verdict = onlyParagraph(editorial.verdictHtml);
if (method.length !== 1 || verdict.length !== 2 || !method[0].includes('real £20 bankroll') ||
    !verdict[0].startsWith('“I tried patents, Lucky 15s') ||
    /£30|free bets|\/go\/|claim|sign.?up|#ad/i.test(`${method[0]} ${verdict[0]}`)) {
  throw new Error('Strict source-copy contract changed; no draft created');
}
const block = (name, inner) => `<!-- wp:${name} -->\n${inner}\n<!-- /wp:${name} -->`;
const content = [
  block('heading', '<h2 class="wp-block-heading">How Seymour tested the platform</h2>'),
  block('paragraph', `<p>${escapeHtml(method[0])}</p>`),
  block('heading', '<h2 class="wp-block-heading">Seymour’s first-hand verdict</h2>'),
  block('paragraph', `<p>${escapeHtml(verdict[0])}</p>`),
].join('\n\n');
if ((content.match(/<!-- wp:/g) ?? []).length !== 4) throw new Error('Unexpected block count');

const backupDir = new URL('../data/raw/', import.meta.url);
await mkdir(backupDir, { recursive: true });
const backup = new URL('staging-bet365-review-original-87553-2026-10-13.json', backupDir);
await writeFile(backup, JSON.stringify({ savedAt: new Date().toISOString(), originalId,
  before: { id: before.id, slug: before.slug, status: before.status, modified: before.modified,
    title: before.title?.raw, contentRaw: before.content.raw, contentRendered: before.content.rendered,
    yoastHeadJson: before.yoast_head_json, meta: before.meta },
  draftRequest: { slug, status: 'draft', content },
}, null, 2), { flag: 'wx' });

const created = await request(site, '/wp-json/wp/v2/pages', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ slug, status: 'draft', title: 'Bet365 review — editorial migration draft', content }),
});
const [draft, after] = await Promise.all([
  request(site, `/wp-json/wp/v2/pages/${created.id}?context=edit`),
  request(site, `${originalPath}?context=edit`),
]);
const stableOriginal = after.id === originalId && after.status === 'publish' &&
  after.slug === before.slug && after.modified === before.modified &&
  hash(after.content?.raw) === hash(before.content.raw) &&
  hash(JSON.stringify(after.yoast_head_json)) === hash(JSON.stringify(before.yoast_head_json));
const draftValid = draft.id === created.id && draft.slug === slug && draft.status === 'draft' &&
  draft.content?.raw === content && !/£30|free bets|\/go\/|#ad|<a\b/i.test(draft.content.raw);
console.log(JSON.stringify({ environment: 'staging', originalId, originalUnchanged: stableOriginal,
  draft: { id: draft.id, slug: draft.slug, status: draft.status, rawEqual: draft.content?.raw === content,
    blockCount: (draft.content?.raw.match(/<!-- wp:/g) ?? []).length,
    yoast: draft.yoast_head_json && { title: draft.yoast_head_json.title,
      description: draft.yoast_head_json.description, robots: draft.yoast_head_json.robots,
      canonical: draft.yoast_head_json.canonical },
  }, backup: backup.pathname, sourceVisibleHash: hash(text(before.content.rendered)) }, null, 2));
if (!stableOriginal || !draftValid) process.exitCode = 1;
