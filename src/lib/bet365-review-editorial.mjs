import { parseDocument, DomUtils } from 'htmlparser2';
import render from 'dom-serializer';
import { previewHtml, assessContent } from './migration-preview.mjs';

export const bet365ReviewIdentity = Object.freeze({ databaseId: 87553, uri: '/bet365-review', slug: 'bet365-review' });

const commercialText = /(?:bet £10|£30|free bets|claim (?:offer|bet365)|open bet365|#ad|sign up takes|current standing promotions|best price offer on televised|accumulator bonus ranging)/i;
const uiText = /^(?:\d(?:\.\d)?\s*\/\s*5|[★✓⚠️\s]+|credentials|contact options|highlights|odds highlights|in-play features|banking options|app highlights|streaming coverage|the one gripe:|no standout vip or loyalty programme)$/i;

function cleanText(node) { return DomUtils.textContent(node).replace(/\s+/g, ' ').trim(); }

export function validateBet365Review(record) {
  if (record?.databaseId !== bet365ReviewIdentity.databaseId || record.uri !== bet365ReviewIdentity.uri ||
      record.slug !== bet365ReviewIdentity.slug || !record.content?.trim() || !record.modified ||
      (record.status && record.status !== 'publish')) {
    throw new Error('Bet365 review identity, state or body mismatch');
  }
  const reasons = assessContent(record);
  if (reasons.length) throw new Error(`Bet365 review is unsafe to render: ${reasons.join(', ')}`);
  return record;
}

/** Keep the complete dated first-hand assessment while removing every offer slot. */
export function extractBet365ReviewEditorial(record) {
  validateBet365Review(record);
  const nodes = parseDocument(record.content, { decodeEntities: true }).children.filter((node) => node.type === 'tag');
  const text = nodes.map(cleanText);
  const headings = nodes.map((_node, index) => ({ index, title: text[index], number: Number(text[index].match(/^(\d{1,2})\.\s/)?.[1]) }))
    .filter(({ number }) => number >= 1 && number <= 10);
  if (headings.length !== 10 || headings.some((heading, index) => heading.number !== index + 1)) {
    throw new Error('Bet365 review ten-section contract changed');
  }
  const verdictIndex = text.findIndex((value) => value === 'Seymour Biz Final Verdict');
  const methodIndex = text.findIndex((value) => value.startsWith('Seymour has covered horse racing for EveryTip since 2014.'));
  if (verdictIndex <= headings[9].index || methodIndex < 0) throw new Error('Bet365 review method/verdict contract changed');
  const prosIndex = text.findIndex((value) => value.includes('Bet365 Pros'));
  const consIndex = text.findIndex((value) => value.includes('Bet365 Cons'));
  const pros = nodes[prosIndex + 1]?.name === 'ul' ? nodes[prosIndex + 1].children.filter((node) => node.name === 'li') : [];
  const cons = nodes[consIndex + 1]?.name === 'ul' ? nodes[consIndex + 1].children.filter((node) => node.name === 'li') : [];
  if (pros.length !== 8 || cons.length !== 3 || prosIndex >= consIndex || consIndex >= headings[0].index) {
    throw new Error('Bet365 review pros/cons source contract changed');
  }

  const editorialNode = (node) => {
    const value = cleanText(node);
    return node.name === 'p' && value.length >= 95 && !commercialText.test(value) && !uiText.test(value);
  };
  const toHtml = (selected) => previewHtml({ uri: record.uri, content: selected.map((node) => render(node)).join('') });
  const sections = headings.slice(1).map((heading, index) => {
    const end = headings[index + 2]?.index ?? verdictIndex;
    const editorial = nodes.slice(heading.index + 1, end).filter(editorialNode);
    if (editorial.length < 2) throw new Error(`Bet365 review section ${heading.number} editorial text missing`);
    return { number: heading.number, title: heading.title.replace(/^\d{1,2}\.\s*/, ''), html: toHtml(editorial), paragraphCount: editorial.length };
  });
  const verdict = nodes.slice(verdictIndex + 1).filter((node) => node.name === 'p' && cleanText(node).startsWith('“I '));
  if (verdict.length !== 2) throw new Error('Bet365 review first-person verdict changed');
  const method = nodes[methodIndex];
  const result = {
    methodHtml: toHtml([method]),
    // First pro is a welcome-offer claim; last is an unverified withdrawal
    // minimum/timing claim. Keep the six source-written, dated observations.
    prosHtml: toHtml([{ type: 'tag', name: 'ul', attribs: {}, children: pros.slice(1, 7) }]),
    consHtml: toHtml([nodes[consIndex + 1]]),
    sections,
    verdictHtml: toHtml(verdict),
    modified: record.modified,
    sourceMode: record.sourceMode ?? 'dated-snapshot-preview',
    withheldWelcomeSection: headings[0].title,
  };
  const rendered = `${result.methodHtml}${result.prosHtml}${result.consHtml}${sections.map(({ html }) => html).join('')}${result.verdictHtml}`;
  if (commercialText.test(rendered) || /\b(?:href|\/go\/)\b/i.test(rendered)) throw new Error('Commercial copy leaked into Bet365 editorial preview');
  if (rendered.replace(/<[^>]*>/g, '').length < 3000) throw new Error('Bet365 review editorial extraction is unexpectedly short');
  return result;
}
