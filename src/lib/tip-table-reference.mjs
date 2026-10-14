import { parseDocument } from 'htmlparser2';

// Matches only the marker emitted by EveryTip Content Model's ACF tip-table
// block. Do not parse rendered Ninja rows as source data.
const markerPattern = /<div\s+data-everytip-tip-table-id="\d+"(?:\s+data-everytip-tip-table-filter="[^"]*")?\s*><\/div>/gi;
const markerHint = /data-everytip-tip-table-(?:id|filter)/i;

function parseMarker(marker, allowedTableIds) {
  const document = parseDocument(marker, { decodeEntities: true });
  const element = document.children.find((node) => node.type === 'tag');
  if (!element || element.name !== 'div' || document.children.length !== 1) {
    throw new Error('Invalid EveryTip tip-table marker');
  }
  const attrs = element.attribs;
  const keys = Object.keys(attrs);
  if (keys.some((key) => !['data-everytip-tip-table-id', 'data-everytip-tip-table-filter'].includes(key))) {
    throw new Error('Unexpected EveryTip tip-table marker attribute');
  }
  const rawId = attrs['data-everytip-tip-table-id'];
  if (!/^[1-9]\d*$/.test(rawId ?? '')) throw new Error('Invalid EveryTip tip-table ID');
  const tableId = Number(rawId);
  if (!Number.isSafeInteger(tableId) || !allowedTableIds.has(tableId)) {
    throw new Error(`Unapproved EveryTip tip-table ID: ${rawId}`);
  }
  const filter = attrs['data-everytip-tip-table-filter'] ?? null;
  if (filter !== null && (new TextEncoder().encode(filter).length > 480 || /[\x00-\x1f\x7f<>]/.test(filter))) {
    throw new Error('Invalid EveryTip tip-table filter');
  }
  return { type: 'tip-table-reference', tableId, filter };
}

/**
 * Split raw Gutenberg HTML into prose and typed table references. The prose
 * still requires the normal HTML sanitizer. A reference requires a separately
 * verified table feed; it never embeds or reconstructs historical Ninja rows.
 * Fails closed on malformed/unknown markers so a broken block cannot be
 * mistaken for ordinary editorial copy.
 *
 * @param {string} rawHtml
 * @param {{allowedTableIds: Iterable<number>}} options
 */
export function splitTipTableReferences(rawHtml, { allowedTableIds }) {
  if (typeof rawHtml !== 'string') throw new TypeError('Expected raw HTML string');
  const allowed = new Set(allowedTableIds);
  const parts = [];
  let cursor = 0;
  for (const match of rawHtml.matchAll(markerPattern)) {
    const prose = rawHtml.slice(cursor, match.index);
    if (markerHint.test(prose)) throw new Error('Malformed EveryTip tip-table marker');
    if (prose) parts.push({ type: 'html', html: prose });
    parts.push(parseMarker(match[0], allowed));
    cursor = match.index + match[0].length;
  }
  const tail = rawHtml.slice(cursor);
  if (markerHint.test(tail)) throw new Error('Malformed EveryTip tip-table marker');
  if (tail) parts.push({ type: 'html', html: tail });
  return parts;
}
