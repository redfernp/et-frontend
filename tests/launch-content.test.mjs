import test from 'node:test';
import assert from 'node:assert/strict';
import { readContent } from '../src/lib/launch-content.mjs';

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
