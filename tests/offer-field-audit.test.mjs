import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { auditOfferFields, auditSevenOffers, OFFER_DISPLAY_FIELDS } from '../src/lib/offer-field-audit.mjs';

const complete = (id = 1) => ({ id, title: `Offer ${id}`, status: 'draft', fields: {
  et_offer_uid: `offer-${id}`, et_offer_status: 'draft', public_headline: 'Central title',
  compact_terms: '#Ad short terms', et_offer_eligibility: 'New customers only',
  et_offer_countries_include: 'GB', et_offer_last_checked: '2026-10-01',
  et_offer_full_terms_url: 'https://operator.example/terms',
} });

test('reports exact field presence without leaking offer copy or claiming approval', () => {
  const result = auditOfferFields(complete(), { now: new Date('2026-10-03T12:00:00Z') });
  assert.deepEqual(result.missingRequired, []);
  assert.equal(result.fields.compact_terms.graphql, 'compactTerms');
  assert.equal(result.fields.full_terms.present, false);
  assert.equal(result.termsSource, 'central-official-url');
  assert.equal(result.freshness, 'within-review-window');
  assert.equal(result.approvalAssessed, false);
  assert.doesNotMatch(JSON.stringify(result), /Central title|#Ad short terms|operator\.example/);
  assert.equal(OFFER_DISPLAY_FIELDS.length, 14);
});

test('invalid terms URL and blank central terms are reported as missing', () => {
  const offer = complete();
  offer.fields.et_offer_full_terms_url = 'https://operator.example/go/affiliate?via=everytip';
  offer.fields.compact_terms = '  ';
  const result = auditOfferFields(offer, { now: new Date('2026-10-03T12:00:00Z') });
  assert.deepEqual(result.missingRequired, ['compact_terms']);
  assert.equal(result.officialTermsUrlFormatValid, false);
  assert.equal(result.termsSource, 'missing');
});

test('central space-restricted terms do not require a separate full-terms field', () => {
  const offer = complete();
  delete offer.fields.et_offer_full_terms_url;
  const result = auditOfferFields(offer, { now: new Date('2026-10-03T12:00:00Z') });
  assert.deepEqual(result.missingRequired, []);
  assert.equal(result.termsSource, 'central-space-restricted');
  assert.equal(result.approvalAssessed, false);
});

test('date review indicator flags stale, invalid, and future dates without approval', () => {
  const offer = complete();
  offer.fields.et_offer_last_checked = '2026-08-01';
  assert.equal(auditOfferFields(offer, { now: new Date('2026-10-03T00:00:00Z') }).freshness, 'review-due');
  offer.fields.et_offer_last_checked = '2026-02-30';
  assert.equal(auditOfferFields(offer, { now: new Date('2026-10-03T00:00:00Z') }).freshness, 'missing-or-invalid-date');
  offer.fields.et_offer_last_checked = '2026-10-10';
  assert.equal(auditOfferFields(offer, { now: new Date('2026-10-03T00:00:00Z') }).freshness, 'future-date');
});

test('seven-offer audit requires seven distinct records and keeps draft status visible', () => {
  const offers = Array.from({ length: 7 }, (_, index) => complete(index + 1));
  const result = auditSevenOffers(offers, { now: new Date('2026-10-03T00:00:00Z') });
  assert.equal(result.summary.wpDrafts, 7);
  assert.equal(result.summary.total, 7);
  assert.equal(result.reviewCadenceIsNotApproval, true);
  assert.throws(() => auditSevenOffers(offers.slice(1)), /seven distinct/);
});

test('every audited field is exposed by both central REST and GraphQL contracts', async () => {
  const php = await readFile(new URL('../wordpress-plugins/everytip-content-model/everytip-content-model.php', import.meta.url), 'utf8');
  const graphql = await readFile(new URL('../src/lib/wpgraphql.ts', import.meta.url), 'utf8');
  const query = graphql.match(/export const OFFER_QUERY = `([^`]+)`;/)?.[1];
  assert.ok(query, 'Offer query exists');
  const restList = php.match(/foreach \( array\( ([^\n]+) \) as \$name \)/)?.[1];
  assert.ok(restList, 'Editorial REST field allowlist exists');
  for (const { rest, graphql: graphName } of OFFER_DISPLAY_FIELDS) {
    assert.match(restList, new RegExp(`'${rest}'`), `${rest} in editorial REST`);
    assert.match(query, new RegExp(`\\b${graphName}\\b`), `${graphName} in GraphQL query`);
  }
});
