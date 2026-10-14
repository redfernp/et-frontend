// Read-only exact-homepage source shape and editorial boundary audit.
import { createHash } from 'node:crypto';
import { parseDocument, DomUtils } from 'htmlparser2';
import { extractHomeEditorial } from '../src/lib/home-editorial.mjs';

const site = new URL(process.env.EVERYTIP_WP_BASE_URL ?? '');
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') throw new Error('Wrong staging host');
const user = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!user || !password) throw new Error('Missing staging REST credentials');
const auth = `Basic ${Buffer.from(`${user}:${password}`).toString('base64')}`;
async function get(origin, edit = false) {
  const response = await fetch(new URL(`/wp-json/wp/v2/pages/16?context=${edit ? 'edit' : 'view'}`, origin), {
    headers: edit ? { Authorization: auth } : {}, signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`${origin}: HTTP ${response.status}`);
  const page = await response.json();
  if (page.id !== 16 || page.status !== 'publish') throw new Error('Homepage identity/status mismatch');
  return page;
}
const [live, staging] = await Promise.all([get('https://www.everytip.co.uk'), get(site, true)]);
const text = (html) => DomUtils.textContent(parseDocument(html ?? '', { decodeEntities: true })).replace(/\s+/g, ' ').trim();
const hash = (value) => createHash('sha256').update(value ?? '').digest('hex');
const editorial = extractHomeEditorial({ uri: '/', content: staging.content.rendered });
const nodeText = (html) => parseDocument(html, { decodeEntities: true }).children
  .filter((node) => node.name === 'p').map((node) => DomUtils.textContent(node).replace(/\s+/g, ' ').trim());
const body = staging.content.raw;
const headings = [...staging.content.rendered.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)]
  .map((match) => ({ level: Number(match[1]), text: text(match[2]) })).filter((heading) => heading.text);
const linkDestinations = [...staging.content.rendered.matchAll(/<a\b[^>]*href=["']([^"']+)/gi)].map((match) => match[1]);
console.log(JSON.stringify({ auditedAt: new Date().toISOString(), readOnly: true,
  live: { slug: live.slug, modified: live.modified, visibleLength: text(live.content.rendered).length,
    visibleHash: hash(text(live.content.rendered)), seo: live.yoast_head_json && {
      title: live.yoast_head_json.title, description: live.yoast_head_json.description,
      robots: live.yoast_head_json.robots } },
  staging: { slug: staging.slug, modified: staging.modified, rawLength: body.length, rawHash: hash(body),
    visibleLength: text(staging.content.rendered).length,
    visibleHash: hash(text(staging.content.rendered)),
    blockTypes: [...body.matchAll(/<!-- wp:([^ ]+)/g)].map((m) => m[1]),
    shortcodeCount: (body.match(/\[[a-z][a-z0-9_-]+\b/gi) ?? []).length,
    links: (staging.content.rendered.match(/<a\b/gi) ?? []).length,
    images: (staging.content.rendered.match(/<img\b/gi) ?? []).length,
    commercialLinks: linkDestinations.filter((href) => /\/go\/|\/sign-up-offer|\/out\/|affiliat/i.test(href)).length,
    headings,
    seo: staging.yoast_head_json && { title: staging.yoast_head_json.title,
      description: staging.yoast_head_json.description, robots: staging.yoast_head_json.robots } },
  sameVisible: hash(text(live.content.rendered)) === hash(text(staging.content.rendered)),
  editorialParagraphCount: editorial.paragraphCount,
  editorialParagraphs: nodeText(editorial.html),
}, null, 2));
