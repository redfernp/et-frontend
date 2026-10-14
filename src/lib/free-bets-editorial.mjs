import { parseDocument } from 'htmlparser2';
import { render } from 'dom-serializer';
import sanitizeHtml from 'sanitize-html';

const textOf = (node) => node.type === 'text' ? node.data : (node.children ?? []).map(textOf).join('');

export function extractFreeBetsEditorial(record) {
  if (record?.uri !== '/bookie-free-bets-bonus-offers' || !record.content) throw new Error('Expected exact WordPress free-bets page');
  const nodes = parseDocument(record.content, { decodeEntities: true }).children.filter((node) => node.type === 'tag');
  const start = nodes.findIndex((node) => node.name === 'h2' && /^What Are Free Bets\?$/i.test(textOf(node).trim()));
  if (start < 0) throw new Error('Free-bets editorial boundary changed in WordPress');
  const editorial = nodes.slice(start).filter((node) => ['h2', 'h3', 'h4', 'p', 'ul', 'ol', 'blockquote'].includes(node.name));
  const html = sanitizeHtml(editorial.map(render).join(''), {
    allowedTags: ['h2', 'h3', 'h4', 'p', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'br', 'blockquote'],
    allowedAttributes: {},
    transformTags: { a: () => ({ tagName: 'span', attribs: {} }), img: () => ({ tagName: 'span', attribs: {} }) },
  }).trim();
  if ((html.match(/<h2>/g) ?? []).length < 5 || html.length < 5000) throw new Error('Free-bets source copy needs editorial review');
  return { html, headingCount: (html.match(/<h[234]>/g) ?? []).length };
}
