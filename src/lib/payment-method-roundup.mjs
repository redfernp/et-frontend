import { parseDocument } from 'htmlparser2';
import render from 'dom-serializer';
import { previewHtml } from './migration-preview.mjs';

const boundaries = {
  Neteller: { start: /^Top Online Bookmakers That Accept Neteller$/i, end: /^History of Neteller$/i },
  Skrill: { start: /^Editor Pick.*Online Bookmakers that accept Skrill$/i, end: /^What is Skrill and How Does it Work\?$/i },
};
const text = (node) => node.type === 'text' ? node.data : (node.children ?? []).map(text).join('');

export function splitPaymentMethodRoundup(record, method, hero) {
  const headings = boundaries[method];
  if (!headings) throw new Error(`Unsupported payment guide: ${method}`);
  const nodes = parseDocument(record.content, { decodeEntities: true }).children.filter((node) => node.type === 'tag');
  const start = nodes.findIndex((node) => node.name === 'h2' && headings.start.test(text(node).trim()));
  const end = nodes.findIndex((node, index) => index > start && node.name === 'h2' && headings.end.test(text(node).trim()));
  if (start < 0 || end <= start) throw new Error(`${method} bookmaker section changed; manual review required`);
  const feature = nodes.slice(start + 1, end);
  const editorialNote = method === 'Neteller'
    ? feature.filter((node) => node.name === 'p' && /^Please note a lot of online bookmakers/i.test(text(node).trim()))
    : [];
  if ((method === 'Neteller' && editorialNote.length !== 1) ||
      !feature.some((node) => /Betfred Review/.test(text(node))) ||
      !feature.some((node) => /NetBet Review/.test(text(node)))) {
    throw new Error(`${method} source profiles changed; manual review required`);
  }
  const excludedImagePaths = hero ? [new URL(hero).pathname] : [];
  const sanitize = (parts) => previewHtml({ uri: record.uri, content: parts.map((node) => render(node)).join('\n') }, { excludedImagePaths });
  return {
    intro: sanitize(nodes.slice(0, start)),
    body: sanitize([...editorialNote, ...nodes.slice(end)]),
    withheldNodes: feature.length - editorialNote.length,
  };
}
