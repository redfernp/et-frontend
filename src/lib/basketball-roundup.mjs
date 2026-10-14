import { parseDocument } from 'htmlparser2';
import render from 'dom-serializer';
import { previewHtml } from './migration-preview.mjs';

const text = (node) => node.type === 'text' ? node.data : (node.children ?? []).map(text).join('');

export function splitBasketballRoundup(record, hero) {
  const nodes = parseDocument(record.content, { decodeEntities: true }).children.filter((node) => node.type === 'tag');
  const start = nodes.findIndex((node) => node.name === 'h2' && /^Betway$/i.test(text(node).trim()));
  const end = nodes.findIndex((node, index) => index > start && node.name === 'h2' && /^How We Evaluate Sites$/i.test(text(node).trim()));
  const profile = nodes.slice(start, end);
  if (start < 0 || end <= start || !/^Best Basketball Betting Sites$/i.test(text(nodes[start - 2] ?? {}).trim()) ||
      !['Betway', 'Paddypower', 'Bet365', 'William Hill'].every((name) => profile.some((node) => node.name === 'h2' && text(node).trim().toLowerCase() === name.toLowerCase()))) {
    throw new Error('Basketball bookmaker section changed; manual review required');
  }
  const excludedImagePaths = hero ? [new URL(hero).pathname] : [];
  const sanitize = (parts) => previewHtml({ uri: record.uri, content: parts.map((node) => render(node)).join('\n') }, { excludedImagePaths });
  return {
    intro: sanitize(nodes.slice(0, start)),
    body: sanitize(nodes.slice(end)),
    withheldNodes: profile.length,
  };
}
