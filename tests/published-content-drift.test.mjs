import test from 'node:test';
import assert from 'node:assert/strict';
import { comparePublishedInventory } from '../src/lib/published-content-drift.mjs';

test('CMS inventory comparison separates new, missing, moved and modified records', () => {
  const old = { posts: [
    { databaseId: 1, uri: '/one.html', modified: '2026-01-01' },
    { databaseId: 2, uri: '/two.html', modified: '2026-01-01' },
  ], pages: [{ databaseId: 3, uri: '/old', modified: '2026-01-01' }] };
  const fresh = { posts: [
    { databaseId: 1, uri: '/one.html', modified: '2026-02-01' },
    { databaseId: 4, uri: '/four.html', modified: '2026-02-01' },
  ], pages: [{ databaseId: 3, uri: '/new', modified: '2026-01-01' }], nonRoutablePages: [{ databaseId: 15, uri: null }] };
  const drift = comparePublishedInventory(old, fresh);
  assert.deepEqual(drift.added, [{ id: 4, path: '/four.html' }]);
  assert.deepEqual(drift.missing, [{ id: 2, path: '/two.html' }]);
  assert.deepEqual(drift.changedPath, [{ id: 3, oldPath: '/old', path: '/new' }]);
  assert.deepEqual(drift.modified, [{ id: 1, path: '/one.html', oldModified: '2026-01-01', modified: '2026-02-01' }]);
});
