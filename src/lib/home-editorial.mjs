import { parseDocument } from 'htmlparser2';
import { render } from 'dom-serializer';
import sanitizeHtml from 'sanitize-html';

const textOf = (node) => node.type === 'text' ? node.data : (node.children ?? []).map(textOf).join('');

export function extractHomeEditorial(record) {
  if (record?.uri !== '/' || !record.content) throw new Error('Expected exact WordPress homepage');
  const nodes = parseDocument(record.content, { decodeEntities: true }).children.filter((node) => node.type === 'tag');
  const start = nodes.findIndex((node) => node.name === 'h2' && /^Free Betting Tips Published Every Day On Every Tip!?$/i.test(textOf(node).trim()));
  const end = nodes.findIndex((node, index) => index > start && node.name === 'h2' && /^Latest Free Betting Tips Published/i.test(textOf(node).trim()));
  if (start < 0 || end <= start) throw new Error('Homepage editorial boundary changed in WordPress');
  const paragraphs = nodes.slice(start + 1, end).filter((node) => node.name === 'p')
    .filter((node) => !/\b(sign-up bonuses|casino sites|fastest-growing)\b/i.test(textOf(node)));
  const html = sanitizeHtml(paragraphs.map(render).join(''), {
    allowedTags: ['p', 'strong', 'em', 'b', 'i', 'br'],
    allowedAttributes: {},
    transformTags: { a: () => ({ tagName: 'span', attribs: {} }), img: () => ({ tagName: 'span', attribs: {} }) },
  }).trim();
  if ((html.match(/<p>/g) ?? []).length < 6 || html.length < 1400) throw new Error('Homepage copy needs manual editorial review');
  return { html, paragraphCount: (html.match(/<p>/g) ?? []).length };
}
