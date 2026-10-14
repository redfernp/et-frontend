import { createHash } from 'node:crypto';
import { parseDocument } from 'htmlparser2';
import { render } from 'dom-serializer';
import { previewHtml } from './migration-preview.mjs';

const expected = Object.freeze({
  uri: '/what-is-a-patent-bet',
  databaseId: 81395,
  digest: 'b10a0de2129068083fb115218301be451fafe8d16f3a5d8c435d8a6fcca1c553',
  calculatorPostId: '81312',
});

function find(node, predicate, found = []) {
  if (predicate(node)) found.push(node);
  for (const child of node.children ?? []) find(child, predicate, found);
  return found;
}
function text(node) {
  return node.type === 'text' ? node.data : (node.children ?? []).map(text).join(' ');
}
function remove(node) {
  if (!node.parent) throw new Error('Expected a parent for the patent calculator widget');
  node.parent.children = node.parent.children.filter((child) => child !== node);
}

/** Dated source-locked editorial preview; the interactive calculator is omitted. */
export function patentBetPreviewRecord(record) {
  const digest = createHash('sha256').update(record?.content ?? '').digest('hex');
  if (record?.uri !== expected.uri || record.databaseId !== expected.databaseId || digest !== expected.digest) {
    throw new Error('Patent-bet source changed; review before previewing');
  }
  const document = parseDocument(record.content, { decodeEntities: false });
  const widgets = find(document, (node) => node.name === 'div' &&
    node.attribs?.class?.split(/\s+/).includes('fl-builder-content'));
  if (widgets.length !== 1 || widgets[0].attribs?.['data-post-id'] !== expected.calculatorPostId) {
    throw new Error('Patent-bet calculator structure changed');
  }
  const invitations = find(document, (node) => node.name === 'p' && /calculator below/i.test(text(node)));
  if (invitations.length !== 1) throw new Error('Patent-bet calculator invitation changed');
  remove(widgets[0]);
  remove(invitations[0]);
  const content = render(document.children);
  // The normal article sanitizer must still reject any other builder or active markup.
  previewHtml({ ...record, content });
  return { ...record, content, withheldWidget: 'patent-calculator' };
}
