import test from 'node:test';
import assert from 'node:assert/strict';
import { approvedOfferForSlot, officialTermsHref, splitOfferSlots } from '../src/lib/offer-slots.mjs';

const slot = { type: 'offer-slot', offerId: 42, layout: 'inline', heading: '' };
const offer = {
  databaseId: 42,
  status: 'publish',
  everyTipOfferDetails: { publicHeadline: 'Approved title', compactTerms: 'Approved compact terms', fullTerms: 'Approved full terms' },
  everyTipOfferPublishing: { etOfferUid: 'offer-42', etOfferStatus: 'active', etOfferLastChecked: '2026-10-02', etOfferCountriesInclude: 'GB,IE', etOfferCountriesExclude: '', etOfferStartsAt: null, etOfferEndsAt: null },
};

test('splits an exact ACF offer marker without copying terms into the article body', () => {
  assert.deepEqual(splitOfferSlots('<p>Before</p><div data-everytip-offer-slot="42" data-layout="inline" data-heading="Offer"></div><p>After</p>'), [
    { type: 'html', html: '<p>Before</p>' },
    { type: 'offer-slot', offerId: 42, layout: 'inline', heading: 'Offer' },
    { type: 'html', html: '<p>After</p>' },
  ]);
  assert.throws(() => splitOfferSlots('<div data-everytip-offer-slot="oops"></div>'), /Malformed/);
});

test('offer placement fails closed without explicit approval and complete eligible copy', () => {
  assert.equal(approvedOfferForSlot(slot, [offer]), null);
  const approvedIds = new Set([42]);
  assert.equal(approvedOfferForSlot(slot, [offer], { approvedIds }), offer);
  assert.equal(approvedOfferForSlot(slot, [offer], { approvedIds, country: 'US' }), null);
  assert.equal(approvedOfferForSlot(slot, [{ ...offer, status: 'draft' }], { approvedIds }), null);
  assert.equal(approvedOfferForSlot(slot, [{ ...offer, everyTipOfferPublishing: { ...offer.everyTipOfferPublishing, etOfferStatus: 'paused' } }], { approvedIds }), null);
  assert.equal(approvedOfferForSlot(slot, [{ ...offer, everyTipOfferDetails: { ...offer.everyTipOfferDetails, compactTerms: '' } }], { approvedIds }), null);
  assert.equal(approvedOfferForSlot(slot, [{ ...offer, everyTipOfferPublishing: { ...offer.everyTipOfferPublishing, etOfferEndsAt: '2026-10-03 12:00:00' } }], { approvedIds }), null);
  const linkedTerms = { ...offer,
    everyTipOfferDetails: { ...offer.everyTipOfferDetails, fullTerms: '' },
    everyTipOfferPublishing: { ...offer.everyTipOfferPublishing, etOfferFullTermsUrl: 'https://example.com/official-offer-terms' } };
  assert.equal(approvedOfferForSlot(slot, [linkedTerms], { approvedIds }), linkedTerms);
  assert.equal(approvedOfferForSlot(slot, [{ ...linkedTerms,
    everyTipOfferPublishing: { ...linkedTerms.everyTipOfferPublishing, etOfferFullTermsUrl: 'https://example.com/go/affiliate' } }], { approvedIds })?.databaseId, 42);
});

test('official terms link requires a direct HTTPS URL rather than an affiliate redirect', () => {
  assert.equal(officialTermsHref('https://example.com/official-offer-terms'), 'https://example.com/official-offer-terms');
  assert.equal(officialTermsHref('http://example.com/terms'), null);
  assert.equal(officialTermsHref('https://example.com/go/bookmaker'), null);
  assert.equal(officialTermsHref('https://example.com/terms?via=everytip'), null);
});
