import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { johnWeek7, johnWeek7Preview, previewJohnWeek7Body,
  readLiveJohnWeek7, validateLiveJohnWeek7 } from '../src/lib/live-john-week7.mjs';

const snapshot = JSON.parse(await readFile(new URL('../data/raw/live-john-week7-2026-10-13.json', import.meta.url), 'utf8'));

test('dated live public REST capture is pinned to one published John Week 7 identity', async () => {
  const preview = await johnWeek7Preview();
  assert.equal(preview.record.id, 91110);
  assert.equal(preview.record.uri, johnWeek7.uri);
  assert.equal(preview.record.date.slice(0, 10), '2026-10-13');
  assert.equal(preview.sourceMode, 'dated-live-public-rest-snapshot');
  assert.throws(() => validateLiveJohnWeek7({ ...snapshot.post, slug: 'wrong' }), /identity/);
  assert.throws(() => validateLiveJohnWeek7({ ...snapshot.post, status: 'draft' }), /identity/);
  assert.throws(() => validateLiveJohnWeek7({ ...snapshot.post, link: 'https://another.example/article.html' }), /identity/);
});

test('commercial paragraphs and all links are withheld while the match analysis remains substantial', () => {
  const body = previewJohnWeek7Body(snapshot.post);
  assert.ok(body.withheldBlocks >= 40);
  assert.ok(body.retainedBlocks >= 250);
  assert.ok(body.visibleCharacters > 25000);
  assert.match(body.html, /Premier League|Everton|Liverpool/i);
  assert.doesNotMatch(body.html, /<a\b|\/go\/betfred|Betfred|welcome offer|\b\d+\s*\/\s*\d+\b/i);
  assert.throws(() => previewJohnWeek7Body({ ...snapshot.post, content: '<p>Too short</p>' }), /contract changed/);
});

test('live opt-in is read-only, exact-host pinned and never silently falls back', async () => {
  let calls = 0;
  const record = await readLiveJohnWeek7({ fetchImpl: async (url, options) => {
    calls++;
    assert.equal(url, johnWeek7.endpoint);
    assert.equal(options.method, 'GET');
    return { ok: true, json: async () => ({ ...snapshot.post, content: { rendered: snapshot.post.content },
      title: { rendered: snapshot.post.title } }) };
  } });
  assert.equal(record.id, 91110);
  assert.equal(calls, 1);
  await assert.rejects(readLiveJohnWeek7({ endpoint: 'https://wordpress-159231-2098144.cloudwaysapps.com/wp-json/wp/v2/posts/91110' }), /restricted/);
  const prior = process.env.MIGRATION_LIVE_JOHN_WEEK7_READ;
  try {
    process.env.MIGRATION_LIVE_JOHN_WEEK7_READ = '1';
    await assert.rejects(johnWeek7Preview({ snapshotRead: async () => snapshot,
      freshRead: async () => { throw new Error('Live REST unavailable'); } }), /Live REST unavailable/);
  } finally {
    if (prior === undefined) delete process.env.MIGRATION_LIVE_JOHN_WEEK7_READ;
    else process.env.MIGRATION_LIVE_JOHN_WEEK7_READ = prior;
  }
});

test('exact John Week 7 page remains noindex with author box and sidebar', async () => {
  const source = await readFile(new URL('../src/pages/epl-game-week-7-2026-27-season-premier-league-tips-john-newsome.html.astro', import.meta.url), 'utf8');
  assert.match(source, /robots="noindex,nofollow"/);
  assert.match(source, /<BaseLayout[^>]*sidebar withholdSidebarOffers/);
  assert.match(source, /<ColumnistProfile[^>]*variant="byline"/);
  assert.match(source, /<ColumnistProfile[^>]*variant="full"[^>]*archiveHref="\/english-premier-league-predictions-for-saturday"/);
  assert.match(source, /set:html=\{body.html\}/);
});
