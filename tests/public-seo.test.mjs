import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePublicSeo } from '../src/lib/public-seo.mjs';

const path = '/best-paypal-betting-sites.html';
const crawlRow = { path, indexability: 'Indexable', canonical: `https://www.everytip.co.uk${path}`, title: 'Live title' };

test('verified exact staging Yoast canonical maps to the production hostname without dropping .html', () => {
  const result = resolvePublicSeo({ path, crawlRow, yoast: {
    title: 'Yoast title', metaDesc: 'Yoast description',
    canonical: `https://wordpress-159231-2098144.cloudwaysapps.com${path}`,
    metaRobotsNoindex: 'index', metaRobotsNofollow: 'follow',
  } });
  assert.equal(result.title, 'Yoast title');
  assert.equal(result.description, 'Yoast description');
  assert.equal(result.canonical, `https://www.everytip.co.uk${path}`);
  assert.equal(result.robots, 'index,follow');
});

test('live or Yoast noindex wins over apparent indexability', () => {
  assert.equal(resolvePublicSeo({ path, crawlRow: { ...crawlRow, indexability: 'Non-Indexable' } }).robots, 'noindex,follow');
  assert.equal(resolvePublicSeo({ path, crawlRow, yoast: { metaRobotsNoindex: 'noindex' } }).robots, 'noindex,follow');
  assert.equal(resolvePublicSeo({ path, crawlRow, yoast: { metaRobotsNofollow: 'nofollow' } }).robots, 'index,nofollow');
});

test('mismatched, external, or query-string canonical is never rewritten or indexed', () => {
  for (const canonical of [
    'https://wordpress-159231-2098144.cloudwaysapps.com/other.html',
    `https://example.org${path}`,
    `https://www.everytip.co.uk${path}?x=1`,
  ]) {
    const result = resolvePublicSeo({ path, crawlRow, yoast: { canonical } });
    assert.equal(result.canonical, null);
    assert.equal(result.robots, 'noindex,follow');
    assert.equal(result.needsReview, true);
  }
});

test('exact crawl identity is required', () => {
  assert.throws(() => resolvePublicSeo({ path, crawlRow: { ...crawlRow, path: '/other.html' } }), /exact crawl row/);
  assert.throws(() => resolvePublicSeo({ path: '//host.invalid/', crawlRow }), /Invalid/);
});

test('John and Seymour articles older than 12 calendar months remain noindex despite old live index metadata', () => {
  const now = new Date('2026-10-14T00:30:00Z');
  for (const columnistPath of [
    '/epl-game-week-8-2024-25-season-premier-league-tips-john-newsome.html',
    '/saturdays-horse-racing-preview-tips-4th-october-2025-seymour-biz.html',
  ]) {
    const source = { path: columnistPath, indexability: 'Indexable',
      canonical: `https://www.everytip.co.uk${columnistPath}` };
    const result = resolvePublicSeo({ path: columnistPath, crawlRow: source,
      publishedLocal: '2025-10-13T12:00:00', now });
    assert.equal(result.robots, 'noindex,follow');
    assert.equal(result.indexable, false);
  }
});

test('rolling columnist boundary stays index-eligible while missing or malformed date fails closed', () => {
  const columnistPath = '/epl-game-week-11-2026-27-season-premier-league-tips-john-newsome.html';
  const source = { path: columnistPath, indexability: 'Indexable',
    canonical: `https://www.everytip.co.uk${columnistPath}` };
  const now = new Date('2026-10-14T00:30:00Z');
  for (const publishedLocal of ['2025-10-14T00:00:00', '2026-10-01T00:00:00']) {
    assert.equal(resolvePublicSeo({ path: columnistPath, crawlRow: source, publishedLocal, now }).robots, 'index,follow');
  }
  for (const publishedLocal of [undefined, '2026-13-40']) {
    assert.equal(resolvePublicSeo({ path: columnistPath, crawlRow: source, publishedLocal, now }).robots, 'noindex,follow');
  }
});
