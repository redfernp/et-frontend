import { parseDocument } from 'htmlparser2';
import { classicHtmlToBlocks } from './classic-to-gutenberg.mjs';
import { previewHtml } from './migration-preview.mjs';

function firstImage(nodes) {
  for (const node of nodes) {
    if (node.name === 'img') return node;
    const nested = firstImage(node.children ?? []);
    if (nested) return nested;
  }
  return null;
}

function normalizedText(html) {
  const walk = (node) => node.type === 'text' ? node.data : (node.children ?? []).map(walk).join('');
  return parseDocument(html, { decodeEntities: true }).children.map(walk).join('').replace(/\s+/g, ' ').trim();
}

export function roundupSnapshotPreview(snapshot, uri) {
  const source = [...(snapshot?.posts ?? []), ...(snapshot?.pages ?? [])].find((item) => item.uri === uri);
  if (!source?.content) throw new Error(`Missing exact roundup source: ${uri}`);
  const imageSource = firstImage(parseDocument(source.content).children)?.attribs?.src;
  const imageUrl = imageSource ? new URL(imageSource, 'https://www.everytip.co.uk') : null;
  const imagePath = imageUrl?.protocol === 'https:' && imageUrl.pathname.startsWith('/wp-content/uploads/') &&
    ['www.everytip.co.uk', 'wordpress-159231-2098144.cloudwaysapps.com'].includes(imageUrl.hostname)
    ? imageUrl.pathname : null;
  const converted = classicHtmlToBlocks(source.content, { imageMode: 'wordpress-upload' });
  if (normalizedText(converted) !== normalizedText(source.content)) {
    throw new Error(`Roundup text parity failed: ${uri}`);
  }
  return {
    source,
    hero: imagePath ? `https://www.everytip.co.uk${imagePath}` : undefined,
    body: previewHtml(source, { excludedImagePaths: imagePath ? [imagePath] : [] }),
    blockCount: (converted.match(/<!-- wp:/g) ?? []).length,
  };
}
