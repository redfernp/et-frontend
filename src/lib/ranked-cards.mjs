import { parseDocument } from 'htmlparser2';
import render from 'dom-serializer';

// Old Beaver Builder and classic bookmaker ladders survive the cleanup as a loose run of
// logo, stars, review link, headline, facts, button and #Ad terms. This regroups each run
// into one ranked bookmaker card. Text, links and terms are kept; only the layout changes.

const text = (node) => node.type === 'text' ? node.data : (node.children ?? []).map(text).join('');
const clean = (value) => value.replace(/\s+/g, ' ').trim();
const tags = (node, name) => node.type !== 'tag' ? [] : [...(node.name === name ? [node] : []), ...node.children.flatMap((child) => tags(child, name))];
const isGo = (href = '') => /\/go\//.test(href);
const escape = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
// Brand tiles behind logos, matching the homepage ladder (most logos are white).
const brandColors = { betfred: '#0f488f', quinnbet: '#222222', spreadex: '#1f1f1f', '10bet': '#0b447f', betway: '#101010',
  netbet: '#677f9a', 'netbet-50': '#677f9a', betwright: '#253745', bet365: '#126e51' };
const brandOf = (href = '') => brandColors[(href.match(/\/go\/([a-z0-9-]+)/i) ?? [])[1]?.toLowerCase()] ?? '#17324a';
const meaningful = (node) => node.type === 'tag' || (node.type === 'text' && clean(node.data));

// A logo: an image (usually linked to /go/) with no other text around it.
function logoOf(node) {
  if (node.type !== 'tag' || clean(text(node))) return null;
  const images = tags(node, 'img');
  if (images.length !== 1) return null;
  const image = images[0];
  const link = node.name === 'a' ? node : tags(node, 'a')[0];
  const src = image.attribs.src ?? '';
  const small = Number(image.attribs.width || 0) <= 400 || /logo|\d{2,3}x\d{2,3}/i.test(src);
  if (!(link && isGo(link.attribs.href)) && !small) return null;
  if (!/logo|\d{2,3}x\d{2,3}|bet|bookie/i.test(`${src} ${image.attribs.alt ?? ''}`) && !(link && isGo(link.attribs.href))) return null;
  return { image, link };
}

const isBreak = (node) => node.type === 'tag' && (/^h[1-6]$/.test(node.name) || ['table', 'ul', 'ol', 'figure', 'aside', 'blockquote'].includes(node.name));
// Offer terms, with or without the "#Ad" prefix.
const isTermsText = (value) => /^#Ad/i.test(value) || (value.length > 60 && /(T&Cs|terms (and conditions )?apply|new (uk )?customers only|18\+)/i.test(value));
// A full paragraph of prose ends a card; card notes are short one-liners.
const isLongProse = (node) => { const t = clean(text(node)); return t.length > 140 && !isTermsText(t); };
const strongOnlyNode = (node) => node?.type === 'tag' && tags(node, 'strong').length > 0 && clean(tags(node, 'strong').map(text).join('')) === clean(text(node));

function buildCard(logo, members, rank) {
  let stars = 0;
  let review = null;
  let cta = null;
  let headline = null;
  let terms = null;
  const facts = [];
  const pairs = [];
  let pendingLabel = null;
  for (const [position, node] of members.entries()) {
    if (node.type === 'tag') stars += tags(node, 'i').filter((i) => /fa-star\b/.test(i.attribs.class ?? '')).length
      + (node.name === 'i' && /fa-star\b/.test(node.attribs.class ?? '') ? 1 : 0);
    const value = clean(text(node));
    if (!value) continue;
    const links = node.type === 'tag' ? [...(node.name === 'a' ? [node] : []), ...tags(node, 'a')] : [];
    const goLink = links.find((a) => isGo(a.attribs.href) && clean(text(a)));
    if (goLink && clean(text(goLink)) === value) { cta ??= { href: goLink.attribs.href, label: value }; continue; }
    const reviewLink = links.find((a) => !isGo(a.attribs.href) && /review/i.test(text(a)));
    if (reviewLink && clean(text(reviewLink)) === value) { review ??= { href: reviewLink.attribs.href, label: value }; continue; }
    if (isTermsText(value)) { terms ??= value; continue; }
    if (/^(GambleAware\s*\|?\s*18\+|18\+\s*\|?\s*GambleAware)$/i.test(value)) continue;
    const strongOnly = node.type === 'tag' && tags(node, 'strong').length > 0 && clean(tags(node, 'strong').map(text).join('')) === value;
    if (pendingLabel) { pairs.push([pendingLabel, value]); pendingLabel = null; continue; }
    if (/^[\w'’ .-]+ review$/i.test(value)) continue;
    // Stat rows: a plain label ("Deposit Limit") followed by a bold value ("£5,500").
    const nextNode = members.slice(position + 1).find((item) => clean(text(item)));
    if (!strongOnly && value.length <= 30 && !/[\d£€$%]/.test(value) && strongOnlyNode(nextNode) && clean(text(nextNode)).length <= 30) { pendingLabel = value; continue; }
    // Spec labels ("Minimum Deposit", "Payment Option") carry no figures; offer headlines do.
    if (strongOnly && value.length <= 30 && !/[\d£€$%]/.test(value) && /^(minimum|maximum|payment|withdrawal|deposit|min\b|max\b|odds|rating|licen|app|support|markets?)/i.test(value)) { pendingLabel = value; continue; }
    if (!headline && strongOnly && value.length >= 8 && value.length < 120 && /[a-z]/i.test(value)) { headline = value; continue; }
    if (value.length < 200) facts.push(value);
  }
  if (!headline && !cta && !pairs.length) return null;
  // A logo with stats only (a bookmaker's section under its own heading) is not a ranked entry.
  const statsOnly = !headline && !cta && pairs.length > 0;
  if (statsOnly) rank = null;
  const logoHtml = logo.link ? `<a href="${escape(logo.link.attribs.href)}"${logo.link.attribs.rel ? ` rel="${escape(logo.link.attribs.rel)}"` : ''}>${render(logo.image)}</a>` : render(logo.image);
  const rawName = clean(logo.image.attribs.alt ?? '').replace(/[-_ ]?\d+x\d+.*$/i, '').replace(/\.(png|jpe?g|webp)$/i, '').replace(/[-_]?logo.*$/i, '');
  const name = rawName.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  return `<div class="rank-card${statsOnly ? ' stats-card' : ''}">
  ${rank ? `<span class="rank-number" aria-label="Rank ${rank}">${rank}</span>` : ''}
  <div class="rank-logo" style="background:${brandOf(logo.link?.attribs.href ?? cta?.href)}">${logoHtml}</div>
  <div class="rank-body">
    ${headline ? `<h3>${escape(headline)}</h3>` : name && !statsOnly ? `<h3>${escape(name)}</h3>` : ''}
    ${stars || review ? `<p class="rank-meta">${stars ? `<span class="rank-stars" aria-label="${stars} out of 5">${'★'.repeat(Math.min(stars, 5))}</span>` : ''}${review ? `<a href="${escape(review.href)}">${escape(review.label)}</a>` : ''}</p>` : ''}
    ${facts.length && !statsOnly ? `<ul class="rank-facts">${facts.map((fact) => `<li>${escape(fact)}</li>`).join('')}</ul>` : ''}
    ${pairs.length ? `<dl class="rank-specs">${pairs.map(([label, value]) => `<div><dt>${escape(label)}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl>` : ''}
    ${terms ? `<p class="rank-terms">${escape(terms)}</p>` : ''}
  </div>
  ${cta ? `<div class="rank-cta"><a href="${escape(cta.href)}" rel="sponsored nofollow">${escape(cta.label)}</a></div>` : ''}
</div>${statsOnly ? facts.map((fact) => `
<p>${escape(fact)}</p>`).join('') : ''}`;
}

export function rebuildRankedCards(html) {
  if (!html || !/<img/i.test(html)) return html;
  const doc = parseDocument(html, { decodeEntities: true });
  const nodes = doc.children.filter(meaningful);
  const out = [];
  let rank = 0;
  let changed = false;
  const exNames = new Set();
  const named = new Set();
  const nameExPartners = () => {
    const fresh = [...exNames].filter((name) => !named.has(name));
    exNames.clear();
    if (!fresh.length) return;
    fresh.forEach((name) => named.add(name));
    out.push(`<p class="ex-partner-mention">Other bookmakers we cover: ${fresh.join(', ')}.</p>`);
  };
  for (let index = 0; index < nodes.length; index++) {
    const logo = logoOf(nodes[index]);
    if (!logo) { if (isBreak(nodes[index]) || isLongProse(nodes[index])) { nameExPartners(); rank = 0; } out.push(render(nodes[index])); continue; }
    const members = [];
    let next = index + 1;
    while (next < nodes.length && !logoOf(nodes[next]) && !isBreak(nodes[next]) && !isLongProse(nodes[next])) members.push(nodes[next++]);
    const exCard = exPartnerFor(`${goSlug(logo.link?.attribs.href)} ${logo.image.attribs.alt ?? ''} ${logo.image.attribs.src ?? ''}`);
    if (exCard) { exNames.add(exCard.name); changed = true; index = next - 1; continue; }
    const card = buildCard(logo, members, rank + 1);
    if (!card) { out.push(render(nodes[index])); continue; }
    if (!card.includes('stats-card')) rank++;
    changed = true;
    out.push(card);
    index = next - 1;
  }
  nameExPartners();
  return changed ? out.join('\n') : html;
}

// Comparison tables with an empty "Link" column get a button from the row's own /go/ link.
export function fillEmptyLinkCells(html) {
  if (!html || !/<th[^>]*>(?:(?!<\/th>)[\s\S])*Link/i.test(html)) return html;
  const doc = parseDocument(html, { decodeEntities: true });
  let changed = false;
  for (const table of doc.children.flatMap((node) => tags(node, 'table'))) {
    const headers = tags(table, 'th').map((th) => clean(text(th)).toLowerCase());
    const column = headers.lastIndexOf('link');
    if (column < 0) continue;
    for (const row of tags(table, 'tr')) {
      const cells = row.children.filter((child) => child.type === 'tag' && child.name === 'td');
      const cell = cells[column];
      if (!cell || clean(text(cell))) continue;
      const go = tags(row, 'a').find((a) => isGo(a.attribs.href) && clean(text(a)));
      if (!go) continue;
      cell.children = parseDocument(`<a class="table-cta" href="${escape(go.attribs.href)}" rel="sponsored nofollow">Visit site</a>`).children;
      changed = true;
    }
  }
  return changed ? render(doc) : html;
}

// Ninja Tables mark each column with the screen sizes it hides at (xs sm md lg) on the
// header only. Copy those classes onto every cell so CSS can hide whole columns, as the
// live site's FooTable script does, and label each cell for the "+" row expander.
export function responsiveNinjaTables(html) {
  if (!html || !/ninja_footable/.test(html)) return html;
  const doc = parseDocument(html, { decodeEntities: true });
  let changed = false;
  for (const table of doc.children.flatMap((node) => tags(node, 'table'))) {
    if (!/ninja_footable/.test(table.attribs.class ?? '')) continue;
    const headers = tags(table, 'th');
    const hideAt = headers.map((th) => (th.attribs.class ?? '').split(/\s+/).filter((name) => /^(xs|sm|md|lg)$/.test(name)));
    const labels = headers.map((th) => clean(text(th)));
    for (const [index, th] of headers.entries()) if (hideAt[index].length) th.attribs.class = `${th.attribs.class} nt-col`;
    for (const row of tags(table, 'tbody').flatMap((body) => tags(body, 'tr'))) {
      row.children.filter((child) => child.type === 'tag' && child.name === 'td').forEach((cell, index) => {
        const classes = hideAt[index] ?? [];
        if (classes.length) cell.attribs.class = [cell.attribs.class, 'nt-col', ...classes].filter(Boolean).join(' ');
        if (labels[index]) cell.attribs['data-label'] = labels[index];
      });
    }
    table.attribs.class = `${table.attribs.class} nt-responsive`;
    changed = true;
  }
  return changed ? render(doc) : html;
}

// Button rows ("Sign Up to Bet365" + "Read Full Review") and stand-alone #Ad terms get their own styles.
export function polishContent(html) {
  if (!html) return html;
  const doc = parseDocument(html, { decodeEntities: true });
  const squash = (value) => value.replace(/\s+/g, '');
  let changed = false;
  for (const p of doc.children.flatMap((node) => tags(node, 'p'))) {
    const value = clean(text(p));
    const links = tags(p, 'a').filter((a) => clean(text(a)));
    // The paragraph is nothing but two or more links, one of them commercial.
    if (links.length >= 2 && links.some((a) => isGo(a.attribs.href)) && squash(links.map(text).join('')) === squash(value)) {
      p.attribs.class = [p.attribs.class, 'link-buttons'].filter(Boolean).join(' ');
      changed = true;
    } else if (/^#Ad/i.test(value) && !links.length) {
      p.attribs.class = [p.attribs.class, 'ad-terms'].filter(Boolean).join(' ');
      changed = true;
    }
  }
  return changed ? render(doc) : html;
}

// Former partners (src/data/offers.json notPartners): never a card, button, banner or
// affiliate link. Their names may stay in the text.
import offerFile from '../data/offers.json' with { type: 'json' };
const exPartners = offerFile.notPartners ?? [];
const exKey = (value = '') => value.toLowerCase().replace(/[^a-z0-9]/g, '');
export const exPartnerFor = (value = '') => exPartners.find((entry) => entry.match.some((key) => exKey(value).includes(key)));
const goSlug = (href = '') => (href.match(/\/go\/([a-z0-9-]+)/i) ?? [])[1] ?? '';

export function removeExPartnerPromotion(html) {
  if (!html || !exPartners.length) return html;
  const doc = parseDocument(html, { decodeEntities: true });
  let changed = false;
  const drop = (node) => { const list = node.parent ? node.parent.children : doc.children; list.splice(list.indexOf(node), 1); changed = true; };
  for (const a of doc.children.flatMap((node) => tags(node, 'a'))) {
    if (!exPartnerFor(goSlug(a.attribs.href))) continue;
    if (tags(a, 'img').length) { drop(a); continue; }
    // Keep the words, lose the link.
    const list = a.parent ? a.parent.children : doc.children;
    list.splice(list.indexOf(a), 1, ...a.children);
    for (const child of a.children) child.parent = a.parent;
    changed = true;
  }
  for (const p of doc.children.flatMap((node) => tags(node, 'p'))) {
    const value = clean(text(p));
    if ((/^#Ad/i.test(value) || /^(sign up|visit|claim|open|join|bet now|register)\b/i.test(value)) && exPartnerFor(value)) drop(p);
  }
  return changed ? render(doc) : html;
}
