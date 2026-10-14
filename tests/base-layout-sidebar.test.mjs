import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolvePreviewRobots } from '../src/lib/preview-robots.mjs';

const source = await readFile(new URL('../src/layouts/BaseLayout.astro', import.meta.url), 'utf8');

test('a requested sidebar is not suppressed on public pages', () => {
  assert.match(source, /'with-sidebar': sidebar\b/);
  assert.match(source, /\{sidebar && <aside class="sidebar"/);
  assert.doesNotMatch(source, /sidebar && !publicPage/);
});

test('public-page sidebar keeps offer CTAs in preview state', () => {
  assert.match(source, /<FeaturedOffersSidebar\s*\/>/);
  assert.match(source, /!publicPage && \(relatedTopic === 'football'/);
});

test('preview pages cannot become indexable and only explicitly requested pagination is followable', () => {
  assert.match(source, /resolvePreviewRobots\(\{ previewOnly, publicPage, robots, seoRobots: seo\?\.robots \}\)/);
  for (const robots of ['index,follow', 'index,nofollow', 'all', '', undefined]) {
    assert.equal(resolvePreviewRobots({ previewOnly: true, publicPage: true, robots, seoRobots: 'index,follow' }), 'noindex,nofollow');
  }
  assert.equal(resolvePreviewRobots({ previewOnly: true, publicPage: true, robots: 'noindex,follow', seoRobots: 'index,follow' }), 'noindex,follow');
  assert.equal(resolvePreviewRobots({ previewOnly: false, publicPage: true, robots: 'noindex,nofollow', seoRobots: 'index,follow' }), 'index,follow');
});
