import { parseDocument } from 'htmlparser2';
import { render } from 'dom-serializer';
import sanitizeHtml from 'sanitize-html';

const headingText = (node) => node.type === 'text' ? node.data : (node.children ?? []).map(headingText).join('');
function hasCommercialLink(node) {
  if (node.name === 'a' && (/\/go\/|\/sign-up-offer|[?&](?:aff|affiliate|btag|via)=/i.test(node.attribs?.href || '')
    || /\bsponsored\b/i.test(node.attribs?.rel || ''))) return true;
  return (node.children ?? []).some(hasCommercialLink);
}

export function extractFreeTipsEditorial(record) {
  if (record?.uri !== '/free-betting-tips' || !record.content) throw new Error('Expected exact free tips WordPress page');
  const nodes = parseDocument(record.content, { decodeEntities: true }).children.filter((node) => node.type === 'tag');
  const start = nodes.findIndex((node) => node.name === 'h2' && /^Free Sports Betting Tips From Professional Betting Tipsters$/i.test(headingText(node).trim()));
  if (start < 0) throw new Error('Free tips editorial boundary changed in WordPress');
  const end = nodes.findIndex((node, index) => index > start && node.name === 'h2' && /^Where to watch$/i.test(headingText(node).trim()));
  const editorial = nodes.slice(start, end < 0 ? undefined : end)
    .filter((node) => ['p', 'h2', 'h3', 'h4', 'ul', 'ol', 'blockquote'].includes(node.name) && !hasCommercialLink(node));
  const html = sanitizeHtml(editorial.map(render).join(''), {
    allowedTags: ['p', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'blockquote', 'br'],
    allowedAttributes: {},
    transformTags: { a: () => ({ tagName: 'span', attribs: {} }), img: () => ({ tagName: 'span', attribs: {} }) },
  }).trim();
  if ((html.match(/<h2>/g) ?? []).length < 4 || html.length < 2500) throw new Error('Free tips extracted copy needs editorial review');
  return { html, headingCount: (html.match(/<h[23]>/g) ?? []).length, sourceNodeCount: editorial.length };
}
