import { parseDocument } from 'htmlparser2';
import render from 'dom-serializer';
import { previewHtml } from './migration-preview.mjs';

function plainText(node) {
  return node.type === 'text' ? node.data : (node.children ?? []).map(plainText).join('');
}

export function splitLowDepositRoundup(record, hero) {
  const nodes = parseDocument(record.content, { decodeEntities: true }).children.filter((node) => node.type === 'tag');
  const featureStart = nodes.findIndex((node) => node.name === 'h2' && /^List of Best Low\/No Minimum Deposit Betting Sites/i.test(plainText(node).trim()));
  const featureEnd = nodes.findIndex((node, index) => index > featureStart && node.name === 'h2' && /^Betting Bonuses/i.test(plainText(node).trim()));
  if (featureStart < 0 || featureEnd <= featureStart) throw new Error('Low-deposit feature boundaries changed; manual review required');
  const profile = nodes.slice(featureStart + 1, featureEnd);
  const genericIntro = profile.filter((node) => node.name === 'p' && /^(While compiling our list|So without much ado)/i.test(plainText(node).trim()));
  if (genericIntro.length !== 2 || !profile.some((node) => /Betfred Review/.test(plainText(node)))) {
    throw new Error('Low-deposit bookmaker section changed; manual review required');
  }
  const excludedImagePaths = hero ? [new URL(hero).pathname] : [];
  const sanitize = (parts) => previewHtml({ uri: record.uri, content: parts.map((node) => render(node)).join('\n') }, { excludedImagePaths });
  return {
    intro: sanitize(nodes.slice(0, featureStart)),
    body: sanitize([...genericIntro, ...nodes.slice(featureEnd)]),
    withheldNodes: profile.length - genericIntro.length,
  };
}
