// Read-only fresh live/staging audit for the exact Bet365 review WordPress page.
import { createHash } from 'node:crypto';
import { parseDocument, DomUtils } from 'htmlparser2';
import { extractBet365ReviewEditorial } from '../src/lib/bet365-review-editorial.mjs';

const base = new URL(process.env.EVERYTIP_WP_BASE_URL ?? '');
if (base.protocol !== 'https:' || base.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') {
  throw new Error('Expected the named EveryTip staging site');
}
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!username || !password) throw new Error('Missing staging REST credentials');
const id = 87553;
const path = `/wp-json/wp/v2/pages/${id}`;
const auth = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
async function read(origin, editable = false) {
  const url = new URL(`${path}?context=${editable ? 'edit' : 'view'}`, origin);
  const response = await fetch(url, { headers: editable ? { Authorization: auth } : {}, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`${origin} HTTP ${response.status}`);
  const page = await response.json();
  if (page.id !== id || page.slug !== 'bet365-review' || page.status !== 'publish') throw new Error('Page identity mismatch');
  return page;
}
const [live, staging] = await Promise.all([
  read('https://www.everytip.co.uk'), read(base, true),
]);
const text = (html) => DomUtils.textContent(parseDocument(html ?? '', { decodeEntities: true })).replace(/\s+/g, ' ').trim();
const hash = (value) => createHash('sha256').update(value).digest('hex');
const extracted = extractBet365ReviewEditorial({ databaseId: id, slug: staging.slug,
  uri: '/bet365-review', status: staging.status, modified: staging.modified,
  content: staging.content.rendered });
const candidates = [
  ['method', extracted.methodHtml],
  ...extracted.sections.map((section) => [`section-${section.number}:${section.title}`, section.html]),
  ['verdict', extracted.verdictHtml],
].map(([label, html]) => ({ label, paragraphs: [...parseDocument(html, { decodeEntities: true }).children]
  .filter((node) => node.name === 'p').map((node) => DomUtils.textContent(node).replace(/\s+/g, ' ').trim().slice(0, 320)) }));
function summary(page, editable) {
  const raw = page.content?.raw ?? '';
  const rendered = page.content?.rendered ?? '';
  const visible = text(rendered);
  const claims = [...visible.matchAll(/.{0,90}(?:£20|£30|bet £10|free bets|Seymour Biz Final Verdict).{0,100}/gi)].map((match) => match[0]).slice(0, 15);
  return {
    id: page.id, slug: page.slug, status: page.status, title: page.title?.raw ?? page.title?.rendered,
    modified: page.modified, visibleLength: visible.length, visibleHash: hash(visible),
    renderedHash: hash(rendered), rawLength: editable ? raw.length : undefined,
    rawHash: editable ? hash(raw) : undefined, gutenberg: editable ? /<!--\s*wp:/.test(raw) : undefined,
    links: [...rendered.matchAll(/<a\s[^>]*href=["']([^"']+)/gi)].length,
    images: [...rendered.matchAll(/<img\s/gi)].length,
    claims, seo: page.yoast_head_json && {
      title: page.yoast_head_json.title, description: page.yoast_head_json.description,
      robots: page.yoast_head_json.robots, canonical: page.yoast_head_json.canonical,
    },
  };
}
console.log(JSON.stringify({ auditedAt: new Date().toISOString(), readOnly: true,
  live: summary(live, false), staging: summary(staging, true),
  sameVisible: hash(text(live.content.rendered)) === hash(text(staging.content.rendered)),
  sameRendered: hash(live.content.rendered) === hash(staging.content.rendered),
  candidates,
}, null, 2));
