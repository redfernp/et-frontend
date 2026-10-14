// Local-only conversion of the rendered PayPal guide snapshot into Gutenberg blocks.
// The global Beaver offer ladder becomes central ACF references. No original post is changed.
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { parseDocument } from 'htmlparser2';
import render from 'dom-serializer';
import sanitizeHtml from 'sanitize-html';
import { classicHtmlToBlocks } from '../src/lib/classic-to-gutenberg.mjs';

const id = 58743;
const uri = '/best-paypal-betting-sites.html';
const files = (await readdir(new URL('../data/raw/', import.meta.url))).filter((name) => /^staging-wordpress-public-.*\.json$/.test(name)).sort();
const latest = files.at(-1);
if (!latest) throw new Error('Staging snapshot missing');
const snapshot = JSON.parse(await readFile(new URL(`../data/raw/${latest}`, import.meta.url), 'utf8'));
const source = snapshot.posts.find((post) => post.databaseId === id && post.uri === uri);
if (!source?.content) throw new Error('Exact PayPal guide missing from snapshot');

const document = parseDocument(source.content, { decodeEntities: false });
const top = document.children.filter((node) => node.type === 'tag');
const text = (html) => {
  const walk = (node) => node.type === 'text' ? node.data : (node.children ?? []).map(walk).join('');
  const decoded = parseDocument(html, { decodeEntities: true }).children.map(walk).join('');
  // Builder and sanitizer content sometimes encode a numeric entity behind
  // &amp;. Compare the meaning users see, not the number of encoding layers.
  const decodeOnce = (value) => value
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&nbsp;/g, ' ');
  return decodeOnce(decodeOnce(decoded)).replace(/\s+/g, ' ').trim();
};
const imageBlock = (node) => {
  const img = node.name === 'img' ? node : (node.children ?? []).find((child) => child.name === 'img');
  if (!img || (node.children ?? []).filter((child) => child.type === 'tag').length !== 1) throw new Error('Unexpected guide image structure');
  const sourceUrl = new URL(img.attribs.src);
  if (!['wordpress-159231-2098144.cloudwaysapps.com', 'www.everytip.co.uk'].includes(sourceUrl.hostname) ||
      !sourceUrl.pathname.startsWith('/wp-content/uploads/') || sourceUrl.protocol !== 'https:') {
    throw new Error('Unreviewed guide image source');
  }
  const clean = sanitizeHtml(render(img), { allowedTags: ['img'], allowedAttributes: { img: ['src', 'alt', 'width', 'height'] } });
  return `<!-- wp:image -->\n<figure class="wp-block-image">${clean}</figure>\n<!-- /wp:image -->`;
};
const offerSlot = (offerId, heading) => `<!-- wp:acf/everytip-offer-slot ${JSON.stringify({
  name: 'acf/everytip-offer-slot',
  data: {
    et_slot_offer: String(offerId), _et_slot_offer: 'field_et_slot_offer_v1',
    et_slot_layout: 'compact', _et_slot_layout: 'field_et_slot_layout_v1',
    et_slot_heading: heading, _et_slot_heading: 'field_et_slot_heading_v1',
  },
  mode: 'preview',
})} /-->`;
const offers = [
  [90846, 'Betfred'], [90850, 'Betway'], [90849, 'Spreadex'], [90852, '10Bet'],
];
// The staging draft may retain factual/editorial destinations, but must never
// reintroduce an affiliate /go/ link or an editor-only Ninja control.
const editorialPaths = new Set([
  '/bet365-review', '/betfred-review', '/betway-sportsbook-review.html',
  '/how-to-lay-a-horse-to-lose-on-betfair.html', '/betfair-sportsbook-review',
]);
const editorialHref = (href) => {
  if (href === 'https://www.paypal.com/') return href;
  let url;
  try { url = new URL(href, 'https://wordpress-159231-2098144.cloudwaysapps.com'); }
  catch { return null; }
  if (!['wordpress-159231-2098144.cloudwaysapps.com', 'www.everytip.co.uk'].includes(url.hostname) ||
      !editorialPaths.has(url.pathname) || url.search || url.hash) return null;
  return url.pathname;
};
const blocks = [];
let offerModuleCount = 0;
let paymentTableCount = 0;
let images = 0;
const expectedParts = [];
for (const node of top) {
  if (node.name === 'div') {
    const classes = node.attribs.class ?? '';
    if (classes.includes('fl-builder-content-58873')) {
      offerModuleCount++;
      blocks.push(...offers.map(([offerId, heading]) => offerSlot(offerId, heading)));
    } else if (classes.includes('uabb-js-breakpoint')) {
      if (text(render(node))) throw new Error('Unexpected content in Beaver breakpoint node');
    } else if (node.attribs.id === 'footable_parent_59016') {
      paymentTableCount++;
      const table = (node.children ?? []).find((child) => child.name === 'table');
      if (!table) throw new Error('PayPal table 59016 not found');
      const tableHtml = sanitizeHtml(render(table), {
        allowedTags: ['table', 'thead', 'tbody', 'tr', 'th', 'td', 'br', 'strong', 'em'],
        allowedAttributes: { th: ['scope'] },
      });
      if (text(tableHtml) !== text(render(node))) throw new Error('Payment table text changed during conversion');
      blocks.push(`<!-- wp:table -->\n<figure class="wp-block-table">${tableHtml}</figure>\n<!-- /wp:table -->`);
      expectedParts.push(render(node));
    } else throw new Error(`Unrecognised roundup module: ${classes.slice(0, 80)}`);
    continue;
  }
  if (node.name === 'figure' || (node.name === 'p' && (node.children ?? []).some((child) => child.name === 'img'))) {
    blocks.push(imageBlock(node));
    images++;
    expectedParts.push(render(node));
    continue;
  }
  if (!['p', 'h2', 'h3', 'ol', 'ul'].includes(node.name)) throw new Error(`Unexpected roundup element: ${node.name}`);
  const safe = sanitizeHtml(render(node), {
    allowedTags: ['p', 'h2', 'h3', 'ol', 'ul', 'li', 'strong', 'em', 'b', 'i', 'br', 'span', 'a'],
    allowedAttributes: { a: ['href'] },
    transformTags: { a: (_tag, attributes) => {
      const href = editorialHref(attributes.href);
      return href ? { tagName: 'a', attribs: { href } } : { tagName: 'span', attribs: {} };
    } },
  });
  if (text(safe) !== text(render(node))) throw new Error(`Editorial text changed in ${node.name}`);
  blocks.push(classicHtmlToBlocks(safe));
  expectedParts.push(render(node));
}
if (offerModuleCount !== 1 || paymentTableCount !== 1 || images !== 5) throw new Error('Guide module inventory changed');
// classicHtmlToBlocks serializes already-encoded ampersands a second time.
// Decode that one extra layer so the WordPress-rendered headings display as
// “&” and “–”, matching the published source instead of literal entities.
const output = blocks.join('\n\n').replaceAll('&amp;amp;', '&amp;').replaceAll('&amp;#8211;', '&#8211;');
const sourceText = text(expectedParts.join('\n'));
const convertedText = text(output);
let firstTextDifference = 0;
while (firstTextDifference < Math.min(sourceText.length, convertedText.length) &&
       sourceText[firstTextDifference] === convertedText[firstTextDifference]) firstTextDifference++;
const report = {
  sourceId: id, uri, snapshot: latest, blocks: (output.match(/<!-- wp:/g) ?? []).length,
  offerReferences: offers.map(([offerId]) => offerId), paymentTables: paymentTableCount, images,
  sourceEditorialCharacters: sourceText.length, convertedEditorialCharacters: convertedText.length,
  editorialTextParity: sourceText === convertedText,
  firstTextDifference: sourceText === convertedText ? null : {
    offset: firstTextDifference,
    source: sourceText.slice(Math.max(0, firstTextDifference - 45), firstTextDifference + 80),
    converted: convertedText.slice(Math.max(0, firstTextDifference - 45), firstTextDifference + 80),
  },
  editorialLinks: (output.match(/<a\s+href=/g) ?? []).length,
  activeAffiliateLinks: /<a\b[^>]*href="[^"]*\/go\//i.test(output),
  excludedModule: 'Beaver global offer ladder; replaced by four central ACF offer references',
};
await writeFile(new URL(`../data/raw/wp-gutenberg-preview-${id}.html`, import.meta.url), output);
console.log(JSON.stringify(report, null, 2));
if (!report.editorialTextParity || report.editorialLinks !== 7 || report.activeAffiliateLinks) process.exitCode = 1;
