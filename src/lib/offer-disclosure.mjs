import { approvedOfferForSlot, officialTermsHref } from './offer-slots.mjs';

/**
 * Presentation-ready disclosure from one central ACF offer, never article copy.
 * A direct operator URL requires its own exact editorial approval in addition to
 * the offer ID approval. This check does not activate an affiliate CTA.
 */
export function offerDisclosureForSlot(slot, offers, {
  approvedIds = new Set(), approvedTermsUrls = new Set(), country = 'GB', now = new Date(),
} = {}) {
  const offer = approvedOfferForSlot(slot, offers, { approvedIds, country, now });
  if (!offer) return null;
  const details = offer.everyTipOfferDetails;
  const publishing = offer.everyTipOfferPublishing;
  const fullTerms = details.fullTerms?.trim() || null;
  const officialHref = officialTermsHref(publishing.etOfferFullTermsUrl);
  // Syntax alone cannot establish that a URL belongs to this bookmaker or its
  // offer. Require a separate, exact URL allowlist before linking to it.
  return {
    offerId: offer.databaseId,
    headline: details.publicHeadline.trim(),
    shortTerms: details.compactTerms.trim(),
    termsMode: fullTerms ? 'on-page' : officialHref && approvedTermsUrls.has(officialHref) ? 'official-link' : 'space-restricted',
    fullTerms,
    officialHref: officialHref && approvedTermsUrls.has(officialHref) ? officialHref : null,
  };
}
