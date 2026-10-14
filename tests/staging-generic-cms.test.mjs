import test from 'node:test';
import assert from 'node:assert/strict';
import { freshGenericRecordMap } from '../src/lib/staging-generic-cms.mjs';

const old = { databaseId: 7, uri: '/article.html', slug: 'article', modified: '2026-10-01', content: '<p>Old copy</p>' };
const fresh = { ...old, status: 'publish', modified: '2026-10-03', content: '<p>New copy</p>', sourceMode: 'fresh-staging-wpgraphql-preview', fetchedAt: '2026-10-03T20:00:00Z' };
const snapshot = { posts: [old], pages: [] };
const plan = { included: [{ record: old, kind: 'post' }] };
const inventory = { posts: [{ ...old, modified: fresh.modified }], pages: [] };

async function optedIn(run) {
  const previous = process.env.MIGRATION_STAGING_GENERIC_READ;
  process.env.MIGRATION_STAGING_GENERIC_READ = '1';
  try { return await run(); }
  finally {
    if (previous === undefined) delete process.env.MIGRATION_STAGING_GENERIC_READ;
    else process.env.MIGRATION_STAGING_GENERIC_READ = previous;
  }
}

test('generic exact routes read only changed source-backed articles when opted in', async () => optedIn(async () => {
  const requested = [];
  const result = await freshGenericRecordMap(snapshot, plan, {
    inventoryRead: async () => inventory,
    articleRead: async (expected) => { requested.push(expected); return fresh; },
  });
  assert.deepEqual(requested, [{ databaseId: 7, uri: '/article.html', slug: 'article' }]);
  assert.equal(result.records.get(7), fresh);
  assert.equal(result.modifiedCount, 1);
}));

test('generic CMS refresh never silently falls back on route or content drift', async () => optedIn(async () => {
  await assert.rejects(freshGenericRecordMap(snapshot, plan, {
    inventoryRead: async () => ({ posts: [{ ...old, uri: '/moved.html' }], pages: [] }),
  }), /route registry changed/);
  await assert.rejects(freshGenericRecordMap(snapshot, plan, {
    inventoryRead: async () => inventory,
    articleRead: async () => ({ ...fresh, content: '<iframe src="https://example.test"></iframe>' }),
  }), /editorial conversion/);
  await assert.rejects(freshGenericRecordMap(snapshot, plan, {
    inventoryRead: async () => inventory,
    articleRead: async () => ({ ...fresh, modified: '2026-10-04' }),
  }), /changed during/);
}));

test('new published Gutenberg article gets a noindex route only when its exact identity and body are safe', async () => optedIn(async () => {
  const newPost = { ...fresh, databaseId: 8, uri: '/new-article.html', slug: 'new-article' };
  const current = { posts: [{ ...old, modified: old.modified }, newPost], pages: [] };
  const result = await freshGenericRecordMap(snapshot, plan, {
    inventoryRead: async () => current,
    articleRead: async () => newPost,
  });
  assert.deepEqual(result.newEntries.map(({ row }) => row.path), ['/new-article.html']);
  assert.equal(result.newEntries[0].row.indexability, 'Non-Indexable');
  assert.equal(result.records.get(8), newPost);
  await assert.rejects(freshGenericRecordMap(snapshot, plan, {
    inventoryRead: async () => current,
    articleRead: async () => ({ ...newPost, slug: 'wrong' }),
  }), /identity changed/);
  await assert.rejects(freshGenericRecordMap(snapshot, { ...plan, excluded: [{ path: '/new-article.html' }] }, {
    inventoryRead: async () => current,
    articleRead: async () => newPost,
  }), /conflicts/);
}));

test('one reserved live article stays out of generic discovery without hiding an identity change', async () => optedIn(async () => {
  const newPost = { ...fresh, databaseId: 91110, uri: '/epl-game-week-7-2026-27-season-premier-league-tips-john-newsome.html',
    slug: 'epl-game-week-7-2026-27-season-premier-league-tips-john-newsome' };
  const current = { posts: [{ ...old, modified: old.modified }, newPost], pages: [] };
  const reservedNewEntries = new Map([[newPost.uri, { databaseId: 91110, slug: newPost.slug }]]);
  const result = await freshGenericRecordMap(snapshot, plan, {
    inventoryRead: async () => current,
    articleRead: async () => { throw new Error('Reserved route must not be fetched generically'); },
    reservedNewEntries,
  });
  assert.equal(result.newEntries.length, 0);
  await assert.rejects(freshGenericRecordMap(snapshot, plan, {
    inventoryRead: async () => ({ posts: [{ ...old, modified: old.modified }, { ...newPost, databaseId: 91111 }], pages: [] }),
    reservedNewEntries,
  }), /Reserved exact article identity changed/);
}));

test('dated mode does not contact staging', async () => {
  const previous = process.env.MIGRATION_STAGING_GENERIC_READ;
  delete process.env.MIGRATION_STAGING_GENERIC_READ;
  try {
    const result = await freshGenericRecordMap(snapshot, plan, {
      inventoryRead: async () => { throw new Error('must not fetch'); },
    });
    assert.equal(result.records.size, 0);
  } finally {
    if (previous !== undefined) process.env.MIGRATION_STAGING_GENERIC_READ = previous;
  }
});
