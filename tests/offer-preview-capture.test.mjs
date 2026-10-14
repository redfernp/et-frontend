import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCapturedOfferPreview, readStagingOfferPreview } from '../src/lib/offer-preview-capture.mjs';

const ids = [90846, 90848, 90849, 90850, 90851, 90852, 90889];
const capture = { capturedAt: '2026-10-03T09:00:00.000Z', offers: ids.map((id) => ({
  id, status: 'draft', headline: `Preview title ${id}`, compactTerms: `Preview short copy ${id}`, editorialStatus: 'needs_review',
})) };

test('seven central draft records map to stable visual slots without enabling CTAs', () => {
  const result = parseCapturedOfferPreview(capture);
  assert.equal(Object.keys(result.offers).length, 7);
  assert.equal(result.offers.betfred.id, 90846);
  assert.equal(result.offers['10bet'].id, 90852);
  assert.equal(result.offers.betwright.id, 90889);
  assert.equal(result.offers.betwright.compactTerms, 'Preview short copy 90889');
});

test('offer preview capture rejects active or incomplete records', () => {
  assert.throws(() => parseCapturedOfferPreview({ ...capture, offers: capture.offers.slice(1) }), /Invalid/);
  assert.throws(() => parseCapturedOfferPreview({ ...capture, offers: capture.offers.map((offer) =>
    offer.id === 90889 ? { ...offer, status: 'publish' } : offer) }), /Unsafe/);
  assert.throws(() => parseCapturedOfferPreview({ ...capture, offers: capture.offers.map((offer) =>
    offer.id === 90889 ? { ...offer, compactTerms: '' } : offer) }), /Unsafe/);
  assert.throws(() => parseCapturedOfferPreview({ ...capture, offers: capture.offers.map((offer) =>
    offer.id === 90889 ? { ...offer, headline: '<script>alert(1)</script>' } : offer) }), /Unsafe/);
});

test('authenticated staging GraphQL maps the same seven draft offers without affiliate data', async () => {
  let calls = 0;
  const result = await readStagingOfferPreview({
    baseUrl: 'https://wordpress-159231-2098144.cloudwaysapps.com/', username: 'editor', password: 'test-password',
    fetchImpl: async (url, options) => {
      calls++;
      assert.equal(url.href, 'https://wordpress-159231-2098144.cloudwaysapps.com/graphql');
      assert.equal(options.method, 'POST');
      assert.match(options.headers.Authorization, /^Basic /);
      assert.match(JSON.parse(options.body).query, /stati: \[DRAFT\]/);
      return { ok: true, json: async () => ({ data: { everytipOffers: { nodes: capture.offers.map((offer) => ({
        databaseId: offer.id, status: 'draft',
        everyTipOfferDetails: { publicHeadline: offer.headline, compactTerms: offer.compactTerms },
        everyTipOfferPublishing: { etOfferStatus: 'needs_review' },
      })) } } }) };
    },
  });
  assert.equal(calls, 1);
  assert.equal(result.sourceMode, 'fresh-staging-wpgraphql-preview');
  assert.equal(result.offers.betfred.headline, 'Preview title 90846');
});

test('staging offer read rejects other hosts and incomplete or active GraphQL records', async () => {
  await assert.rejects(readStagingOfferPreview({
    baseUrl: 'https://www.everytip.co.uk/', username: 'editor', password: 'test-password',
    fetchImpl: async () => { throw new Error('Must not fetch live'); },
  }), /restricted/);
  await assert.rejects(readStagingOfferPreview({
    baseUrl: 'https://wordpress-159231-2098144.cloudwaysapps.com/', username: 'editor', password: 'test-password',
    fetchImpl: async () => ({ ok: true, json: async () => ({ data: { everytipOffers: { nodes: capture.offers.slice(1).map((offer) => ({
      databaseId: offer.id, status: 'draft',
      everyTipOfferDetails: { publicHeadline: offer.headline, compactTerms: offer.compactTerms },
      everyTipOfferPublishing: { etOfferStatus: 'needs_review' },
    })) } } }) }),
  }), /Invalid seven-offer/);
});
