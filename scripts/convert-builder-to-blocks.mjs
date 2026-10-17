// Convert Beaver Builder / Thrive / flattened classic pages to clean WordPress blocks.
//
// Reads the page as the site renders it (same cleanup and ranked-card detection as the
// Astro build), then writes standard Gutenberg blocks back to WordPress:
//   paragraphs, headings, lists, images, tables, Ninja table shortcodes, and an
//   EveryTip offer block (with its one-line reason as the block heading) for each
//   ranked partner. Non-partners lose their cards, buttons and affiliate links and are
//   named once in plain text. Every write is preceded by a saved backup.
//
// Usage:
//   node --env-file=.env.local scripts/convert-builder-to-blocks.mjs <uri> [...uris]           dry run
//   node --env-file=.env.local scripts/convert-builder-to-blocks.mjs --apply <uri> [...uris]   write to staging
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { parseDocument } from 'htmlparser2';
import render from 'dom-serializer';
import { launchHtml } from '../src/lib/builder-cleanup.mjs';
import { rebuildRankedCards } from '../src/lib/ranked-cards.mjs';
import offerFile from '../src/data/offers.json' with { type: 'json' };

const apply = process.argv.includes('--apply');
// --from-live: use the live page's main content (pages whose real content lived only in Thrive).
const fromLive = process.argv.includes('--from-live');
const uris = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const base = process.env.EVERYTIP_WP_BASE_URL;
if (!/cloudwaysapps\.com$/.test(new URL(base).hostname)) throw new Error('Refusing to write anywhere but staging');
const auth = `Basic ${Buffer.from(`${process.env.EVERYTIP_WP_USERNAME}:${process.env.EVERYTIP_WP_APPLICATION_PASSWORD}`).toString('base64')}`;
const endpoint = `${base}/graphql`;

const partners = offerFile.offers.filter((offer) => offer.active !== false);
const exPartners = offerFile.notPartners ?? [];
const slugOf = (href = '') => (href.match(/\/go\/([a-z0-9-]+)/i) ?? [])[1]?.toLowerCase() ?? null;
const partnerFor = (href) => { const slug = slugOf(href); return slug ? partners.find((offer) => slug.startsWith(offer.partner)) : null; };
// A card that only links to a review is still recognised from its logo ("betfred-154x40.png").
const partnerByName = (value = '') => { const key = value.toLowerCase().replace(/[^a-z0-9]/g, ''); return partners.find((offer) => key.includes(offer.partner.replace(/[^a-z0-9]/g, ''))); };
// "Sign Up to Bet365", "Visit Bet365 + See Latest Sign Up Bonus Offer" and the like.
const exPartnerCta = (value) => /^(sign up|visit|claim|open|join|bet now|get|register)\b/i.test(value) && exPartnerFor(value.replace(/\s/g, ''));
// "#1 Bet365: ...", "2. William Hill", "Bet365 PayPal deposit and withdrawals".
// Also "The Best Promotions: Bet365" (the bookmaker named after a colon or dash).
const headingExPartner = (title) => {
  const rest = title.replace(/^#?\d+[.):]?\s*/, '');
  const lead = exPartnerFor(rest.slice(0, 20).replace(/\s/g, ''));
  if (lead && rest.toLowerCase().replace(/\s/g, '').startsWith(lead.match[0].slice(0, 5))) return lead;
  const tail = rest.split(/[:–—-]/).at(-1);
  const named = rest !== tail && tail.trim().length <= 20 ? exPartnerFor(tail.replace(/\s/g, '')) : null;
  return named ?? null;
};
const exPartnerFor = (value = '') => exPartners.find((entry) => entry.match.some((key) => value.toLowerCase().replace(/[^a-z0-9]/g, '').includes(key)));

const text = (node) => node.type === 'text' ? node.data : (node.children ?? []).map(text).join('');
const clean = (value) => value.replace(/\s+/g, ' ').trim();
const tags = (node, name) => node.type !== 'tag' ? [] : [...(node.name === name ? [node] : []), ...node.children.flatMap((child) => tags(child, name))];
const escapeAttr = (value) => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
const escapeJson = (value) => JSON.stringify(value).replaceAll('--', '\\u002d\\u002d').replaceAll('<', '\\u003c').replaceAll('>', '\\u003e');

const block = (name, html, attrs) => `<!-- wp:${name}${attrs ? ` ${escapeJson(attrs)}` : ''} -->\n${html}\n<!-- /wp:${name} -->`;
const paragraph = (inner) => block('paragraph', `<p>${inner}</p>`);
const heading = (level, inner) => block('heading', `<h${level} class="wp-block-heading">${inner}</h${level}>`, level === 2 ? null : { level });
const offerSlot = (offer, reason) => `<!-- wp:acf/everytip-offer-slot ${escapeJson({ name: 'acf/everytip-offer-slot', data: {
  et_slot_offer: offer.id, _et_slot_offer: 'field_et_slot_offer_v1', et_slot_layout: 'inline', _et_slot_layout: 'field_et_slot_layout_v1',
  ...(reason ? { et_slot_heading: reason.slice(0, 100), _et_slot_heading: 'field_et_slot_heading_v1' } : {}) }, mode: 'preview' })} /-->`;

// A YouTube video (iframe, or Thrive/Beaver wrappers carrying data-url / data-src) as an embed block.
const youtubeId = (value = '') => (value.match(/(?:youtube(?:-nocookie)?\.com\/(?:embed\/|watch\?v=)|youtu\.be\/)([\w-]{11})/) ?? [])[1];
const videoOf = (node) => node.type === 'tag' && [node, ...tags(node, 'iframe'), ...tags(node, 'div')].map((item) => youtubeId(item.attribs?.src || item.attribs?.['data-src'] || item.attribs?.['data-url'] || '')).find(Boolean);
const embedBlock = (id) => `<!-- wp:embed {"url":"https://www.youtube.com/watch?v=${id}","type":"video","providerNameSlug":"youtube","responsive":true,"className":"wp-embed-aspect-16-9 wp-has-aspect-ratio"} -->
<figure class="wp-block-embed is-type-video is-provider-youtube wp-block-embed-youtube wp-embed-aspect-16-9 wp-has-aspect-ratio"><div class="wp-block-embed__wrapper">
https://www.youtube.com/watch?v=${id}
</div></figure>
<!-- /wp:embed -->`;

// Keep only safe inline markup; drop ex-partner affiliate links (text stays), and
// any linked image that points at an ex-partner.
function inline(node) {
  const out = [];
  for (const child of node.children ?? []) {
    if (child.type === 'text') { out.push(child.data.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')); continue; }
    if (child.type !== 'tag') continue;
    if (child.name === 'br') { out.push('<br>'); continue; }
    if (child.name === 'a') {
      const href = child.attribs.href ?? '';
      const ex = slugOf(href) && !partnerFor(href);
      if (ex && tags(child, 'img').length) continue;
      if (ex) { out.push(inline(child)); continue; }
      const rel = child.attribs.rel ? ` rel="${escapeAttr(child.attribs.rel)}"` : '';
      out.push(`<a href="${escapeAttr(href)}"${rel}>${inline(child)}</a>`);
      continue;
    }
    if (['strong', 'b'].includes(child.name)) { out.push(`<strong>${inline(child)}</strong>`); continue; }
    if (['em', 'i'].includes(child.name) && !/fa-|ua-icon/.test(child.attribs.class ?? '')) { out.push(`<em>${inline(child)}</em>`); continue; }
    if (child.name === 'img') continue;
    out.push(inline(child));
  }
  return out.join('').replace(/\s+/g, ' ').trim();
}

function imageBlock(img) {
  const src = img.attribs.src ?? '';
  if (!src || /star|icon/i.test(src)) return null;
  return block('image', `<figure class="wp-block-image"><img src="${escapeAttr(src)}" alt="${escapeAttr(img.attribs.alt ?? '')}"/></figure>`);
}

function listBlock(list) {
  const ordered = list.name === 'ol';
  const items = list.children.filter((child) => child.type === 'tag' && child.name === 'li')
    .map((li) => inline(li)).filter(Boolean).map((html) => block('list-item', `<li>${html}</li>`));
  if (!items.length) return null;
  return block('list', `<${list.name} class="wp-block-list">${items.join('\n')}</${list.name}>`, ordered ? { ordered: true } : null);
}

function tableBlock(table, shortcodes) {
  const id = (table.attribs.id ?? '').match(/footable_(\d+)/)?.[1] ?? table.attribs['data-footable_id'];
  if (/ninja_footable/.test(table.attribs.class ?? '') && id) {
    const shortcode = shortcodes.find((code) => code.includes(`"${id}"`) || code.includes(`=${id}`)) ?? `[ninja_tables id="${id}"]`;
    return block('shortcode', shortcode);
  }
  const rows = tags(table, 'tr').map((tr) => tr.children.filter((cell) => cell.type === 'tag' && /^t[hd]$/.test(cell.name)));
  if (!rows.length) return null;
  const [head, ...body] = tags(table, 'thead').length ? rows : [null, ...rows];
  const row = (cells, tag) => `<tr>${cells.map((cell) => `<${tag}>${inline(cell)}</${tag}>`).join('')}</tr>`;
  return block('table', `<figure class="wp-block-table"><table>${head ? `<thead>${row(head, 'th')}</thead>` : ''}<tbody>${body.map((cells) => row(cells, 'td')).join('')}</tbody></table></figure>`);
}

// A rebuilt ranked card (see ranked-cards.mjs) back into blocks.
function cardBlocks(card, mentions) {
  const ctaHref = tags(card, 'a').map((a) => a.attribs.href ?? '').find((href) => slugOf(href)) ?? '';
  const logoAlt = tags(card, 'img')[0]?.attribs.alt ?? '';
  const facts = tags(card, 'li').map((li) => clean(text(li))).filter(Boolean);
  const specs = tags(card, 'div').filter((div) => tags(div, 'dt').length === 1 && tags(div, 'dd').length === 1)
    .map((div) => `${clean(text(tags(div, 'dt')[0]))}: <strong>${clean(text(tags(div, 'dd')[0]))}</strong>`);
  const partner = partnerFor(ctaHref) ?? (exPartnerFor(logoAlt) ? null : partnerByName(`${logoAlt} ${tags(card, 'img')[0]?.attribs.src ?? ''}`));
  const out = [];
  if (/\bstats-card\b/.test(card.attribs.class ?? '')) {
    // A bookmaker's stats under its own heading: an editable list.
    if (specs.length) out.push(block('list', `<ul class="wp-block-list">${specs.map((item) => block('list-item', `<li>${item}</li>`)).join('\n')}</ul>`));
    for (const fact of facts) out.push(paragraph(fact));
    return out;
  }
  if (partner) {
    out.push(offerSlot(partner, facts[0] ?? ''));
    if (specs.length) out.push(block('list', `<ul class="wp-block-list">${specs.map((item) => block('list-item', `<li>${item}</li>`)).join('\n')}</ul>`));
    return out;
  }
  const name = exPartnerFor(`${ctaHref} ${logoAlt}`)?.name ?? clean(logoAlt).replace(/[-_ ]?\d+x\d+.*$/i, '').replace(/\.(png|jpe?g|webp)$/i, '').replace(/[-_]?logo.*$/i, '').replace(/[-_]+/g, ' ');
  if (name) mentions.add(name.replace(/\b\w/g, (letter) => letter.toUpperCase()));
  return out;
}

export function toBlocks(renderedHtml, rawContent = '', uri = '') {
  // On a page about an ex-partner ("How does Bet365 bet builder work") its sections stay; only links and buttons go.
  const topic = exPartnerFor(uri);
  const shortcodes = [...rawContent.matchAll(/\[ninja_tables[^\]]*\]/g)].map((match) => match[0]);
  const html = rebuildRankedCards(launchHtml(renderedHtml, endpoint));
  // Builder wrappers (div/section around tables, lists and paragraphs) are opened up so their
  // contents become proper blocks; ranked cards stay whole.
  const blockTags = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'table', 'figure', 'div', 'section', 'blockquote', 'aside']);
  const flatten = (list) => list.flatMap((node) => node.type === 'tag' && ['div', 'section', 'article', 'center', 'span'].includes(node.name)
    && !/\brank-card\b/.test(node.attribs.class ?? '') && node.children.some((child) => child.type === 'tag' && blockTags.has(child.name))
    ? flatten(node.children) : [node]);
  const nodes = flatten(parseDocument(html, { decodeEntities: true }).children);
  const out = [];
  let mentions = new Set();
  const mentioned = new Set();
  const flushMentions = () => {
    const fresh = [...mentions].filter((name) => !mentioned.has(name));
    mentions = new Set();
    if (!fresh.length) return;
    fresh.forEach((name) => mentioned.add(name));
    out.push(paragraph(`Other bookmakers we cover: ${fresh.join(', ')}.`));
  };
  // Ex-partner sub-sections ("Bet365" under "Our 3 Best ...") are dropped from the featured
  // list and named once in plain text; the count in the section heading is lowered to match.
  let skipping = false;
  let sectionHeadingIndex = -1;
  let removedInSection = 0;
  const closeSection = () => {
    if (removedInSection && sectionHeadingIndex >= 0) {
      // "Our 3 Best" becomes "Our 2 Best"; with one left the number goes ("Top Mobile Bookmaker Sites").
      const lower = (count) => Math.max(0, Number(count) - removedInSection);
      out[sectionHeadingIndex] = out[sectionHeadingIndex]
        .replace(/\b(\d+)(\s+(?:Best|Top))/i, (match, count, rest) => lower(count) > 1 ? `${lower(count)}${rest}` : rest.trimStart())
        .replace(/(Top\s+)(\d+)\s*/i, (match, top, count) => lower(count) > 1 ? `${top}${lower(count)} ` : top);
    }
    removedInSection = 0;
  };
  // A removed "#1 Bet365" section shifts the numbering of the sibling headings that follow it.
  let skipLevel = 0;
  let rankShift = 0;
  let rankLevel = 0;
  for (const node of nodes) {
    if (node.type === 'tag' && /^h[2-4]$/.test(node.name)) {
      const level = Number(node.name[1]);
      const title = clean(text(node));
      if (skipping && level <= skipLevel) { skipping = false; if (level === 2) flushMentions(); }
      if (rankShift && level < rankLevel) rankShift = 0;
      const found = headingExPartner(title);
      const ex = found && found !== topic ? found : null;
      if (ex && !skipping) {
        skipping = true; skipLevel = level; mentions.add(ex.name); removedInSection++;
        if (/^#?\d+[.):]?\s/.test(title)) { rankShift++; rankLevel = level; }
        continue;
      }
      if (skipping) continue;
      if (level === 2) { flushMentions(); closeSection(); sectionHeadingIndex = out.length; }
      if (rankShift && level === rankLevel) {
        node.children = parseDocument(inline(node).replace(/^(#?)(\d+)/, (match, hash, number) => `${hash}${Math.max(1, Number(number) - rankShift)}`), { decodeEntities: true }).children;
      }
    } else if (skipping) continue;
    if (node.type === 'text') { const value = clean(node.data); if (value && !exPartnerCta(value) && !/^(GambleAware\s*\|?\s*18\+)$/i.test(value)) out.push(paragraph(value)); continue; }
    if (node.type !== 'tag') continue;
    if (/\brank-card\b/.test(node.attribs.class ?? '')) { out.push(...cardBlocks(node, mentions)); continue; }
    { const video = videoOf(node); if (video && clean(text(node)).length < 40) { out.push(embedBlock(video)); continue; } }
    flushMentions();
    const value = clean(text(node));
    if (/^h[1-6]$/.test(node.name)) { if (value) out.push(heading(Math.max(2, Number(node.name[1])), inline(node))); continue; }
    if (node.name === 'p' || node.name === 'div' || node.name === 'span') {
      // Ex-partner sign-up buttons, terms and leftovers go; everything else stays as text.
      const links = tags(node, 'a');
      if (/^#Ad/i.test(value) && exPartnerFor(value)) continue;
      if (exPartnerCta(value)) continue;
      if (/^(GambleAware\s*\|?\s*18\+|18\+\s*\|?\s*GambleAware)$/i.test(value)) continue;
      const exButtons = links.filter((a) => slugOf(a.attribs.href) && !partnerFor(a.attribs.href));
      if (exButtons.length && clean(exButtons.map(text).join(' ')).length >= value.length - 2) continue;
      const images = tags(node, 'img');
      if (!value && images.length) { for (const img of images) { const linked = img.parent?.name === 'a' ? img.parent.attribs.href : ''; if (!(slugOf(linked) && !partnerFor(linked))) { const b = imageBlock(img); if (b) out.push(b); } } continue; }
      if (node.name === 'div' && tags(node, 'p').length > 1) { for (const p of tags(node, 'p')) { const inner = inline(p); if (inner) out.push(paragraph(inner)); } continue; }
      const inner = inline(node);
      if (inner) out.push(paragraph(inner));
      continue;
    }
    if (node.name === 'ul' || node.name === 'ol') { const b = listBlock(node); if (b) out.push(b); continue; }
    if (node.name === 'figure' || node.name === 'img') { for (const img of node.name === 'img' ? [node] : tags(node, 'img')) { const b = imageBlock(img); if (b) out.push(b); } for (const table of tags(node, 'table')) { const b = tableBlock(table, shortcodes); if (b) out.push(b); } continue; }
    if (node.name === 'table') { const b = tableBlock(node, shortcodes); if (b) out.push(b); continue; }
    if (node.name === 'aside' && node.attribs['data-offer-id']) { const offer = partners.find((item) => String(item.id) === node.attribs['data-offer-id']); if (offer) out.push(offerSlot(offer, '')); continue; }
    if (node.name === 'blockquote') { const inner = inline(node); if (inner) out.push(block('quote', `<blockquote class="wp-block-quote">${paragraph(inner)}</blockquote>`)); continue; }
    for (const table of tags(node, 'table')) { const b = tableBlock(table, shortcodes); if (b) out.push(b); }
    // Loose builder buttons and other leftovers: ex-partner buttons go, the rest become paragraphs.
    const exLink = node.name === 'a' && slugOf(node.attribs.href) && !partnerFor(node.attribs.href);
    if (!tags(node, 'table').length && value && !exLink && !exPartnerCta(value)) out.push(paragraph(node.name === 'a' ? inline({ children: [node] }) : inline(node)));
  }
  flushMentions();
  closeSection();
  return out.join('\n\n');
}

async function rest(path, init = {}) {
  const response = await fetch(`${base}/wp-json/wp/v2/${path}`, { ...init, headers: { Authorization: auth, 'Content-Type': 'application/json', ...(init.headers ?? {}) } });
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status} ${(await response.text()).slice(0, 200)}`);
  return response.json();
}

if (import.meta.url === `file://${process.argv[1].replaceAll('\\', '/')}` || process.argv[1]?.endsWith('convert-builder-to-blocks.mjs')) {
  const source = JSON.parse(await readFile('outputs/launch-source.json', 'utf8'));
  await mkdir('outputs/staging-writes/block-conversion', { recursive: true });
  for (const uri of uris) {
    const record = source.records.find((item) => item.uri === uri);
    if (!record) { console.log(`SKIP ${uri}: not in the latest staging build`); continue; }
    const type = record.kind === 'posts' ? 'posts' : 'pages';
    const current = await rest(`${type}/${record.databaseId}?context=edit&_fields=id,slug,status,modified,content,title,link`);
    let sourceHtml = record.content;
    if (fromLive) {
      const { DomUtils } = await import('htmlparser2');
      const live = parseDocument(await (await fetch(`https://www.everytip.co.uk${uri}`, { headers: { 'user-agent': 'Mozilla/5.0' } })).text(), { decodeEntities: true });
      const main = DomUtils.findOne((n) => n.attribs && (n.attribs.id === 'tve_editor' || /\bentry-content\b/.test(n.attribs.class ?? '')), live.children, true);
      if (!main) { console.log(`SKIP ${uri}: no main content on live`); continue; }
      // Drop scripts, styles and inline graphics before conversion.
      DomUtils.findAll((n) => ['script', 'style', 'noscript', 'svg'].includes(n.name), [main]).forEach((n) => DomUtils.removeElement(n));
      sourceHtml = render(main.children);
    }
    const blocks = toBlocks(sourceHtml, current.content.raw, uri);
    // Text retained: words in the new blocks versus the page as rendered today.
    const words = (html) => html.replace(/<!--[^]*?-->/g, ' ').replace(/<[^>]+>/g, ' ').split(/[^A-Za-z0-9£]+/).filter((word) => word.length > 2).length;
    const retained = Math.round(100 * words(blocks) / Math.max(1, words(launchHtml(sourceHtml, endpoint))));
    const stamp = new Date().toISOString().slice(0, 10);
    const file = `outputs/staging-writes/block-conversion/${record.databaseId}`;
    // Keep the first backup ever taken for a page; later runs must not replace the original.
    const originals = (await readdir('outputs/staging-writes/block-conversion')).filter((name) => name.startsWith(`${record.databaseId}-before-`));
    if (!originals.length) await writeFile(`${file}-before-${stamp}.json`, JSON.stringify(current));
    await writeFile(`${file}-after-${stamp}.html`, blocks);
    const count = (blocks.match(/<!-- wp:/g) ?? []).length;
    const slots = (blocks.match(/everytip-offer-slot/g) ?? []).length;
    console.log(`${apply ? 'WRITE' : 'DRY  '} ${uri} (${type} ${record.databaseId}): ${count} blocks, ${slots / 2} offer blocks, ${retained}% text kept, ninja ${(blocks.match(/\[ninja_tables/g) ?? []).length}/${new Set([...record.content.matchAll(/footable_(\d+)/g)].map((m) => m[1])).size}`);
    if (!apply) continue;
    await rest(`${type}/${record.databaseId}`, { method: 'POST', body: JSON.stringify({ content: blocks }) });
    const after = await rest(`${type}/${record.databaseId}?context=edit&_fields=status,content`);
    // WordPress re-escapes block attributes (an ampersand is stored as a JSON unicode escape); compare with those undone.
    const BS = String.fromCharCode(92);
    const unescape = (value) => [["u0026", "&"], ["u003c", "<"], ["u003e", ">"], ["u0027", "'"], ["u0022", '"']].reduce((out, [code, char]) => out.split(BS + code).join(char), value);
    console.log(`      read back: ${after.status}, matches: ${unescape(after.content.raw) === unescape(blocks)}`);
  }
}
