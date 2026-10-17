import { parseDocument } from 'htmlparser2';
import render from 'dom-serializer';

// Splits a bookmaker review's WordPress HTML into the parts of the approved review design:
// intro, pros/cons, numbered sections, verdict and the trailing "other offers" block.
// Every node is kept somewhere, so no review copy or offer placement is lost.

const text = (node) => node.type === 'text' ? node.data : (node.children ?? []).map(text).join('');
const clean = (value) => value.replace(/\s+/g, ' ').trim();
const escape = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

// Titles may lead with an emoji and the bookmaker's name ("✅ Boylesports Pros").
const bare = (title) => title.replace(/^[^A-Za-z0-9]+/, '');
const prosTitle = { test: (title) => /^(pros|what we like|what he liked|the good|advantages)\b/i.test(bare(title)) || /\bpros$/i.test(title) };
const consTitle = { test: (title) => /^(cons|what to watch|where it fell short|the bad|disadvantages|drawbacks)\b/i.test(bare(title)) || /\bcons$/i.test(title) };
const verdictTitle = /(verdict|conclusion|final thoughts|bottom line|overall)/i;
const otherOffersTitle = /^other (current )?bookmaker offers/i;

export function splitReview(html) {
  const nodes = parseDocument(html ?? '', { decodeEntities: true }).children
    .filter((node) => node.type === 'tag' || (node.type === 'text' && clean(node.data)));
  // Seymour's newer reviews put their numbered areas under h3s; split on whichever level carries the sections.
  const count = (name) => nodes.filter((node) => node.type === 'tag' && node.name === name).length;
  const level = count('h2') < 4 && count('h3') >= 4 ? 'h3' : 'h2';
  const sections = [];
  let current = { title: null, nodes: [] };
  for (const node of nodes) {
    if (node.type === 'tag' && node.name === level) {
      sections.push(current);
      current = { title: clean(text(node)), nodes: [] };
    } else current.nodes.push(node);
  }
  sections.push(current);
  const toHtml = (section) => section.nodes.map((node) => render(node)).join('');
  const [intro, ...rest] = sections;
  const result = { introHtml: toHtml(intro), pros: null, cons: null, verdict: null, otherOffersHtml: '', claimHtml: '', sections: [], headline: null };
  for (const section of rest) {
    if (!section.title) continue;
    // Bylines, dates and review titles belong in the hero, not the numbered sections.
    if (/^(last updated|reviewed by|written by|by seymour)/i.test(section.title)) { result.introHtml += toHtml(section); continue; }
    if (/^ready to claim/i.test(section.title)) { result.claimHtml += `<h2>${escape(section.title)}</h2>${toHtml(section)}`; continue; }
    if (!result.headline && /review/i.test(section.title) && !section.nodes.length) { result.headline = section.title; continue; }
    if (!result.headline && /review/i.test(section.title) && result.sections.length === 0) { result.headline = section.title; result.introHtml += toHtml(section); continue; }
    if (prosTitle.test(section.title) && !result.pros) { result.pros = { title: section.title, html: toHtml(section) }; continue; }
    if (consTitle.test(section.title) && !result.cons) { result.cons = { title: section.title, html: toHtml(section) }; continue; }
    if (otherOffersTitle.test(section.title)) { result.otherOffersHtml += `<h2>${escape(section.title)}</h2>${toHtml(section)}`; continue; }
    if (verdictTitle.test(section.title)) { result.verdict = { title: section.title, html: (result.verdict?.html ?? '') + toHtml(section) }; continue; }
    // Older reviews follow each rating heading with a question ("How easy was it to claim?"); keep it in that section.
    const previous = result.sections.at(-1);
    if (previous && /\?$/.test(section.title) && !/^\d+\./.test(section.title)) { previous.html += `<h4>${escape(section.title)}</h4>${toHtml(section)}`; continue; }
    result.sections.push({ title: section.title, html: toHtml(section) });
  }
  return result;
}

// The page's own welcome-offer copy: first #Ad paragraph and first /go/ link.
export function reviewOwnOffer(html, bookmakerName = '') {
  // Only this bookmaker's own /go/ link counts (pages also link to rival bookmakers).
  const key = bookmakerName.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 6);
  const ours = (href) => key && href.toLowerCase().replace(/[^a-z0-9]/g, '').includes(key);
  const doc = parseDocument(html ?? '', { decodeEntities: true });
  let terms = null;
  let link = null;
  let headline = null;
  const visit = (node) => {
    if (node.type !== 'tag') return;
    // Offer blocks and ranked cards belong to other bookmakers; never take their copy.
    if (node.name === 'aside' || /\brank-card\b/.test(node.attribs.class ?? '')) return;
    if (!headline && /^h[2-4]$/.test(node.name)) {
      const heading = clean(text(node));
      if (/(£|€)\s?\d|\d+%/.test(heading) && heading.length < 90) headline = heading.replace(/^ready to claim your\s*/i, '').replace(/\?$/, '');
    }
    if (!terms && node.name === 'p' && /^#Ad/i.test(clean(text(node)))) terms = clean(text(node));
    if (!link && node.name === 'a' && /\/go\//.test(node.attribs.href ?? '') && ours(node.attribs.href.split('/go/')[1] ?? '')) link = node.attribs.href;
    node.children.forEach(visit);
  };
  doc.children.forEach(visit);
  return { terms, link, headline };
}
