import { parseDocument } from 'htmlparser2';
import render from 'dom-serializer';
import { cleanupBuilderHtml } from './builder-cleanup.mjs';

const wrap = (name, html, attributes) => `<!-- wp:${name}${attributes ? ` ${JSON.stringify(attributes)}` : ''} -->\n${html}\n<!-- /wp:${name} -->`;
export function offerSlotBlock(id) {
  if (!Number.isSafeInteger(id) || id < 1) throw new Error('Invalid offer ID');
  return `<!-- wp:acf/everytip-offer-slot ${JSON.stringify({ name: 'acf/everytip-offer-slot', data: {
    et_slot_offer: id, _et_slot_offer: 'field_et_slot_offer_v1',
    et_slot_layout: 'inline', _et_slot_layout: 'field_et_slot_layout_v1',
  }, mode: 'preview' })} /-->`;
}

/** Generic builder migration: core prose/image/list/table blocks, ACF offer slots.
 * Caller supplies already-identified offer markers; no article-specific extraction.
 */
export function builderToBlocks(html) {
  if (/<(?:script|iframe|form)\b/i.test(html)) throw new Error('Embedded script/frame/form needs its launch integration before CMS replacement');
  const doc = parseDocument(cleanupBuilderHtml(html));
  function convert(nodes) {
    const result = [];
    for (const node of nodes) {
      if (node.type === 'comment') continue;
      if (node.type === 'text') {
        if (node.data.trim()) result.push(wrap('paragraph', `<p>${render(node)}</p>`));
        continue;
      }
      const marker = node.attribs?.['data-everytip-offer-slot'];
      if (marker) { result.push(offerSlotBlock(Number(marker))); continue; }
      const name = node.name;
      if (/^h[1-6]$/.test(name)) {
        node.attribs.class = 'wp-block-heading';
        result.push(wrap('heading', render(node), { level: Number(name[1]) }));
      } else if (name === 'p') result.push(wrap('paragraph', render(node)));
      else if (name === 'ul' || name === 'ol') {
        node.attribs.class = 'wp-block-list';
        const items = (node.children ?? []).filter(n => n.name === 'li').map(n => wrap('list-item', render(n))).join('\n');
        result.push(wrap('list', `<${name} class="wp-block-list">${items}</${name}>`, name === 'ol' ? { ordered: true } : undefined));
      } else if (name === 'img') result.push(wrap('image', `<figure class="wp-block-image">${render(node)}</figure>`));
      else if (name === 'table') result.push(wrap('table', `<figure class="wp-block-table">${render(node)}</figure>`));
      else if (['div', 'section', 'article', 'figure', 'header', 'main'].includes(name)) result.push(...convert(node.children ?? []));
      else if (name === 'hr') result.push(wrap('separator', '<hr class="wp-block-separator has-alpha-channel-opacity"/>'));
      else if (['a', 'span', 'strong', 'em', 'b', 'i', 'br'].includes(name)) result.push(wrap('paragraph', `<p>${render(node)}</p>`));
      else if (name === 'style') continue;
      else result.push(wrap('html', render(node)));
    }
    return result;
  }
  const blocks = convert(doc.children).join('\n\n');
  if (!blocks) throw new Error('No builder content to migrate');
  return blocks;
}

/** Add centrally maintained offers without rewriting review prose or other promotions. */
export function tierAOfferBlocks(html, offers, { heading = 'Current bookmaker offers' } = {}) {
  const blocks = builderToBlocks(html);
  if (!offers.length) throw new Error('Tier A requires at least one central offer');
  const safeHeading = heading.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
  return `${blocks}\n\n${wrap('heading', `<h2 class="wp-block-heading">${safeHeading}</h2>`)}\n\n${offers.map(offerSlotBlock).join('\n\n')}`;
}
