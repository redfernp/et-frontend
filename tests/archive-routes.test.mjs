import assert from 'node:assert/strict';
import { test } from 'node:test';
import { archivePagePath, archiveRouteKey, buildArchiveRoutes, loadArchiveRoutes, parseCrawlCsv } from '../src/lib/archive-route-data.mjs';

test('CSV parser retains quoted archive titles and canonicals', () => {
  const rows = parseCrawlCsv('path,title,canonical\n/blog,"Reviews, news",https://example.com/blog\n');
  assert.deepEqual(rows, [{ path: '/blog', title: 'Reviews, news', canonical: 'https://example.com/blog' }]);
});

test('archive key and pagination preserve the exact public path', () => {
  assert.equal(archiveRouteKey('/author/everyt/page/5'), 'user/everyt');
  assert.equal(archiveRouteKey('/tag/uk-racing'), 'tag/uk-racing');
  assert.equal(archiveRouteKey('/blog/page/10'), 'blog');
  assert.equal(archivePagePath('/author/everyt/page/5', 4), '/author/everyt/page/4');
  assert.equal(archivePagePath('/blog/page/2', 1), '/blog');
});

test('archive route collection covers exactly 28 crawl-only paths', async () => {
  const routes = await loadArchiveRoutes();
  assert.equal(routes.length, 28);
  assert.equal(new Set(routes.map(({ path }) => path)).size, 28);
  assert.equal(routes.filter(({ template }) => template === 'blog-archive').length, 10);
  assert.equal(routes.filter(({ template }) => template === 'author-archive').length, 8);
  assert.equal(routes.filter(({ template }) => template === 'tag-archive').length, 5);
  assert.equal(routes.filter(({ template }) => template === 'category-hub').length, 5);
  assert.ok(routes.every(({ entries }) => entries.length > 0));
  assert.ok(routes.every(({ entries }) => entries.length <= 100));
  assert.equal(routes.find(({ path }) => path === '/blog').entries.length, 100);
  assert.ok(routes.find(({ path }) => path === '/author/everyt/page/5').entries.length > 0);
  assert.equal(routes.find(({ path }) => path === '/author/everyt/page/5').legacyIndexability, 'Non-Indexable');
  assert.equal(routes.find(({ path }) => path === '/blog/page/10').legacyIndexability, 'Indexable');
  assert.equal(routes.find(({ path }) => path === '/sports-tips').legacyIndexability, 'Non-Indexable');
});

test('archive route builder excludes existing WordPress post/page paths', () => {
  const routes = buildArchiveRoutes([
    { path: '/blog', title: 'Blog', status_code: '200', suggested_template: 'blog-archive' },
    { path: '/news', title: 'News', status_code: '200', suggested_template: 'category-hub' },
  ], { blogPosts: Array.from({ length: 11 }, (_, index) => ({ uri: `/post-${index}`, title: `Post ${index}` })), archives: { 'category/news': { name: 'News', posts: [] } } }, new Set(['/news']));
  assert.equal(routes.length, 1);
  assert.equal(routes[0].path, '/blog');
});
