import { parseDocument, DomUtils } from 'htmlparser2';
import render from 'dom-serializer';
import { assessContent, previewHtml } from './migration-preview.mjs';

export const racingHubIdentity = Object.freeze({ databaseId: 41881, uri: '/free-horse-racing-tips', slug: 'free-horse-racing-tips' });

function text(node) { return DomUtils.textContent(node).replace(/\s+/g, ' ').trim(); }
function findHeading(nodes, value, tag = 'h2') { return nodes.findIndex((node) => node.name === tag && text(node) === value); }

export function extractRacingHubEditorial(record) {
  if (record?.databaseId !== racingHubIdentity.databaseId || record.uri !== racingHubIdentity.uri ||
      record.slug !== racingHubIdentity.slug || !record.modified || !record.content?.trim() ||
      (record.status && record.status !== 'publish')) throw new Error('Racing hub identity, state or body mismatch');
  const reasons = assessContent(record);
  if (reasons.length) throw new Error(`Racing hub source is unsafe: ${reasons.join(', ')}`);
  const nodes = parseDocument(record.content, { decodeEntities: true }).children.filter((node) => node.type === 'tag');
  const sourceSections = [
    ['How we select today’s free horse racing predictions', 'How selections are researched'],
    ['How to use today’s tips effectively', 'Using racing tips effectively'],
    ['Insider angles for more intelligent betting', 'What our team examines'],
    ['How we build trust', 'Editorial standards and corrections'],
  ];
  const positions = sourceSections.map(([heading]) => findHeading(nodes, heading));
  const commercialStart = findHeading(nodes, 'Top bookmakers for horse racing betting');
  if (positions.some((index) => index < 0) || commercialStart < 0 ||
      positions.some((index, i) => i > 0 && index <= positions[i - 1]) || commercialStart <= positions.at(-1)) {
    throw new Error('Racing hub evergreen section boundaries changed');
  }
  const sanitize = (selected) => previewHtml({ uri: record.uri, content: selected.map((node) => render(node)).join('') });
  const sections = sourceSections.map(([sourceHeading, displayHeading], i) => {
    const start = positions[i];
    const end = positions[i + 1] ?? commercialStart;
    const content = nodes.slice(start + 1, end);
    if (!content.some((node) => node.name === 'p') || !content.some((node) => node.name === 'ul')) {
      throw new Error(`Racing hub editorial section changed: ${sourceHeading}`);
    }
    return { sourceHeading, heading: displayHeading, html: sanitize(content) };
  });
  const faqStart = findHeading(nodes, 'FAQs about our horse racing tips');
  const responsibleStart = findHeading(nodes, 'Responsible gambling reminder');
  if (faqStart <= commercialStart || responsibleStart <= faqStart) throw new Error('Racing hub FAQ/safety boundaries changed');
  const selectedQuestions = [
    'How much do your tips cost?',
    'Can you bet on a horse to lose?',
    'What types of bets can you make on horses?',
    'Should I only use free horse racing tips?',
  ];
  const faq = selectedQuestions.map((question) => {
    const start = findHeading(nodes, question, 'h3');
    if (start <= faqStart || start >= responsibleStart) throw new Error(`Racing hub FAQ changed: ${question}`);
    let end = start + 1;
    while (end < responsibleStart && !['h2', 'h3'].includes(nodes[end].name)) end++;
    const content = nodes.slice(start + 1, end);
    if (!content.some((node) => node.name === 'p')) throw new Error(`Racing hub FAQ answer missing: ${question}`);
    return { question, html: sanitize(content) };
  });
  const responsible = nodes[responsibleStart + 1];
  if (responsible?.name !== 'p' || !text(responsible).includes('Never gamble more than you can afford to lose')) {
    throw new Error('Racing hub responsible-gambling source changed');
  }
  const result = { sections, faq, responsibleHtml: sanitize([responsible]), modified: record.modified, sourceMode: record.sourceMode ?? 'dated-snapshot-preview' };
  const visible = [...sections.map((item) => item.html), ...faq.map((item) => item.html), result.responsibleHtml].join('');
  if (visible.length < 5000 || /\b(?:href=|\/go\/|#Ad)\b|Get Free Bets|October 20, 2025/i.test(visible)) {
    throw new Error('Racing hub editorial extraction leaked a dated tip or commercial link');
  }
  return result;
}
