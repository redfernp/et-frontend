import test from 'node:test';
import assert from 'node:assert/strict';
import {
  homepageFeaturePreview, readStagingHomepageFeatures, selectHomepageFeatureCards,
} from '../src/lib/home-feature-feed.mjs';

const nodes = [
  { databaseId: 4, uri: '/saturdays-horse-racing-preview-tips-26th-september-2026-seymour-biz.html', slug: 'saturdays-horse-racing-preview-tips-26th-september-2026-seymour-biz', status: 'publish', title: 'Racing &amp; selections', date: '2026-09-24T12:00:00', modified: '2026-09-24T12:00:00' },
  { databaseId: 3, uri: '/epl-game-week-5-2026-27-season-premier-league-tips-john-newsome.html', slug: 'epl-game-week-5-2026-27-season-premier-league-tips-john-newsome', status: 'publish', title: 'John’s football preview', date: '2026-09-15T12:00:00', modified: '2026-09-15T12:00:00' },
  { databaseId: 2, uri: '/saturdays-horse-racing-preview-tips-12th-september-2026-seymour-biz.html', slug: 'saturdays-horse-racing-preview-tips-12th-september-2026-seymour-biz', status: 'publish', title: 'More racing', date: '2026-09-10T12:00:00', modified: '2026-09-10T12:00:00' },
  { databaseId: 1, uri: '/epl-game-week-4-2026-27-season-premier-league-tips-john-newsome.html', slug: 'epl-game-week-4-2026-27-season-premier-league-tips-john-newsome', status: 'publish', title: 'More football', date: '2026-09-07T12:00:00', modified: '2026-09-07T12:00:00' },
];

test('homepage cards use validated dated columnist records and never carry affiliate links', () => {
  const cards = selectHomepageFeatureCards(nodes);
  assert.equal(cards.length, 4);
  assert.equal(cards[0].title, 'Racing & selections');
  assert.deepEqual(cards.map((card) => card.type), ['Horse racing', 'Football', 'Horse racing', 'Football']);
  assert.ok(cards.every((card) => !('href' in card) && !('cta' in card)));
  assert.throws(() => selectHomepageFeatureCards([{ ...nodes[0], status: 'draft' }, ...nodes.slice(1)]), /Invalid or unsorted/);
  assert.throws(() => selectHomepageFeatureCards([nodes[1], nodes[0], ...nodes.slice(2)]), /Invalid or unsorted/);
  assert.throws(() => selectHomepageFeatureCards([nodes[0], { ...nodes[1], uri: '/pilot/fake.html' }, ...nodes.slice(2)]), /Invalid or unsorted/);
  assert.throws(() => selectHomepageFeatureCards(nodes.slice(0, 3)), /only 3/);
});

test('fresh homepage query is read-only, pinned to staging, and fail-closed', async () => {
  const calls = [];
  const result = await readStagingHomepageFeatures({ fetchImpl: async (url, options) => {
    calls.push({ url: String(url), options });
    return { ok: true, json: async () => ({ data: { posts: { nodes, pageInfo: { hasNextPage: false } } } }) };
  } });
  assert.equal(result.cards.length, 4);
  assert.equal(result.sourceMode, 'fresh-staging-wpgraphql-preview');
  assert.equal(calls[0].url, 'https://wordpress-159231-2098144.cloudwaysapps.com/graphql');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers.Authorization, undefined);
  await assert.rejects(readStagingHomepageFeatures({ endpoint: 'https://www.everytip.co.uk/graphql',
    fetchImpl: () => { throw new Error('Must not query live'); } }), /restricted/);
  await assert.rejects(readStagingHomepageFeatures({ fetchImpl: async () => ({ ok: true,
    json: async () => ({ errors: [{ message: 'GraphQL unavailable' }] }) }) }), /GraphQL unavailable/);
});

test('opt-in failures never silently fall back to the snapshot', async () => {
  const prior = process.env.MIGRATION_STAGING_HOME_FEATURE_READ;
  try {
    delete process.env.MIGRATION_STAGING_HOME_FEATURE_READ;
    const dated = await homepageFeaturePreview({ snapshotRead: async () => ({ generatedAt: '2026-10-02T00:00:00Z',
      posts: nodes.map(({ status, ...post }) => post) }),
      freshRead: async () => { throw new Error('Fresh reader must not run'); } });
    assert.equal(dated.sourceMode, 'dated-snapshot-preview');
    assert.equal(dated.freshness.latestDate, '2026-09-24');
    process.env.MIGRATION_STAGING_HOME_FEATURE_READ = '1';
    await assert.rejects(homepageFeaturePreview({ snapshotRead: async () => { throw new Error('No stale fallback'); },
      freshRead: async () => { throw new Error('Fresh CMS unavailable'); } }), /Fresh CMS unavailable/);
  } finally {
    if (prior === undefined) delete process.env.MIGRATION_STAGING_HOME_FEATURE_READ;
    else process.env.MIGRATION_STAGING_HOME_FEATURE_READ = prior;
  }
});
