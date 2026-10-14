import test from 'node:test';
import assert from 'node:assert/strict';
import { priorityPagePreviewRecord, readStagingPriorityPage } from '../src/lib/staging-priority-page-cms.mjs';

const expected = { databaseId: 16, slug: 'home', uri: '/', content: '<p>Old copy</p>' };
const fresh = { databaseId: 16, slug: 'home', uri: '/', status: 'publish', title: 'EveryTip',
  content: '<p>Current copy</p>', date: '2026-10-01T10:00:00', modified: '2026-10-13T10:00:00',
  seo: { title: 'EveryTip', metaDesc: 'Tips', metaRobotsNoindex: 'index', metaRobotsNofollow: 'follow' } };

test('priority page remains a dated preview unless fresh reading is explicitly enabled', async () => {
  const previous = process.env.MIGRATION_STAGING_PRIORITY_READ;
  delete process.env.MIGRATION_STAGING_PRIORITY_READ;
  try {
    const result = await priorityPagePreviewRecord(expected, { freshRead: () => { throw new Error('unexpected read'); } });
    assert.equal(result.sourceMode, 'dated-snapshot-preview');
    assert.equal(result.content, '<p>Old copy</p>');
  } finally {
    if (previous === undefined) delete process.env.MIGRATION_STAGING_PRIORITY_READ;
    else process.env.MIGRATION_STAGING_PRIORITY_READ = previous;
  }
});

test('explicit fresh priority read is identity-bound and never falls back', async () => {
  const previous = process.env.MIGRATION_STAGING_PRIORITY_READ;
  process.env.MIGRATION_STAGING_PRIORITY_READ = '1';
  try {
    assert.equal((await priorityPagePreviewRecord(expected, { freshRead: async () => fresh })).content, '<p>Current copy</p>');
    await assert.rejects(() => priorityPagePreviewRecord(expected, { freshRead: async () => ({ ...fresh, uri: '/other' }) }), /identity/);
    await assert.rejects(() => priorityPagePreviewRecord(expected, { freshRead: async () => { throw new Error('offline'); } }), /offline/);
  } finally {
    if (previous === undefined) delete process.env.MIGRATION_STAGING_PRIORITY_READ;
    else process.env.MIGRATION_STAGING_PRIORITY_READ = previous;
  }
});

test('WPGraphQL read is staging-only and uses the page database ID', async () => {
  const result = await readStagingPriorityPage(expected, { fetchImpl: async (_url, options) => {
    assert.equal(JSON.parse(options.body).variables.id, '16');
    return { ok: true, json: async () => ({ data: { page: fresh } }) };
  } });
  assert.equal(result.sourceMode, 'fresh-staging-wpgraphql-preview');
  await assert.rejects(() => readStagingPriorityPage(expected, {
    endpoint: 'https://www.everytip.co.uk/graphql', fetchImpl: async () => { throw new Error('must not fetch'); },
  }), /restricted/);
});
