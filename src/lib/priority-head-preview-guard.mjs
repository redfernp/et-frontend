// Local preview invariant: Gutenberg draft body/feed opt-ins must not silently
// replace published-page SEO identity or make priority pages indexable.
import { parseDocument, DomUtils } from 'htmlparser2';

const walk = (node, name, out = []) => {
  if (node.name === name) out.push(node);
  for (const child of node.children ?? []) walk(child, name, out);
  return out;
};
const decoded = (value) => DomUtils.textContent(parseDocument(value ?? '', { decodeEntities: true })).trim();

export function validatePriorityHeadPreview(html, source, expected) {
  if (!['/', '/free-betting-tips'].includes(expected?.uri) ||
      source?.uri !== expected.uri || source.databaseId !== expected.id ||
      typeof html !== 'string' || !html.startsWith('<!DOCTYPE html>')) {
    throw new Error('Priority preview source or HTML identity mismatch');
  }
  const document = parseDocument(html, { decodeEntities: true });
  const head = walk(document, 'head');
  if (head.length !== 1) throw new Error('Priority preview needs one document head');
  const titles = walk(head[0], 'title');
  const metas = walk(head[0], 'meta');
  const links = walk(head[0], 'link');
  const meta = (name) => metas.filter((node) => node.attribs?.name?.toLowerCase() === name);
  const robots = meta('robots');
  const description = meta('description');
  const preview = meta('everytip-preview');
  if (titles.length !== 1 || robots.length !== 1 || description.length !== 1 || preview.length !== 1 ||
      DomUtils.textContent(titles[0]).trim() !== decoded(source.seo?.title) ||
      description[0].attribs?.content?.trim() !== decoded(source.seo?.metaDesc) ||
      robots[0].attribs?.content?.toLowerCase() !== 'noindex,nofollow' ||
      preview[0].attribs?.content !== 'not-for-publication' ||
      links.some((node) => node.attribs?.rel?.toLowerCase() === 'canonical') ||
      /wordpress-159231-2098144\.cloudwaysapps\.com|migration-draft-(?:home|free-tips)/i.test(html)) {
    throw new Error(`Priority preview SEO/head guard failed: ${expected.uri}`);
  }
  return { uri: expected.uri, id: expected.id, title: DomUtils.textContent(titles[0]).trim(),
    description: description[0].attribs.content, robots: robots[0].attribs.content,
    previewOnly: true, canonical: null };
}
