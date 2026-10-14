// One-off staging-only homepage editorial draft. Never updates page 16.
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { parseDocument, DomUtils } from 'htmlparser2';

if (process.argv.length !== 3 || process.argv[2] !== '--apply') {
  throw new Error('Usage: node --env-file=.env.local scripts/create-staging-home-editorial-draft.mjs --apply');
}
const site = new URL(process.env.EVERYTIP_WP_BASE_URL ?? '');
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') {
  throw new Error('Only the named staging site is permitted');
}
const user = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!user || !password) throw new Error('Missing staging REST credentials');
const auth = `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`;
const originalId = 16;
const slug = 'migration-draft-home-evergreen-editorial-20261013';
const originalPath = `/wp-json/wp/v2/pages/${originalId}`;
const hash = (value) => createHash('sha256').update(value ?? '').digest('hex');
const text = (html) => DomUtils.textContent(parseDocument(html ?? '', { decodeEntities: true })).replace(/\s+/g, ' ').trim();
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
if (before.id !== originalId || live.id !== originalId || before.slug !== 'home' || live.slug !== 'home' ||
    before.status !== 'publish' || live.status !== 'publish' || !before.content?.raw ||
    hash(text(before.content.rendered)) !== hash(text(live.content.rendered))) {
  throw new Error('Homepage identity or live/staging body parity changed; no draft created');
}
const existing = await request(site, `/wp-json/wp/v2/pages?slug=${slug}&status=any&context=edit&_fields=id,slug,status`);
if (!Array.isArray(existing) || existing.length) throw new Error('The unique staging draft slug is already taken');
const sourceIntro = text(before.content.rendered);
if (!sourceIntro.includes('EveryTip publishes free betting tips daily, for horse racing, greyhound racing, football, cricket, tennis, golf, darts, snooker and rugby.')) {
  throw new Error('Expected homepage editorial topic inventory changed');
}
// Short evergreen paraphrase of the source's topic list. Frequency, rankings,
// dated personalities, offer claims, CTAs and feed contents are omitted.
const content = [
  '<!-- wp:heading {"level":1} -->\n<h1 class="wp-block-heading">Free betting tips from EveryTip</h1>\n<!-- /wp:heading -->',
  '<!-- wp:paragraph -->\n<p>Explore free betting tips for horse racing, greyhound racing, football, cricket, tennis, golf, darts, snooker and rugby.</p>\n<!-- /wp:paragraph -->',
].join('\n\n');
if (/£|free bets|\/go\/|#ad|<a\b/i.test(content)) throw new Error('Commercial content in editorial draft');

const backupDir = new URL('../data/raw/', import.meta.url);
await mkdir(backupDir, { recursive: true });
const backup = new URL('staging-home-original-16-2026-10-13.json', backupDir);
await writeFile(backup, JSON.stringify({ savedAt: new Date().toISOString(), originalId,
  before: { id: before.id, slug: before.slug, status: before.status, modified: before.modified,
    title: before.title?.raw, contentRaw: before.content.raw, contentRendered: before.content.rendered,
    yoastHeadJson: before.yoast_head_json, meta: before.meta },
  draftRequest: { slug, status: 'draft', content },
}, null, 2), { flag: 'wx' });
const created = await request(site, '/wp-json/wp/v2/pages', {
  method: 'POST', headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ slug, status: 'draft', title: 'Homepage — evergreen editorial migration draft', content }),
});
const [draft, after] = await Promise.all([
  request(site, `/wp-json/wp/v2/pages/${created.id}?context=edit`),
  request(site, `${originalPath}?context=edit`),
]);
const originalUnchanged = after.id === originalId && after.slug === before.slug &&
  after.status === 'publish' && after.modified === before.modified &&
  hash(after.content?.raw) === hash(before.content.raw) &&
  hash(JSON.stringify(after.yoast_head_json)) === hash(JSON.stringify(before.yoast_head_json));
const draftValid = draft.id === created.id && draft.slug === slug && draft.status === 'draft' &&
  draft.content?.raw === content;
console.log(JSON.stringify({ environment: 'staging', originalId, originalUnchanged,
  draft: { id: draft.id, slug: draft.slug, status: draft.status, rawEqual: draft.content?.raw === content,
    blockCount: (draft.content?.raw.match(/<!-- wp:/g) ?? []).length,
    yoast: draft.yoast_head_json && { title: draft.yoast_head_json.title,
      description: draft.yoast_head_json.description, robots: draft.yoast_head_json.robots,
      canonical: draft.yoast_head_json.canonical } },
  backup: backup.pathname, sourceVisibleHash: hash(text(before.content.rendered)) }, null, 2));
if (!originalUnchanged || !draftValid) process.exitCode = 1;
