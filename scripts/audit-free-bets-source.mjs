// Read-only source audit. Prints structure and hashes, not offer claims or links.
import { createHash } from 'node:crypto';
import { parseDocument } from 'htmlparser2';
import { extractFreeBetsEditorial } from '../src/lib/free-bets-editorial.mjs';
import { classicHtmlToBlocks } from '../src/lib/classic-to-gutenberg.mjs';

const id = 56315;
const sources = [
  ['live', 'https://www.everytip.co.uk'],
  ['staging', 'https://wordpress-159231-2098144.cloudwaysapps.com'],
];
const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const visibleText = (html) => {
  const walk = (node) => node.type === 'text' ? node.data : (node.children ?? []).map(walk).join('');
  return parseDocument(String(html ?? '').replace(/<\/(?:p|h[2-4]|li|blockquote|ul|ol)>/gi, '$& '), { decodeEntities: true })
    .children.map(walk).join('').replace(/\s+/g, ' ').trim();
};
const outputs = [];
for (const [environment, origin] of sources) {
  const headers = {};
  if (environment === 'staging' && process.env.EVERYTIP_WP_USERNAME && process.env.EVERYTIP_WP_APPLICATION_PASSWORD) {
    headers.Authorization = `Basic ${Buffer.from(`${process.env.EVERYTIP_WP_USERNAME}:${process.env.EVERYTIP_WP_APPLICATION_PASSWORD}`).toString('base64')}`;
  }
  const endpoint = environment === 'staging'
    ? `/wp-json/wp/v2/pages/${id}?context=edit`
    : `/wp-json/wp/v2/pages/${id}`;
  const response = await fetch(new URL(endpoint, origin), { headers, signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error(`${environment} HTTP ${response.status}`);
  const page = await response.json();
  if (page.id !== id || page.slug !== 'bookie-free-bets-bonus-offers' || page.status !== 'publish') {
    throw new Error(`${environment} identity mismatch`);
  }
  const raw = page.content?.raw ?? '';
  const rendered = page.content?.rendered ?? '';
  const editorial = extractFreeBetsEditorial({ uri: '/bookie-free-bets-bonus-offers', content: rendered });
  if (process.argv.includes('--headings') && environment === 'staging') {
    const nodes = parseDocument(editorial.html, { decodeEntities: true }).children;
    const walk = (node) => node.type === 'text' ? node.data : (node.children ?? []).map(walk).join('');
    console.error(JSON.stringify(nodes.filter((node) => /^h[234]$/.test(node.name ?? '')).map((node) => walk(node)), null, 2));
  }
  if (process.argv.includes('--risk-lines') && environment === 'staging') {
    const nodes = parseDocument(editorial.html, { decodeEntities: true }).children;
    const walk = (node) => node.type === 'text' ? node.data : (node.children ?? []).map(walk).join('');
    console.error(JSON.stringify(nodes.filter((node) => node.name === 'p')
      .map((node) => walk(node).replace(/\s+/g, ' ').trim())
      .filter((paragraph) => /(?:£|€)\s*\d+|\b(?:today|this week|currently|2026|2025|latest)\b/i.test(paragraph)), null, 2));
  }
  let conversion;
  try {
    const blocks = classicHtmlToBlocks(editorial.html);
    conversion = { possible: true, blockCount: (blocks.match(/<!-- wp:/g) ?? []).length,
      visibleTextExact: visibleText(blocks) === visibleText(editorial.html),
      activeLinkCount: (blocks.match(/<a\b/gi) ?? []).length,
      builderMarkerCount: (blocks.match(/\[fl_builder|fl-builder/gi) ?? []).length };
  } catch (error) { conversion = { possible: false, reason: String(error.message ?? error) }; }
  outputs.push({ environment, id, slug: page.slug, status: page.status, modified: page.modified,
    rawLength: raw.length, rawSha256: raw ? sha256(raw) : null,
    renderedLength: rendered.length, renderedSha256: sha256(rendered),
    fullVisibleSha256: sha256(visibleText(rendered)),
    extractedLength: editorial.html.length, extractedSha256: sha256(editorial.html),
    extractedVisibleSha256: sha256(visibleText(editorial.html)),
    extractedHeadingCount: editorial.headingCount,
    extractedParagraphs: (editorial.html.match(/<p>/g) ?? []).length,
    extractedLists: (editorial.html.match(/<(?:ul|ol)>/g) ?? []).length,
    extractedLinks: (editorial.html.match(/<a\b/gi) ?? []).length,
    extractedImages: (editorial.html.match(/<img\b/gi) ?? []).length,
    extractedGoLinks: (editorial.html.match(/\/go\//gi) ?? []).length,
    extractedOfferTermsMentions: (visibleText(editorial.html).match(/(?:free bet|minimum odds|deposit|withdrawal|welcome bonus|offer|terms)/gi) ?? []).length,
    extractedNamedPartners: (visibleText(editorial.html).match(/\b(?:Betfred|QuinnBet|Spreadex|Betway|NetBet|10Bet|BetWright|bet365)\b/gi) ?? []).length,
    extractedCurrencyAmounts: (visibleText(editorial.html).match(/(?:£|€)\s*\d+/g) ?? []).length,
    extractedTimeSpecificWords: (visibleText(editorial.html).match(/\b(?:today|this week|currently|2026|2025|latest)\b/gi) ?? []).length,
    conversion });
}
console.log(JSON.stringify({ auditedAt: new Date().toISOString(), sourcePage: id, outputs,
  liveStagingRenderedEqual: outputs[0].renderedSha256 === outputs[1].renderedSha256,
  liveStagingExtractedEqual: outputs[0].extractedSha256 === outputs[1].extractedSha256 }, null, 2));
