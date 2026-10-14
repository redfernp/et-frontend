import test from 'node:test';
import assert from 'node:assert/strict';
import { archivePageEntries, readStagingWeeklyColumnPosts, selectWeeklyColumnEntries,
  weeklyArchivePath, weeklyColumnArchivePreview, sourceLockedOctoberOverlayPosts,
  mergeSourceLockedOctoberEntries, WEEKLY_ARCHIVE_PAGE_SIZE } from '../src/lib/weekly-column-archive.mjs';
import { johnWeek7 } from '../src/lib/live-john-week7.mjs';
import { johnWeek6 } from '../src/lib/live-john-week6.mjs';
import { seymourOct10 } from '../src/lib/live-seymour-oct10.mjs';
import { seymourOct3 } from '../src/lib/live-seymour-oct3.mjs';

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

test('opt-in October overlay links only validated local exact article assets', async () => {
  await assert.rejects(sourceLockedOctoberOverlayPosts({ routeExists: () => false }), /Missing safe exact October columnist route/);
  const overlay = [johnWeek7, johnWeek6, seymourOct10, seymourOct3].map((source, index) => ({
    databaseId: source.id, uri: source.uri, slug: source.slug, status: 'publish',
    title: `Historical columnist article ${index + 1}`,
    date: ['2026-10-13', '2026-10-05', '2026-10-08', '2026-10-01'][index],
  }));
  assert.deepEqual(overlay.map((post) => post.databaseId), [91110, 90942, 90999, 90836]);
  const johnEntries = mergeSourceLockedOctoberEntries(selectWeeklyColumnEntries([john(1)],
    'english-premier-league-predictions-for-saturday'), 'english-premier-league-predictions-for-saturday', overlay);
  assert.equal(johnEntries[0].href, '/epl-game-week-7-2026-27-season-premier-league-tips-john-newsome.html');
  assert.equal(johnEntries[1].href, '/epl-game-week-6-2026-27-season-premier-league-tips-john-newsome.html');
  assert.match(johnEntries[0].excerpt, /Historical column/);
  const seymourEntries = mergeSourceLockedOctoberEntries(selectWeeklyColumnEntries([{
    databaseId: 2, uri: '/saturdays-horse-racing-preview-tips-2025-seymour-biz.html',
    slug: 'saturdays-horse-racing-preview-tips-2025-seymour-biz', status: 'publish',
    title: 'Earlier Saturday column', date: '2025-10-01',
  }], 'saturday-horse-racing-tips'), 'saturday-horse-racing-tips', overlay);
  assert.equal(seymourEntries[0].href, '/saturdays-horse-racing-preview-tips-10th-october-2026-seymour-biz.html');
  assert.equal(seymourEntries[1].href, '/saturdays-horse-racing-preview-tips-3rd-october-2026-seymour-biz.html');
  assert.equal(mergeSourceLockedOctoberEntries(johnEntries, 'english-premier-league-predictions-for-saturday', overlay).length, johnEntries.length);
  await assert.rejects(async () => mergeSourceLockedOctoberEntries(johnEntries, 'english-premier-league-predictions-for-saturday', [
    { ...overlay[0], uri: '/wrong-john-newsome.html' }, ...overlay.slice(1),
  ]), /source-locked/);
});

test('weekly archive overlay is opt-in and preserves no-current-advice labels', async () => {
  const slug = 'english-premier-league-predictions-for-saturday';
  const snapshot = { generatedAt: '2026-10-02T00:00:00Z', pages: [{ databaseId: 24016, uri: `/${slug}`, title: 'John archive' }], posts: [john(1)] };
  const previous = process.env.MIGRATION_LIVE_WEEKLY_ARCHIVE_OVERLAY;
  try {
    process.env.MIGRATION_LIVE_WEEKLY_ARCHIVE_OVERLAY = '1';
    const overlay = [johnWeek7, johnWeek6, seymourOct10, seymourOct3].map((source, index) => ({
      databaseId: source.id, uri: source.uri, slug: source.slug, status: 'publish',
      title: `Historical columnist article ${index + 1}`,
      date: ['2026-10-13', '2026-10-05', '2026-10-08', '2026-10-01'][index],
    }));
    const archive = await weeklyColumnArchivePreview(slug, { snapshotRead: async () => snapshot,
      overlayRead: async () => overlay });
    assert.equal(archive.entries[0].id, 91110);
    assert.match(archive.entries[0].excerpt, /Past selections and prices are not current advice/);
    assert.match(archive.sourceMode, /four-source-locked-october-articles/);
    assert.equal(archive.entries.length, 3);
  } finally {
    if (previous === undefined) delete process.env.MIGRATION_LIVE_WEEKLY_ARCHIVE_OVERLAY;
    else process.env.MIGRATION_LIVE_WEEKLY_ARCHIVE_OVERLAY = previous;
  }
});
