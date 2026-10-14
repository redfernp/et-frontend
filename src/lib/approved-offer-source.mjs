import { parseDocument } from 'htmlparser2';
import render from 'dom-serializer';

export const approvedOfferIds = Object.freeze({ betfred: 90846, quinnbet: 90848, spreadex: 90849,
  betway: 90850, betwright: 90889, netbet: 90851, '10bet': 90852 });
const all = (node, predicate) => [...(predicate(node) ? [node] : []), ...(node.children ?? []).flatMap(child => all(child, predicate))];
const text = node => node.type === 'text' ? node.data : (node.children ?? []).map(text).join('');
const hasClass = (node, name) => (node.attribs?.class ?? '').split(/\s+/).includes(name);

// The approved page supplies the wording. No operator review or copy rewriting.
export function approvedOfferSource(html) {
  const doc = parseDocument(html);
  const offers = [];
  for (const row of all(doc, node => hasClass(node, 'fl-row-content'))) {
    const goLinks = all(row, node => node.name === 'a' && /\/go\//.test(node.attribs?.href ?? ''));
    const partners = [...new Set(goLinks.map(node => {
      const slug = new URL(node.attribs.href, 'https://www.everytip.co.uk').pathname.split('/')[2];
      return slug === 'netbet-50' ? 'netbet' : slug;
    }))];
    if (partners.length !== 1 || !approvedOfferIds[partners[0]]) continue;
    const partner = partners[0];
    const paragraphs = all(row, node => node.name === 'p').map(node => text(node).trim()).filter(Boolean);
    const terms = paragraphs.find(value => /^#?Ad\b/i.test(value)) ||
      paragraphs.findLast(value => /\b(?:terms|T&Cs)\b/i.test(value));
    const reviewIndex = paragraphs.findIndex(value => /\bReview$/i.test(value));
    const headline = paragraphs[reviewIndex + 1];
    if (!terms || reviewIndex < 0 || !headline || headline === terms) throw new Error(`Offer source structure incomplete: ${partner}`);
    if (offers.some(offer => offer.partner === partner)) throw new Error(`Duplicate source offer row: ${partner}`);
    offers.push({ id: approvedOfferIds[partner], partner, headline, compactTerms: terms,
      ctaPath: new URL(goLinks[0].attribs.href, 'https://www.everytip.co.uk').pathname,
      rowHtml: render(row) });
  }
  if (offers.length !== 7) throw new Error(`Expected seven approved source rows, found ${offers.length}`);
  return offers;
}
