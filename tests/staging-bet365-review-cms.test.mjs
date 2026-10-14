import test from 'node:test';
import assert from 'node:assert/strict';
import { latestContentSnapshot } from '../src/lib/migration-preview.mjs';
import { bet365ReviewPreviewRecord, readStagingBet365Review, validateStagingBet365Review } from '../src/lib/staging-bet365-review-cms.mjs';

const source = (await latestContentSnapshot()).pages.find((record) => record.uri === '/bet365-review');

test('Bet365 exact review uses dated snapshot unless the staging read is explicitly enabled', async () => {
  const previous = process.env.MIGRATION_STAGING_BET365_REVIEW_READ;
  delete process.env.MIGRATION_STAGING_BET365_REVIEW_READ;
  try {
    const result = await bet365ReviewPreviewRecord(source, { freshRead: () => { throw new Error('unexpected read'); } });
    assert.equal(result.sourceMode, 'dated-snapshot-preview');
    assert.equal(result.content, source.content);
  } finally {
    if (previous === undefined) delete process.env.MIGRATION_STAGING_BET365_REVIEW_READ;
    else process.env.MIGRATION_STAGING_BET365_REVIEW_READ = previous;
  }
});

test('opted-in Bet365 fresh read rejects the PPC page, changed body and a failed read', async () => {
  const previous = process.env.MIGRATION_STAGING_BET365_REVIEW_READ;
  process.env.MIGRATION_STAGING_BET365_REVIEW_READ = '1';
  const fresh = { ...source, status: 'publish' };
  try {
    const result = await bet365ReviewPreviewRecord(source, { freshRead: async () => fresh });
    assert.equal(result.sourceMode, 'fresh-staging-wpgraphql-preview');
    await assert.rejects(() => bet365ReviewPreviewRecord(source, { freshRead: async () => ({ ...fresh, uri: '/bet365-review-ppc' }) }), /identity/);
    await assert.rejects(() => bet365ReviewPreviewRecord(source, { freshRead: async () => ({ ...fresh, content: '' }) }), /body/);
    await assert.rejects(() => bet365ReviewPreviewRecord(source, { freshRead: async () => { throw new Error('staging offline'); } }), /staging offline/);
  } finally {
    if (previous === undefined) delete process.env.MIGRATION_STAGING_BET365_REVIEW_READ;
    else process.env.MIGRATION_STAGING_BET365_REVIEW_READ = previous;
  }
});

test('Bet365 WPGraphQL read is pinned to staging and the exact page ID', async () => {
  const fresh = { ...source, status: 'publish' };
  const result = await readStagingBet365Review({ fetchImpl: async (_url, options) => {
    assert.equal(JSON.parse(options.body).variables.id, '87553');
    return { ok: true, json: async () => ({ data: { page: fresh } }) };
  } });
  assert.equal(result.databaseId, 87553);
  await assert.rejects(() => readStagingBet365Review({
    endpoint: 'https://www.everytip.co.uk/graphql', fetchImpl: async () => { throw new Error('must not fetch'); },
  }), /restricted/);
  assert.throws(() => validateStagingBet365Review({ data: { page: { ...fresh, status: 'draft' } } }), /state/);
});
