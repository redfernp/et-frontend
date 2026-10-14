// Parse only the marker emitted by the EveryTip ACF block. The marker contains
// no offer copy or outbound destination; those must come from the central record.
const markerPattern = /<div data-everytip-offer-slot="([1-9]\d*)" data-layout="(inline|compact)" data-heading="([^"]*)"><\/div>/g;

export function splitOfferSlots(content) {
  const pieces = [];
  let lastEnd = 0;
  for (const match of content.matchAll(markerPattern)) {
    pieces.push({ type: 'html', html: content.slice(lastEnd, match.index) });
    pieces.push({ type: 'offer-slot', offerId: Number(match[1]), layout: match[2], heading: match[3] });
    lastEnd = match.index + match[0].length;
  }
  pieces.push({ type: 'html', html: content.slice(lastEnd) });
  if (pieces.some((piece) => piece.type === 'html' && piece.html.includes('data-everytip-offer-slot'))) {
    throw new Error('Malformed EveryTip offer slot marker in WordPress content');
  }
  return pieces;
}

function countryCodes(value) {
  return new Set((value ?? '').split(',').map((code) => code.trim().toUpperCase()).filter(Boolean)
    .map(code => code === 'UK' ? 'GB' : code));
}

function unambiguousTime(value) {
  if (!value) return null;
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return NaN;
  return Date.parse(value);
}

export function officialTermsHref(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || !url.hostname.includes('.') ||
      /\/go\//i.test(url.pathname) || /(?:^|[?&])(?:aff|affiliate|btag|via)=/i.test(url.search)) return null;
    return url.toString();
  } catch { return null; }
}

// Approval is an explicit build input, separate from merely having ACF fields.
// A false result means the article simply omits the placement.
export function approvedOfferForSlot(slot, offers, { approvedIds = new Set(), country = 'GB', now = new Date() } = {}) {
  if (slot?.type !== 'offer-slot' || !approvedIds.has(slot.offerId)) return null;
  const offer = offers.find((item) => item.databaseId === slot.offerId);
  const publishing = offer?.everyTipOfferPublishing;
  const details = offer?.everyTipOfferDetails;
  if (!publishing || !details || offer.status !== 'publish' || publishing.etOfferStatus !== 'active') return null;
  if (!publishing.etOfferUid?.trim() || !publishing.etOfferLastChecked?.trim()) return null;
  if (!details.publicHeadline?.trim() || !details.compactTerms?.trim()) return null;
  const included = countryCodes(publishing.etOfferCountriesInclude);
  const excluded = countryCodes(publishing.etOfferCountriesExclude);
  if (!included.has(country) || excluded.has(country)) return null;
  const current = now.getTime();
  const startsAt = unambiguousTime(publishing.etOfferStartsAt);
  const endsAt = unambiguousTime(publishing.etOfferEndsAt);
  if (Number.isNaN(startsAt) || Number.isNaN(endsAt)) return null;
  if (startsAt !== null && startsAt > current) return null;
  if (endsAt !== null && endsAt <= current) return null;
  return offer;
}
