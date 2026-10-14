// Read-only current live/staging legal-page and optional built exact-route audit.
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { parseDocument, DomUtils } from 'htmlparser2';

const pages = [
  { id: 70281, path: '/safer-gambling' },
  { id: 61, path: '/terms-conditions' },
  { id: 6376, path: '/privacy-policy' },
];
const site = new URL(process.env.EVERYTIP_WP_BASE_URL ?? '');
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') throw new Error('Wrong staging host');
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!username || !password) throw new Error('Missing staging REST credentials');
const auth = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
const hash = (value) => createHash('sha256').update(value ?? '').digest('hex');
const visible = (html) => DomUtils.textContent(parseDocument(html ?? '', { decodeEntities: true })).replace(/\s+/g, ' ').trim();
const descendants = (node, pred) => DomUtils.findAll(pred, [node], true);
function anchors(html) {
  const doc = parseDocument(html ?? '', { decodeEntities: true });
  return descendants(doc, (node) => node.name === 'a').map((node) => ({
    text: DomUtils.textContent(node).replace(/\s+/g, ' ').trim(), href: node.attribs?.href ?? '',
  }));
}
function headings(html) {
  const doc = parseDocument(html ?? '', { decodeEntities: true });
  return descendants(doc, (node) => /^h[1-6]$/.test(node.name ?? '')).map((node) => ({
    level: Number(node.name[1]), text: DomUtils.textContent(node).replace(/\s+/g, ' ').trim(),
  }));
}
function canonicalHref(value) {
  if (!value) return value;
  try {
    const url = new URL(value, 'https://www.everytip.co.uk');
    if (['www.everytip.co.uk', 'everytip.co.uk', 'wordpress-159231-2098144.cloudwaysapps.com'].includes(url.hostname)) {
      return `${url.pathname.replace(/\/$/, '') || '/'}${url.search}${url.hash}`;
    }
    return url.href;
  } catch { return value; }
}
const anchorInventory = (html) => anchors(html).map(({ text, href }) => `${text} => ${canonicalHref(href)}`).sort();
function firstTextDifference(left, right) {
  if (left === right) return null;
  let index = 0;
  while (index < Math.min(left.length, right.length) && left[index] === right[index]) index++;
  return { index, liveContext: left.slice(Math.max(0, index - 80), index + 140),
    stagingContext: right.slice(Math.max(0, index - 80), index + 140) };
}
async function readWp(origin, id, edit) {
  const response = await fetch(new URL(`/wp-json/wp/v2/pages/${id}?context=${edit ? 'edit' : 'view'}`, origin), {
    headers: edit ? { Authorization: auth } : {}, signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`${origin} page ${id}: HTTP ${response.status}`);
  const page = await response.json();
  if (page.id !== id || page.status !== 'publish') throw new Error(`Identity/status mismatch ${id}`);
  return page;
}
async function readBuilt(path) {
  const source = await readFile(new URL(`../dist${path}/index.html`, import.meta.url), 'utf8');
  const doc = parseDocument(source, { decodeEntities: true });
  const node = DomUtils.findOne((item) => (item.attribs?.class ?? '').split(/\s+/).includes('ps-content'), doc.children, true);
  if (!node) throw new Error(`Missing ps-content at ${path}`);
  const content = node.children.map((child) => {
    // Preserve the source subtree rather than serialising escaped full-page text.
    return child.type === 'text' ? child.data : child;
  });
  const { default: render } = await import('dom-serializer');
  const html = content.map((child) => typeof child === 'string' ? child : render(child)).join('');
  const meta = DomUtils.findAll((item) => item.name === 'meta', doc.children, true);
  const robots = meta.find((item) => item.attribs?.name === 'robots')?.attribs?.content;
  const description = meta.find((item) => item.attribs?.name === 'description')?.attribs?.content;
  const title = DomUtils.findOne((item) => item.name === 'title', doc.children, true);
  const canonical = DomUtils.findAll((item) => item.name === 'link' && item.attribs?.rel === 'canonical', doc.children, true)
    .map((item) => item.attribs?.href);
  return { html, fullHtml: source, meta: { title: title && DomUtils.textContent(title), description, robots, canonical } };
}
const rows = [];
for (const { id, path } of pages) {
  const [live, staging] = await Promise.all([readWp('https://www.everytip.co.uk', id, false), readWp(site, id, true)]);
  const row = { id, path, live: { slug: live.slug, modified: live.modified,
    textLength: visible(live.content.rendered).length, textHash: hash(visible(live.content.rendered)),
    headings: headings(live.content.rendered), anchors: anchors(live.content.rendered),
    seo: live.yoast_head_json && { title: live.yoast_head_json.title, description: live.yoast_head_json.description,
      robots: live.yoast_head_json.robots, canonical: live.yoast_head_json.canonical } },
    staging: { slug: staging.slug, modified: staging.modified, rawLength: staging.content.raw?.length,
      textLength: visible(staging.content.rendered).length,
      textHash: hash(visible(staging.content.rendered)),
      anchorCount: anchors(staging.content.rendered).length,
      seo: staging.yoast_head_json && { title: staging.yoast_head_json.title,
        description: staging.yoast_head_json.description, robots: staging.yoast_head_json.robots,
        canonical: staging.yoast_head_json.canonical } },
    sameLiveStagingText: visible(live.content.rendered) === visible(staging.content.rendered),
    sameLiveStagingAnchors: JSON.stringify(anchorInventory(live.content.rendered)) === JSON.stringify(anchorInventory(staging.content.rendered)),
    liveStagingTextDifference: firstTextDifference(visible(live.content.rendered), visible(staging.content.rendered)),
  };
  if (process.argv.includes('--built')) {
    const built = await readBuilt(path);
    row.built = { textLength: visible(built.html).length, textHash: hash(visible(built.html)),
      sameLiveText: visible(built.html) === visible(live.content.rendered),
      headingCount: headings(built.html).length,
      headingsEqual: JSON.stringify(headings(built.html)) === JSON.stringify(headings(live.content.rendered)),
      anchors: anchors(built.html),
      anchorsEqual: JSON.stringify(anchorInventory(built.html)) === JSON.stringify(anchorInventory(live.content.rendered)),
      meta: built.meta,
    };
  }
  rows.push(row);
}
console.log(JSON.stringify({ auditedAt: new Date().toISOString(), readOnly: true, rows }, null, 2));
