import test from 'node:test';
import assert from 'node:assert/strict';
import { offerDisclosureForSlot } from '../src/lib/offer-disclosure.mjs';

const slot = { type: 'offer-slot', offerId: 42 };
const offer = {
  databaseId: 42,
  status: 'publish',
  everyTipOfferDetails: { publicHeadline: 'Approved title', compactTerms: '#Ad · Short conditions', fullTerms: 'Complete on-page terms.' },
  everyTipOfferPublishing: {
    etOfferUid: 'offer-42', etOfferStatus: 'active', etOfferLastChecked: '2026-10-02',
    etOfferCountriesInclude: 'GB', etOfferCountriesExclude: '', etOfferStartsAt: null, etOfferEndsAt: null,
  },
};
const approvedIds = new Set([42]);

test('approved central offer produces visible short and complete on-page terms', () => {
  assert.deepEqual(offerDisclosureForSlot(slot, [offer], { approvedIds }), {
    offerId: 42, headline: 'Approved title', shortTerms: '#Ad · Short conditions',
    termsMode: 'on-page', fullTerms: 'Complete on-page terms.', officialHref: null,
  });
});

test('unapproved, draft and ineligible placements fail closed', () => {
  assert.equal(offerDisclosureForSlot(slot, [offer]), null);
  assert.equal(offerDisclosureForSlot(slot, [{ ...offer, status: 'draft' }], { approvedIds }), null);
  assert.equal(offerDisclosureForSlot(slot, [offer], { approvedIds, country: 'US' }), null);
});

test('operator terms URL requires exact independent editorial approval', () => {
  const url = 'https://operator.example/offer/terms';
  const linked = { ...offer,
    everyTipOfferDetails: { ...offer.everyTipOfferDetails, fullTerms: '' },
    everyTipOfferPublishing: { ...offer.everyTipOfferPublishing, etOfferFullTermsUrl: url } };
  assert.equal(offerDisclosureForSlot(slot, [linked], { approvedIds })?.termsMode, 'space-restricted');
  assert.equal(offerDisclosureForSlot(slot, [linked], { approvedIds })?.officialHref, null);
  assert.equal(offerDisclosureForSlot(slot, [linked], { approvedIds, approvedTermsUrls: new Set(['https://other.example/terms']) })?.termsMode, 'space-restricted');
  const disclosure = offerDisclosureForSlot(slot, [linked], { approvedIds, approvedTermsUrls: new Set([url]) });
  assert.equal(disclosure.termsMode, 'official-link');
  assert.equal(disclosure.officialHref, url);
  assert.equal(disclosure.fullTerms, null);
  const affiliate = { ...linked, everyTipOfferPublishing: { ...linked.everyTipOfferPublishing, etOfferFullTermsUrl: 'https://operator.example/go/offer' } };
  assert.equal(offerDisclosureForSlot(slot, [affiliate], { approvedIds, approvedTermsUrls: new Set(['https://operator.example/go/offer']) })?.termsMode, 'space-restricted');
  assert.equal(offerDisclosureForSlot(slot, [affiliate], { approvedIds, approvedTermsUrls: new Set(['https://operator.example/go/offer']) })?.officialHref, null);
});
