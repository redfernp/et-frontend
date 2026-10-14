import { parseDocument } from 'htmlparser2';
import render from 'dom-serializer';

const supportedInline = new Set(['a', 'strong', 'em', 'b', 'i', 'u', 'br', 'span', 'sup', 'sub']);
const legacyPortraits = [
  '/wp-content/uploads/2019/03/saturday-horse-racing-tips-and-previews-from-expert-tipster-seymour-biz-on-everytip.png',
  'John-Newsome-Football-Betting-Tips-everytip.png',
];

export function columnistConversionOptions(uri) {
  return { imageMode: 'wordpress-upload', removeLegacyPortrait: /(?:seymour-biz|john-newsome)\.html$/.test(uri ?? '') };
}

function cleanInline(node, removeLegacyPortrait) {
  if (node.type === 'text') return node;
  if (node.name === 'img') {
    if (removeLegacyPortrait && legacyPortraits.some((path) => node.attribs?.src?.includes(path))) return null;
    throw new Error('Image requires an editorial image-block decision');
  }
  if (node.type !== 'tag' || !supportedInline.has(node.name)) {
    throw new Error(`Unsupported inline markup: ${node.name ?? node.type}`);
  }
  const children = (node.children ?? []).map((child) => cleanInline(child, removeLegacyPortrait)).filter(Boolean);
  if (node.name === 'a' && children.length === 0) return null;
  return { ...node, children };
}

function innerHtml(node, removeLegacyPortrait) {
  const children = (node.children ?? []).map((child) => cleanInline(child, removeLegacyPortrait)).filter(Boolean);
  return render(children, { decodeEntities: false });
}

function soleImage(node) {
  const children = (node.children ?? []).filter((child) => child.type !== 'text' || child.data.trim());
  if (children.length !== 1) return null;
  const child = children[0];
  if (child.name === 'img') return child;
  // Legacy editors often wrapped a single upload in a presentational span.
  // Only unwrap a span that contains exactly one image (or linked image);
  // paragraphs mixing images and copy still require an editorial decision.
  if (child.name === 'span') return soleImage(child);
  if (child.name !== 'a') return null;
  const linked = (child.children ?? []).filter((item) => item.type !== 'text' || item.data.trim());
  return linked.length === 1 && linked[0].name === 'img' ? linked[0] : null;
}

function leadingImage(node) {
  const children = (node.children ?? []).filter((child) => child.type !== 'text' || child.data.trim());
  if (!children.length) return null;
  const first = children[0];
  const image = first.name === 'img' ? first : first.name === 'a' && soleImage(first);
  return image ? { image, rest: children.slice(1) } : null;
}

function hasLinkedImage(node, removeLegacyPortrait) {
  const descendants = (node.children ?? []).flatMap(function images(child) {
    return child.name === 'img' ? [child] : (child.children ?? []).flatMap(images);
  });
  if (node.name === 'a' && descendants.some((image) =>
    !removeLegacyPortrait || !legacyPortraits.some((path) => image.attribs?.src?.includes(path)))) return true;
  return (node.children ?? []).some((child) => hasLinkedImage(child, removeLegacyPortrait));
}

function imageBlock(image) {
  const source = image.attribs?.src;
  if (!source) throw new Error('Image has no source');
  const url = new URL(source, 'https://www.everytip.co.uk');
  if (url.protocol !== 'https:' ||
      !['www.everytip.co.uk', 'everytip.co.uk', 'wordpress-159231-2098144.cloudwaysapps.com'].includes(url.hostname) ||
      !url.pathname.startsWith('/wp-content/uploads/')) {
    throw new Error('Image source requires editorial review');
  }
  const escaped = (value) => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
  const alt = escaped(image.attribs?.alt ?? '');
  return `<!-- wp:image {"sizeSlug":"full"} -->\n<figure class="wp-block-image size-full"><img src="${escaped(url.href)}" alt="${alt}"/></figure>\n<!-- /wp:image -->`;
}

function paragraph(node, { removeLegacyPortrait, imageMode, rejectLinkedImages }) {
  if (imageMode === 'wordpress-upload') {
    // A linked image may be an offer CTA. Dropping the wrapper would silently
    // change a commercial placement, so defer it to the offer/content model.
    if (rejectLinkedImages && hasLinkedImage(node, removeLegacyPortrait)) throw new Error('Linked image requires an editorial offer-block decision');
    const image = soleImage(node);
    if (image) {
      if (removeLegacyPortrait && legacyPortraits.some((path) => image.attribs?.src?.includes(path))) return null;
      return imageBlock(image);
    }
    const leading = leadingImage(node);
    if (leading && !removeLegacyPortrait) {
      const remaining = innerHtml({ children: leading.rest }, false).trim().replace(/^(?:<br\s*\/?\s*>\s*)+/i, '');
      return [imageBlock(leading.image), remaining && `<!-- wp:paragraph -->\n<p>${remaining}</p>\n<!-- /wp:paragraph -->`].filter(Boolean).join('\n\n');
    }
  }
  const html = innerHtml(node, removeLegacyPortrait).trim();
  if (!html || html === '&nbsp;' || html === '\u00a0') return null;
  return `<!-- wp:paragraph -->\n<p>${html}</p>\n<!-- /wp:paragraph -->`;
}

function quote(node) {
  const children = node.children ?? [];
  const meaningful = children.filter((child) => child.type !== 'text' || child.data.trim());
  if (!meaningful.length) throw new Error('Unsupported quote structure');
  const paragraphChildren = meaningful.every((child) => child.type === 'tag' && child.name === 'p');
  const inlineChildren = meaningful.every((child) => child.type === 'text' || (child.type === 'tag' && supportedInline.has(child.name)));
  if (!paragraphChildren && !inlineChildren) throw new Error('Unsupported quote structure');
  const paragraphs = paragraphChildren
    ? meaningful.map((child) => `<p>${innerHtml(child)}</p>`).join('')
    : `<p>${innerHtml({ children })}</p>`;
  return `<!-- wp:quote -->\n<blockquote class="wp-block-quote">${paragraphs}</blockquote>\n<!-- /wp:quote -->`;
}

function list(node) {
  const items = (node.children ?? []).filter((child) => child.type === 'tag');
  if (!items.length || items.some((item) => item.name !== 'li')) {
    throw new Error('Unsupported list structure');
  }
  const ordered = node.name === 'ol';
  const attributes = ordered ? ' {"ordered":true}' : '';
  const tag = ordered ? 'ol' : 'ul';
  const itemBlocks = items.map((item) => `<!-- wp:list-item -->\n<li>${innerHtml(item)}</li>\n<!-- /wp:list-item -->`).join('\n');
  return `<!-- wp:list${attributes} -->\n<${tag} class="wp-block-list">\n${itemBlocks}\n</${tag}>\n<!-- /wp:list -->`;
}

export function classicHtmlToBlocks(html, { removeLegacyPortrait = false, imageMode = 'reject', rejectLinkedImages = false } = {}) {
  if (!html?.trim()) throw new Error('Empty classic content');
  if (/\bfl-builder\b|\bfl-row\b|\bfl-col\b|\btve_[\w-]+\b|\bthrv_[\w-]+\b|<\s*(?:script|iframe|form|style)\b/i.test(html)) {
    throw new Error('Builder or active markup requires manual conversion');
  }
  if (/\[(?:ninja_tables|adinserter|su_|vc_|et_|fl_builder|thrive_)[^\]]*\]/i.test(html)) {
    throw new Error('Shortcode requires a dedicated block or content model');
  }
  const document = parseDocument(html, { decodeEntities: false });
  const blocks = [];
  const inlineRun = [];
  const flushInlineRun = () => {
    if (!inlineRun.length) return;
    const content = innerHtml({ children: inlineRun }, removeLegacyPortrait).trim();
    inlineRun.length = 0;
    if (content) blocks.push(`<!-- wp:paragraph -->\n<p>${content}</p>\n<!-- /wp:paragraph -->`);
  };
  for (const node of document.children) {
    if (node.type === 'text' || (node.type === 'tag' && supportedInline.has(node.name))) {
      // Classic editor content can contain plain prose and inline markup outside
      // paragraphs. Group adjacent fragments into one editable paragraph.
      inlineRun.push(node);
      continue;
    }
    flushInlineRun();
    if (node.type !== 'tag') throw new Error(`Unexpected top-level markup: ${node.type}`);
    let block;
    if (node.name === 'p') block = paragraph(node, { removeLegacyPortrait, imageMode, rejectLinkedImages });
    else if (node.name === 'img' && imageMode === 'wordpress-upload') {
      block = removeLegacyPortrait && legacyPortraits.some((path) => node.attribs?.src?.includes(path)) ? null : imageBlock(node);
    }
    else if (node.name === 'blockquote') block = quote(node);
    else if (node.name === 'ul' || node.name === 'ol') block = list(node);
    else if (/^h[1-4]$/.test(node.name)) {
      const level = Number(node.name[1]);
      block = `<!-- wp:heading {"level":${level}} -->\n<${node.name} class="wp-block-heading">${innerHtml(node)}</${node.name}>\n<!-- /wp:heading -->`;
    } else throw new Error(`Unsupported top-level markup: ${node.name}`);
    if (block) blocks.push(block);
  }
  flushInlineRun();
  if (!blocks.length) throw new Error('No convertible content blocks');
  return blocks.join('\n\n');
}
