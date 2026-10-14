import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { seymourOct3, seymourOct3Preview, previewSeymourOct3Body,
  readLiveSeymourOct3, validateLiveSeymourOct3 } from '../src/lib/live-seymour-oct3.mjs';

const snapshot = JSON.parse(await readFile(new URL('../data/raw/live-seymour-oct3-2026-10-13.json', import.meta.url), 'utf8'));

test('dated live public REST capture is pinned to one published Seymour 3 October identity', async () => {
  const preview = await seymourOct3Preview();
  assert.equal(preview.record.id, 90836);
  assert.equal(preview.record.uri, seymourOct3.uri);
  assert.equal(preview.record.date.slice(0, 10), '2026-10-01');
  assert.equal(preview.sourceMode, 'dated-live-public-rest-snapshot');
  assert.throws(() => validateLiveSeymourOct3({ ...snapshot.post, slug: 'wrong' }), /identity/);
  assert.throws(() => validateLiveSeymourOct3({ ...snapshot.post, status: 'draft' }), /identity/);
  assert.throws(() => validateLiveSeymourOct3({ ...snapshot.post, link: 'https://another.example/article.html' }), /identity/);
  assert.throws(() => validateLiveSeymourOct3({ ...snapshot.post, author: 3 }), /identity/);
});

test('commercial offer blocks and all links are withheld while race analysis remains substantial', () => {
  const body = previewSeymourOct3Body(snapshot.post);
  assert.equal(body.withheldBlocks, 3);
  assert.equal(body.retainedBlocks, 22);
  assert.ok(body.visibleCharacters > 3500);
  assert.match(body.html, /Newmarket|Ascot|Sun Chariot/i);
  assert.doesNotMatch(body.html, /<a\b|\/go\/betfred|Bet this lucky 15|welcome offer|\b\d+\s*\/\s*\d+\b/i);
  assert.throws(() => previewSeymourOct3Body({ ...snapshot.post, content: '<p>Too short</p>' }), /contract changed/);
});

test('live opt-in is read-only, exact-host pinned and never silently falls back', async () => {
  let calls = 0;
  const record = await readLiveSeymourOct3({ fetchImpl: async (url, options) => {
    calls++;
    assert.equal(url, seymourOct3.endpoint);
    assert.equal(options.method, 'GET');
    return { ok: true, json: async () => ({ ...snapshot.post, content: { rendered: snapshot.post.content },
      title: { rendered: snapshot.post.title } }) };
  } });
  assert.equal(record.id, 90836);
  assert.equal(calls, 1);
  await assert.rejects(readLiveSeymourOct3({ endpoint: 'https://wordpress-159231-2098144.cloudwaysapps.com/wp-json/wp/v2/posts/90836' }), /restricted/);
  const prior = process.env.MIGRATION_LIVE_SEYMOUR_OCT3_READ;
  try {
    process.env.MIGRATION_LIVE_SEYMOUR_OCT3_READ = '1';
    await assert.rejects(seymourOct3Preview({ snapshotRead: async () => snapshot,
      freshRead: async () => { throw new Error('Live REST unavailable'); } }), /Live REST unavailable/);
  } finally {
    if (prior === undefined) delete process.env.MIGRATION_LIVE_SEYMOUR_OCT3_READ;
    else process.env.MIGRATION_LIVE_SEYMOUR_OCT3_READ = prior;
  }
});

test('exact Seymour 3 October page remains noindex with author box and safe sidebar', async () => {
  const source = await readFile(new URL('../src/pages/saturdays-horse-racing-preview-tips-3rd-october-2026-seymour-biz.html.astro', import.meta.url), 'utf8');
  assert.match(source, /robots="noindex,nofollow"/);
  assert.match(source, /<BaseLayout[^>]*sidebar withholdSidebarOffers/);
  assert.match(source, /<ColumnistProfile[^>]*variant="byline"/);
  assert.match(source, /<ColumnistProfile[^>]*variant="full"[^>]*archiveHref="\/saturday-horse-racing-tips"/);
  assert.match(source, /set:html=\{body.html\}/);
});
