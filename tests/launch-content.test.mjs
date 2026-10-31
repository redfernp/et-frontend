import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
// Keep test cache writes out of the real outputs/content-cache.
process.env.EVERYTIP_CONTENT_CACHE = mkdtempSync(join(tmpdir(), 'et-content-'));
const { readContent } = await import('../src/lib/launch-content.mjs');

test('fresh source paginates all records and preserves rendered tables and Yoast', async () => {
  const post = { databaseId: 1, status: 'publish', uri: '/classic.html', content: '<table><tr><td>Current row</td></tr></table>', seo: { metaRobotsNoindex: 'noindex' } };
  let calls = 0;
  const records = await readContent({ query: async (document, { after }) => {
    calls++;
    if (document.includes('posts(')) return { posts: {
      nodes: [{ ...post, databaseId: after ? 2 : 1, uri: after ? '/second.html' : post.uri }],
      pageInfo: { hasNextPage: !after, endCursor: 'next' },
    } };
    return { pages: { nodes: [{ databaseId: 3, uri: '/', status: 'publish' }], pageInfo: { hasNextPage: false } } };
  } });
  assert.equal(calls, 3);
  assert.equal(records.length, 3);
  assert.equal(records[0].content, post.content);
  assert.equal(records[0].seo.metaRobotsNoindex, 'noindex');
});

test('incomplete or duplicate source fails instead of producing a partial site', async () => {
  await assert.rejects(readContent({ query: async () => ({ posts: { nodes: [] } }) }), /Incomplete/);
  await assert.rejects(readContent({ query: async () => ({ posts: {
    nodes: [{ uri: '/same', status: 'publish' }, { uri: '/same', status: 'publish' }],
    pageInfo: { hasNextPage: false },
  } }) }), /duplicate/);
  await assert.rejects(readContent({ query: async () => { throw new Error('CMS unavailable'); } }), /CMS unavailable/);
});

test('requestGraphql passes per-request cache options through', async () => {
  const source = (await import('node:fs')).readFileSync(new URL('../src/lib/launch-content.mjs', import.meta.url), 'utf8');
  assert.match(source, /requestGraphql = \(query, variables = \{\}, options = \{\}\) => client\.request\(query, variables, options\)/);
});

test('incremental source re-fetches only changed, new and tip-table records', async () => {
  const { readContentIncremental, writeContentCache } = await import('../src/lib/launch-content.mjs');
  const record = (id, modified, content = '<p>Body</p>') => ({ databaseId: id, uri: `/r${id}`, title: `R${id}`, content, date: '2026-10-01T00:00:00', modified, status: 'publish', author: null, seo: { schema: { raw: '' } } });
  // Cached: 11 unchanged, 12 changed since, 13 has a tip table. 14 is new.
  await writeContentCache([{ ...record(11, 'a'), kind: 'posts' }, { ...record(12, 'a'), kind: 'posts' }, { ...record(13, 'a', '<table class="footable_5"></table>'), kind: 'posts' }]);
  const asked = [];
  const records = await readContentIncremental({ query: async (document, variables, options) => {
    // Listings must never come from the disk cache, or edits and new posts would be missed.
    assert.equal(options?.fresh, true);
    if (document.includes('LaunchListing')) return document.includes('posts(')
      ? { posts: { nodes: [11, 12, 13, 14].map((id) => ({ databaseId: id, uri: `/r${id}`, modified: id === 12 ? 'b' : 'a', status: 'publish' })), pageInfo: { hasNextPage: false } } }
      : { pages: { nodes: [{ databaseId: 1, uri: '/', modified: 'z', status: 'publish' }], pageInfo: { hasNextPage: false } } };
    asked.push(...variables.ids);
    const kind = document.includes('posts(') ? 'posts' : 'pages';
    return { [kind]: { nodes: variables.ids.map((id) => id === 1 ? { ...record(1, 'z'), uri: '/' } : record(id, id === 12 ? 'b' : 'a', id === 13 ? '<table class="footable_5"><tr><td>New row</td></tr></table>' : '<p>Body</p>')) } };
  } });
  assert.deepEqual(asked.sort((a, b) => a - b), [1, 12, 13, 14]);
  assert.equal(records.length, 5);
  assert.match(records.find((r) => r.databaseId === 13).content, /New row/);
});
