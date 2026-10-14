import test from 'node:test';
import assert from 'node:assert/strict';
import { archivePageEntries, readStagingWeeklyColumnPosts, selectWeeklyColumnEntries,
  weeklyArchivePath, weeklyColumnArchivePreview,
  WEEKLY_ARCHIVE_PAGE_SIZE } from '../src/lib/weekly-column-archive.mjs';

const john = (id, date = '2026-09-15') => ({ databaseId: id,
  uri: `/epl-game-week-${id}-john-newsome.html`, slug: `epl-game-week-${id}-john-newsome`,
  status: 'publish', title: `Week ${id} &amp; analysis`, date });

test('exact archive URLs, text decoding, order and pagination stay deterministic', () => {
  const entries = selectWeeklyColumnEntries([john(1, '2025-01-01'), john(2, '2026-01-01')], 'english-premier-league-predictions-for-saturday');
  assert.deepEqual(entries.map((entry) => entry.id), [2, 1]);
  assert.equal(entries[0].title, 'Week 2 & analysis');
  assert.equal(weeklyArchivePath('english-premier-league-predictions-for-saturday', 1), '/english-premier-league-predictions-for-saturday');
  assert.equal(weeklyArchivePath('english-premier-league-predictions-for-saturday', 2), '/english-premier-league-predictions-for-saturday/page/2');
  const archive = { entries: Array.from({ length: WEEKLY_ARCHIVE_PAGE_SIZE + 1 }, (_, index) => john(index + 1)) };
  assert.equal(archivePageEntries(archive, 2).entriesOnPage.length, 1);
  assert.throws(() => archivePageEntries(archive, 3), /out of range/);
});

test('invalid or duplicated weekly source records fail closed', () => {
  assert.throws(() => selectWeeklyColumnEntries([john(1), john(1)], 'english-premier-league-predictions-for-saturday'), /Invalid/);
  assert.throws(() => selectWeeklyColumnEntries([{ ...john(1), uri: '/wrong-john-newsome.html' }], 'english-premier-league-predictions-for-saturday'), /Invalid/);
  assert.throws(() => selectWeeklyColumnEntries([{ ...john(1), status: 'draft' }], 'english-premier-league-predictions-for-saturday'), /Invalid/);
});

test('dated snapshot is default; opt-in fresh data must preserve exact article registry', async () => {
  const slug = 'english-premier-league-predictions-for-saturday';
  const snapshot = { generatedAt: '2026-10-02T00:00:00Z', pages: [{ databaseId: 24016, uri: `/${slug}`, title: 'John archive' }], posts: [john(1)] };
  let freshCalled = false;
  const defaultResult = await weeklyColumnArchivePreview(slug, { snapshotRead: async () => snapshot, freshRead: async () => { freshCalled = true; return []; } });
  assert.equal(defaultResult.sourceMode, 'dated-snapshot-preview');
  assert.equal(freshCalled, false);
  const previous = process.env.MIGRATION_STAGING_WEEKLY_ARCHIVE_READ;
  try {
    process.env.MIGRATION_STAGING_WEEKLY_ARCHIVE_READ = '1';
    const freshResult = await weeklyColumnArchivePreview(slug, { snapshotRead: async () => snapshot, freshRead: async () => [{ ...john(1), title: 'Fresh title' }] });
    assert.equal(freshResult.entries[0].title, 'Fresh title');
    await assert.rejects(weeklyColumnArchivePreview(slug, { snapshotRead: async () => snapshot, freshRead: async () => [john(1), john(2)] }), /registry changed/);
  } finally {
    if (previous === undefined) delete process.env.MIGRATION_STAGING_WEEKLY_ARCHIVE_READ;
    else process.env.MIGRATION_STAGING_WEEKLY_ARCHIVE_READ = previous;
  }
});

test('staging reader rejects wrong endpoint and incomplete cursor', async () => {
  await assert.rejects(readStagingWeeklyColumnPosts({ endpoint: 'https://www.everytip.co.uk/graphql' }), /restricted/);
  await assert.rejects(readStagingWeeklyColumnPosts({ fetchImpl: async () => ({ ok: true, json: async () => ({ data: { posts: {
    nodes: [john(1)], pageInfo: { hasNextPage: true, endCursor: '' },
  } } }) }) }), /Incomplete/);
});

