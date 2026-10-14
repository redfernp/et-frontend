import test from 'node:test';
import assert from 'node:assert/strict';
import {
  readStagingRoundupDraft, roundupDraftPreview, stagingRoundupDrafts, validateRoundupDraft,
} from '../src/lib/staging-roundup-cms.mjs';

const spec = stagingRoundupDrafts.lowDeposit;
const payload = () => ({ data: { post: {
  databaseId: spec.postId, slug: spec.slug, status: 'draft', content: '<p>Editorial copy</p>',
  everyTipRoundupGuide: { rankedEntries: [{
    bestFor: 'Low deposit', editorialVerdict: 'Editorial verdict only',
    offer: { nodes: [{ databaseId: 90846 }] },
  }] },
} } });

test('strict GraphQL contract keeps draft and ACF identity separate from offer approval', () => {
  const result = validateRoundupDraft(payload(), spec);
  assert.equal(result.postId, 90880);
  assert.equal(result.sourceMode, 'fresh-staging-wpgraphql-preview');
  assert.equal(result.rankedEntries[0].offer.nodes[0].databaseId, 90846);
  assert.throws(() => validateRoundupDraft({ ...payload(), errors: [{ message: 'Denied' }] }, spec), /Denied/);
  const wrongStatus = payload(); wrongStatus.data.post.status = 'publish';
  assert.throws(() => validateRoundupDraft(wrongStatus, spec), /identity/);
  const wrongOffer = payload(); wrongOffer.data.post.everyTipRoundupGuide.rankedEntries[0].offer.nodes[0].databaseId = 999;
  assert.throws(() => validateRoundupDraft(wrongOffer, spec), /ACF ranked/);
  const noVerdict = payload(); noVerdict.data.post.everyTipRoundupGuide.rankedEntries[0].editorialVerdict = '';
  assert.throws(() => validateRoundupDraft(noVerdict, spec), /ACF ranked/);
});

test('fresh CMS read is authenticated, read-only and staging-host restricted', async () => {
  const calls = [];
  const read = await readStagingRoundupDraft(spec, {
    baseUrl: 'https://wordpress-159231-2098144.cloudwaysapps.com/', username: 'editor', password: 'test-password',
    fetchImpl: async (url, options) => {
      calls.push({ url: String(url), options });
      return { ok: true, json: async () => payload() };
    },
  });
  assert.equal(read.postId, 90880);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://wordpress-159231-2098144.cloudwaysapps.com/graphql');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(JSON.parse(calls[0].options.body).variables.id, '90880');
  assert.match(calls[0].options.headers.Authorization, /^Basic /);
  await assert.rejects(readStagingRoundupDraft(spec, {
    baseUrl: 'https://www.everytip.co.uk/', username: 'editor', password: 'secret',
    fetchImpl: () => { throw new Error('Should not call live site'); },
  }), /restricted/);
});

test('dated fixture remains an explicitly labelled preview and an opted-in read does not silently fall back', async () => {
  const prior = process.env.MIGRATION_STAGING_ROUNDUP_READ;
  try {
    delete process.env.MIGRATION_STAGING_ROUNDUP_READ;
    const captured = await roundupDraftPreview('lowDeposit', async () => ({ postId: 90880, status: 'draft', capturedAt: '2026-10-02T00:00:00Z' }));
    assert.equal(captured.sourceMode, 'dated-capture-preview');
    process.env.MIGRATION_STAGING_ROUNDUP_READ = '1';
    await assert.rejects(roundupDraftPreview('lowDeposit', async () => { throw new Error('Fixture must not run'); }), /Missing staging WordPress read credentials/);
  } finally {
    if (prior === undefined) delete process.env.MIGRATION_STAGING_ROUNDUP_READ;
    else process.env.MIGRATION_STAGING_ROUNDUP_READ = prior;
  }
});
