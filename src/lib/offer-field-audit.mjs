import { officialTermsHref } from './offer-slots.mjs';

// These are the fields exposed by the authenticated, read-only editorial REST
// route. The matching GraphQL names are included to keep the display contract
// auditable without copying any offer text into a template.
export const OFFER_DISPLAY_FIELDS = Object.freeze([
  { rest: 'et_offer_uid', graphql: 'etOfferUid', required: true },
  { rest: 'et_offer_status', graphql: 'etOfferStatus', required: true },
  { rest: 'public_headline', graphql: 'publicHeadline', required: true },
  { rest: 'compact_terms', graphql: 'compactTerms', required: true },
  { rest: 'full_terms', graphql: 'fullTerms', required: false },
  { rest: 'et_offer_full_terms_url', graphql: 'etOfferFullTermsUrl', required: false },
  { rest: 'et_offer_eligibility', graphql: 'etOfferEligibility', required: true },
  { rest: 'et_offer_countries_include', graphql: 'etOfferCountriesInclude', required: true },
  { rest: 'et_offer_countries_exclude', graphql: 'etOfferCountriesExclude', required: false },
  { rest: 'et_offer_starts_at', graphql: 'etOfferStartsAt', required: false },
  { rest: 'et_offer_ends_at', graphql: 'etOfferEndsAt', required: false },
  { rest: 'et_offer_last_checked', graphql: 'etOfferLastChecked', required: true },
  { rest: 'et_offer_cta_label', graphql: 'etOfferCtaLabel', required: false },
  { rest: 'et_offer_highlight', graphql: 'etOfferHighlight', required: false },
]);

function populated(value) {
  return typeof value === 'string' ? value.trim().length > 0 : value !== null && value !== undefined && value !== false;
}

function checkedDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const timestamp = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value ? timestamp : null;
}

export function auditOfferFields(offer, { now = new Date(), reviewAfterDays = 30 } = {}) {
  if (!Number.isInteger(offer?.id) || !offer.fields || Number.isNaN(now.getTime()) ||
      !Number.isInteger(reviewAfterDays) || reviewAfterDays < 1) throw new Error('Invalid offer audit input');
  const fields = Object.fromEntries(OFFER_DISPLAY_FIELDS.map(({ rest, graphql, required }) => [rest, {
    present: populated(offer.fields[rest]), graphql, required,
  }]));
  const fullTermsPresent = fields.full_terms.present;
  const officialTermsUrlPresent = fields.et_offer_full_terms_url.present;
  const officialTermsUrlFormatValid = officialTermsUrlPresent && Boolean(officialTermsHref(offer.fields.et_offer_full_terms_url));
  const missingRequired = OFFER_DISPLAY_FIELDS.filter(({ rest, required }) => required && !fields[rest].present)
    .map(({ rest }) => rest);
  const lastChecked = checkedDate(offer.fields.et_offer_last_checked);
  const ageDays = lastChecked === null ? null : Math.floor((now.getTime() - lastChecked) / 86400000);
  const freshness = lastChecked === null ? 'missing-or-invalid-date' : ageDays < 0 ? 'future-date' :
    ageDays > reviewAfterDays ? 'review-due' : 'within-review-window';
  return {
    id: offer.id, title: offer.title ?? '', wpStatus: offer.status ?? '', modifiedGmt: offer.modified_gmt ?? null,
    editorialStatus: offer.fields.et_offer_status || null, fields, missingRequired,
    termsSource: fullTermsPresent ? 'central-full-terms' : officialTermsUrlFormatValid ? 'central-official-url' :
      fields.compact_terms.present ? 'central-space-restricted' : 'missing',
    officialTermsUrlFormatValid, lastChecked: lastChecked === null ? null : offer.fields.et_offer_last_checked,
    ageDays, freshness, reviewAfterDays,
    // This report is an inventory, never an approval or CTA activation decision.
    approvalAssessed: false,
  };
}

export function auditSevenOffers(offers, options) {
  if (!Array.isArray(offers) || offers.length !== 7 || new Set(offers.map((offer) => offer.id)).size !== 7) {
    throw new Error('Expected seven distinct central offer records');
  }
  const records = offers.map((offer) => auditOfferFields(offer, options));
  return {
    auditedAt: (options?.now ?? new Date()).toISOString(), source: 'authenticated staging editorial REST, read-only',
    reviewCadenceIsNotApproval: true, records,
    summary: { total: records.length, missingRequired: records.filter((record) => record.missingRequired.length).length,
      reviewDue: records.filter((record) => record.freshness === 'review-due').length,
      wpDrafts: records.filter((record) => record.wpStatus === 'draft').length },
  };
}
