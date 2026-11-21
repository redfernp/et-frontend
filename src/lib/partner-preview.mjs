// Partner previews. A new partner's offer goes into src/data/offers.json with "preview": "<slug>"
// before the partner has paid. Normal builds (the live site and the everytip-review test site)
// leave those offers out completely. A partner preview build sets PARTNER_PREVIEW=<slug> (see
// scripts/partner-preview.mjs), which shows that partner's offers everywhere they would appear live.
// Going live (scripts/partner-live.mjs) just removes the "preview" field.
const env = typeof process !== 'undefined' ? process.env : {};
export const previewPartners = new Set(String(env.PARTNER_PREVIEW ?? '').split(',')
  .map(slug => slug.trim().toLowerCase()).filter(Boolean));

export function isOfferVisible(offer) {
  return !offer.preview || previewPartners.has(String(offer.preview).toLowerCase());
}
