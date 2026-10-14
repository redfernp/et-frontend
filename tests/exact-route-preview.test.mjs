import test from 'node:test';
import assert from 'node:assert/strict';
import { isSafeExactPath, parseCrawlCsv, planExactRoutePreview, selectExactRoutePreview, supplementalPublishedPreviewRows } from '../src/lib/exact-route-preview.mjs';

test('crawl CSV retains quoted commas, quotes and line breaks', () => {
  const rows = parseCrawlCsv('path,status_code,note\n/a.html,200,"A ""quoted"", note\nand second line"\n');
  assert.deepEqual(rows, [{ path: '/a.html', status_code: '200', note: 'A "quoted", note\nand second line' }]);
  assert.throws(() => parseCrawlCsv('path,status_code\n/a.html'), /Malformed/);
});

test('exact-route pilot selects safe matched posts and pages at their public paths', () => {
  const post = (uri, date, content = '<p>Editorial copy</p>') => ({ uri, date, content });
  const row = (path, overrides = {}) => ({ path, status_code: '200', indexability: 'Non-Indexable', suggested_template: 'dated-prediction-article', ...overrides });
  const snapshot = { posts: [
    post('/older.html', '2024-01-01'),
    post('/newer.html', '2024-02-01'),
    post('/builder.html', '2024-03-01', '<div class="fl-builder">No</div>'),
    post('/indexed.html', '2024-04-01'),
  ], pages: [post('/guide', '2024-05-01')] };
  const crawl = [
    row('/older.html'), row('/newer.html'), row('/builder.html'),
    row('/indexed.html', { indexability: 'Indexable' }), row('/guide', { suggested_template: 'evergreen-guide' }),
    row('/missing.html'), row('/unsafe/../newer.html'), row('/not-html'),
  ];
  assert.deepEqual(selectExactRoutePreview(snapshot, crawl).map(({ record }) => record.uri), ['/older.html', '/newer.html', '/indexed.html', '/guide']);
  assert.deepEqual(selectExactRoutePreview(snapshot, crawl).map(({ kind }) => kind), ['post', 'post', 'post', 'page']);
  assert.deepEqual(planExactRoutePreview(snapshot, crawl).counts, {
    'missing-snapshot-record': 2,
    'unsafe-content:builder-markup': 1,
    'unsafe-or-reserved-path': 1,
  });
});

test('route plan excludes archive, homepage, query variants, duplicate records and paths', () => {
  const record = (uri) => ({ uri, content: '<p>Copy</p>' });
  const row = (path, suggested_template = 'standard-article') => ({ path, status_code: '200', suggested_template });
  const snapshot = { posts: [record('/ok.html'), record('/duplicate.html')], pages: [record('/duplicate.html'), record('/archive'), record('/')] };
  const plan = planExactRoutePreview(snapshot, [
    row('/ok.html'), row('/ok.html'), row('/duplicate.html'), row('/archive', 'editorial-archive'),
    row('/', 'homepage'), row('/query', 'query-variant'), row('/old.html', 'standard-article'),
    { ...row('/redirect'), status_code: '301' },
  ]);
  assert.deepEqual(plan.included.map(({ record }) => record.uri), ['/ok.html']);
  assert.deepEqual(plan.counts, {
    'duplicate-crawl-path': 1,
    'duplicate-snapshot-uri': 1,
    'missing-snapshot-record': 1,
    'separate-route-family': 2,
    'unsafe-or-reserved-path': 1,
  });
  assert.equal(plan.included.length + plan.excluded.length, 7);
});

test('path validation preserves exact html and extensionless slugs but rejects unsafe variants', () => {
  for (const path of ['/article.html', '/racecourses/kempton-racing-tips', '/a-b_1', '/المواقع-الالكترونية-للمراهنة']) assert.ok(isSafeExactPath(path));
  for (const path of ['/', '/a/', '/a/../b', '/a//b', '/a%2fb', '/a?b', '/a#b', '/pilot/a', '/migration-preview/a', '/a\\b', '/a b']) {
    assert.equal(isSafeExactPath(path), false, path);
  }
});

test('approved roundup designs own their exact legacy paths instead of the generic renderer', () => {
  const paths = [
    '/best-paypal-betting-sites.html',
    '/low-or-no-minimum-deposit-betting-sites.html',
    '/online-bookmakers-that-accept-neteller.html',
    '/online-bookmakers-that-accept-skrill.html',
    '/best-betting-sites-for-basketball.html',
  ];
  const snapshot = { posts: paths.map((uri) => ({ uri, content: '<p>Editable guide text</p>' })), pages: [] };
  const crawl = paths.map((path) => ({ path, status_code: '200', suggested_template: 'commercial-roundup' }));
  const plan = planExactRoutePreview(snapshot, crawl);
  assert.equal(plan.included.length, 0);
  assert.equal(plan.counts['dedicated-roundup-template'], 5);
});

test('legal pages use their dedicated exact-path layouts', () => {
  const paths = ['/safer-gambling', '/terms-conditions', '/privacy-policy'];
  const snapshot = { posts: [], pages: paths.map((uri) => ({ uri, content: '<p>Policy copy</p>' })) };
  const crawl = paths.map((path) => ({ path, status_code: '200', suggested_template: 'legal-page' }));
  const plan = planExactRoutePreview(snapshot, crawl);
  assert.equal(plan.included.length, 0);
  assert.equal(plan.counts['dedicated-legal-template'], 3);
});

test('weekly hubs, Bet365 review and racing-tips hub cannot collide with generic exact routes', () => {
  const paths = ['/saturday-horse-racing-tips', '/english-premier-league-predictions-for-saturday', '/bet365-review', '/free-horse-racing-tips'];
  const snapshot = { posts: [], pages: paths.map((uri) => ({ uri, content: '<p>Legacy page</p>' })) };
  const crawl = paths.map((path) => ({ path, status_code: '200', suggested_template: 'editorial-hub' }));
  const plan = planExactRoutePreview(snapshot, crawl);
  assert.equal(plan.included.length, 0);
  assert.equal(plan.counts['dedicated-weekly-archive-template'], 2);
  assert.equal(plan.counts['dedicated-review-template'], 1);
  assert.equal(plan.counts['dedicated-tips-hub-template'], 1);
  assert.deepEqual(supplementalPublishedPreviewRows(snapshot, []).map(({ record }) => record.uri), []);
});

test('the seven source-locked October article routes cannot collide with generic exact routes', () => {
  const paths = [
    '/epl-game-week-7-2026-27-season-premier-league-tips-john-newsome.html',
    '/epl-game-week-6-2026-27-season-premier-league-tips-john-newsome.html',
    '/saturdays-horse-racing-preview-tips-10th-october-2026-seymour-biz.html',
    '/saturdays-horse-racing-preview-tips-3rd-october-2026-seymour-biz.html',
    '/extra-place-races-today-tips-13-october.html',
      '/extra-place-races-today-tips-12-october.html',
      '/extra-place-races-today-tips-11-october.html',
  ];
  const snapshot = { posts: paths.map((uri) => ({ uri, content: '<p>Legacy article</p>' })), pages: [] };
  const crawl = paths.map((path) => ({ path, status_code: '200', suggested_template: 'dated-prediction-article' }));
  const plan = planExactRoutePreview(snapshot, crawl);
  assert.equal(plan.included.length, 0);
    assert.equal(plan.counts['dedicated-live-article-template'], 7);
  assert.deepEqual(supplementalPublishedPreviewRows(snapshot, []).map(({ record }) => record.uri), []);
});

test('published CMS paths absent from the crawl are extra noindex previews, never assumed live-indexable', () => {
  const record = (uri, content = '<p>Copy</p>') => ({ uri, content, databaseId: uri.length, slug: uri.slice(1) });
  const snapshot = { posts: [record('/weekly.html'), record('/unsafe.html', '<iframe></iframe>'),
    record('/epl-game-week-5-2026-27-season-premier-league-tips-john-newsome.html'),
    record('/free-betting-tips-old'), record('/live-streaming-top-bookmakers')],
  pages: [record('/guide'), record('/duplicate'), record('/duplicate')] };
  const crawl = [{ path: '/guide', status_code: '200' }];
  const supplement = supplementalPublishedPreviewRows(snapshot, crawl);
  assert.deepEqual(supplement.map(({ record }) => record.uri), ['/weekly.html']);
  assert.equal(supplement[0].row.indexability, 'Non-Indexable');
  assert.equal(supplement[0].row.unverified_crawl_path, true);
});
