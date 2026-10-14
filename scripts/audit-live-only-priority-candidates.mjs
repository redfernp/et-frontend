// Read-only risk inventory for the 31 known live-only October posts that still lack exact assets.
import { parseDocument, DomUtils } from 'htmlparser2';

const ordinary = [91093, 91076, 91055, 91018, 90995, 90976, 90959, 90940, 90900, 90898, 90875, 90852, 90833];
const offerNews = [91115, 91111, 91095, 91091, 91074, 91057, 90978, 91053, 91016, 90993, 90974, 90957, 90925, 90938, 90816, 90874, 90851, 90832];
const ids = [...ordinary, ...offerNews];
if (ids.length !== 31 || new Set(ids).size !== 31) throw new Error('Expected exactly 31 unique IDs');

async function inspect(id) {
  const response = await fetch(`https://www.everytip.co.uk/wp-json/wp/v2/posts/${id}?context=view`, {
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Live post ${id}: HTTP ${response.status}`);
  const post = await response.json();
  const link = new URL(post.link);
  if (post.id !== id || post.status !== 'publish' || link.hostname !== 'www.everytip.co.uk' ||
      link.pathname !== `/${post.slug}.html` || !post.content?.rendered) {
    throw new Error(`Identity/path/status mismatch for ${id}`);
  }
  const doc = parseDocument(post.content.rendered, { decodeEntities: true });
  const nodes = (name) => DomUtils.findAll((node) => node.name === name, doc.children, true);
  const body = DomUtils.textContent(doc).replace(/\s+/g, ' ').trim();
  const links = nodes('a').map((node) => node.attribs?.href ?? '');
  return { id, family: ordinary.includes(id) ? 'ordinary-tip-hybrid' : 'offer-news',
    path: link.pathname, date: post.date, modified: post.modified,
    title: DomUtils.textContent(parseDocument(post.title?.rendered ?? '', { decodeEntities: true })).trim(),
    paragraphCount: nodes('p').length, tableCount: nodes('table').length,
    tableRows: nodes('tr').length, goLinks: links.filter((href) => /\/go\//i.test(href)).length,
    otherLinks: links.filter((href) => !/\/go\//i.test(href)).length,
    oddsOrPriceMentions: (body.match(/\b(?:odds|forecast|tissue|price|\d+\/\d+)\b/gi) ?? []).length,
    currentDayMentions: (body.match(/\b(?:today|tonight|this morning|this afternoon|this weekend)\b/gi) ?? []).length,
    offerMechanicMentions: (body.match(/\b(?:free bet|refund|money back|extra places?|cash bonus|terms|T&Cs)\b/gi) ?? []).length,
    visibleCharacters: body.length };
}
const records = [];
for (let i = 0; i < ids.length; i += 4) {
  records.push(...await Promise.all(ids.slice(i, i + 4).map(inspect)));
}
const aggregate = (family) => {
  const rows = records.filter((row) => row.family === family);
  return { count: rows.length, tables: rows.filter((row) => row.tableCount).length,
    withGoLinks: rows.filter((row) => row.goLinks).length,
    withOfferMentions: rows.filter((row) => row.offerMechanicMentions).length,
    withCurrentDayMentions: rows.filter((row) => row.currentDayMentions).length,
    withOddsOrPrices: rows.filter((row) => row.oddsOrPriceMentions).length };
};
console.log(JSON.stringify({ auditedAt: new Date().toISOString(), mode: 'read-only-live-public-rest',
  ordinary: aggregate('ordinary-tip-hybrid'), offerNews: aggregate('offer-news'), records }, null, 2));
