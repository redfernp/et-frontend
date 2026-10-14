import test from 'node:test';
import assert from 'node:assert/strict';
import { discoverPublishedContent, validateDiscoveryPage } from '../src/lib/published-content-discovery.mjs';

const node = (type, id, uri) => ({ __typename: type, databaseId: id, uri, slug: uri === '/' ? 'home' : uri?.slice(1).replace(/\.html$/, '') ?? 'missing-uri', status: 'publish', title: `Title ${id}`, modified: '2026-10-03T10:00:00' });
const page = (kind, nodes, hasNextPage = false, endCursor = null) => ({ data: { [kind]: { nodes, pageInfo: { hasNextPage, endCursor } } } });

async function optedIn(run) {
  const prior = process.env.MIGRATION_STAGING_DISCOVERY;
  process.env.MIGRATION_STAGING_DISCOVERY = '1';
  try { return await run(); }
  finally {
    if (prior === undefined) delete process.env.MIGRATION_STAGING_DISCOVERY;
    else process.env.MIGRATION_STAGING_DISCOVERY = prior;
  }
}

function fakeFetch(responses, calls) {
  return async (url, options) => {
    calls.push({ url: String(url), options });
    return { ok: true, json: async () => responses.shift() };
  };
}

test('published discovery paginates posts and pages without writing or changing route registry', async () => optedIn(async () => {
  const responses = [
    page('posts', [node('Post', 1, '/one.html')], true, 'post-cursor'),
    page('posts', [node('Post', 2, '/two.html')]),
    page('pages', [node('Page', 3, '/')], true, 'page-cursor'),
    page('pages', [node('Page', 4, '/about-us')]),
  ];
  const calls = [];
  const inventory = await discoverPublishedContent({ fetchImpl: fakeFetch(responses, calls) });
  assert.deepEqual(inventory.posts.map(({ uri }) => uri), ['/one.html', '/two.html']);
  assert.deepEqual(inventory.pages.map(({ uri }) => uri), ['/', '/about-us']);
  assert.equal(inventory.source, 'staging-wpgraphql-read-only');
  assert.equal(calls.length, 4);
  assert.ok(calls.every(({ url, options }) => url === 'https://wordpress-159231-2098144.cloudwaysapps.com/graphql' && options.method === 'POST'));
  assert.deepEqual(calls.map(({ options }) => JSON.parse(options.body).variables.after), [null, 'post-cursor', null, 'page-cursor']);
}));

test('duplicate URI across connections fails closed', async () => optedIn(async () => {
  const responses = [page('posts', [node('Post', 1, '/same.html')]), page('pages', [node('Page', 2, '/same.html')])];
  await assert.rejects(discoverPublishedContent({ fetchImpl: fakeFetch(responses, []) }), /Duplicate published WordPress URI/);
}));

test('assigned posts-index page with null URI is inventoried but never becomes a route', async () => optedIn(async () => {
  const postsIndex = { ...node('Page', 15, null), slug: 'blog', isPostsPage: true };
  const inventory = await discoverPublishedContent({ fetchImpl: fakeFetch([
    page('posts', [node('Post', 1, '/one.html')]),
    page('pages', [postsIndex, node('Page', 2, '/about-us')]),
  ], []) });
  assert.deepEqual(inventory.pages.map(({ uri }) => uri), ['/about-us']);
  assert.deepEqual(inventory.nonRoutablePages.map(({ databaseId }) => databaseId), [15]);
  assert.throws(() => validateDiscoveryPage(page('pages', [{ ...postsIndex, isPostsPage: false }]), 'pages', null), /Invalid published/);
}));

test('partial pages, malformed nodes and stalled cursors fail closed', async () => optedIn(async () => {
  assert.throws(() => validateDiscoveryPage({ data: { posts: { nodes: [] } } }, 'posts', null), /Incomplete/);
  assert.throws(() => validateDiscoveryPage(page('posts', [], true, 'next'), 'posts', null), /Incomplete/);
  assert.throws(() => validateDiscoveryPage(page('posts', [node('Post', 15, null)]), 'posts', null), /Invalid published/);
  const responses = [page('posts', [node('Post', 1, '/a.html')], true, 'cursor'), page('posts', [node('Post', 2, '/b.html')], true, 'cursor')];
  await assert.rejects(discoverPublishedContent({ fetchImpl: fakeFetch(responses, []) }), /Incomplete/);
  assert.throws(() => validateDiscoveryPage({ errors: [{ message: 'Permission denied' }] }, 'posts', null), /Permission denied/);
}));

test('discovery requires explicit opt-in and refuses live or alternate hosts', async () => {
  const prior = process.env.MIGRATION_STAGING_DISCOVERY;
  delete process.env.MIGRATION_STAGING_DISCOVERY;
  try { await assert.rejects(discoverPublishedContent({ fetchImpl: () => { throw new Error('Must not fetch'); } }), /requires/); }
  finally { if (prior !== undefined) process.env.MIGRATION_STAGING_DISCOVERY = prior; }
  await optedIn(async () => {
    await assert.rejects(discoverPublishedContent({ endpoint: 'https://www.everytip.co.uk/graphql', fetchImpl: () => { throw new Error('Must not fetch live'); } }), /restricted/);
  });
});
