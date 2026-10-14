import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { seymourOct10, seymourOct10Preview, previewSeymourOct10Body,
  readLiveSeymourOct10, validateLiveSeymourOct10 } from '../src/lib/live-seymour-oct10.mjs';

const snapshot = JSON.parse(await readFile(new URL('../data/raw/live-seymour-oct10-2026-10-13.json', import.meta.url), 'utf8'));

test('dated live public REST capture is pinned to one published Seymour 10 October identity', async () => {
  const preview = await seymourOct10Preview();
  assert.equal(preview.record.id, 90999);
  assert.equal(preview.record.uri, seymourOct10.uri);
  assert.equal(preview.record.date.slice(0, 10), '2026-10-08');
  assert.equal(preview.sourceMode, 'dated-live-public-rest-snapshot');
  assert.throws(() => validateLiveSeymourOct10({ ...snapshot.post, slug: 'wrong' }), /identity/);
  assert.throws(() => validateLiveSeymourOct10({ ...snapshot.post, status: 'draft' }), /identity/);
  assert.throws(() => validateLiveSeymourOct10({ ...snapshot.post, link: 'https://another.example/article.html' }), /identity/);
  assert.throws(() => validateLiveSeymourOct10({ ...snapshot.post, author: 3 }), /identity/);
});

test('commercial offer blocks and all links are withheld while race analysis remains substantial', () => {
  const body = previewSeymourOct10Body(snapshot.post);
  assert.equal(body.withheldBlocks, 3);
  assert.equal(body.retainedBlocks, 31);
  assert.ok(body.visibleCharacters > 5000);
  assert.match(body.html, /Newmarket|York|Cesarewitch/i);
  assert.doesNotMatch(body.html, /<a\b|\/go\/betfred|Bet this lucky 15|welcome offer|\b\d+\s*\/\s*\d+\b/i);
  assert.throws(() => previewSeymourOct10Body({ ...snapshot.post, content: '<p>Too short</p>' }), /contract changed/);
});

test('live opt-in is read-only, exact-host pinned and never silently falls back', async () => {
  let calls = 0;
  const record = await readLiveSeymourOct10({ fetchImpl: async (url, options) => {
    calls++;
    assert.equal(url, seymourOct10.endpoint);
    assert.equal(options.method, 'GET');
    return { ok: true, json: async () => ({ ...snapshot.post, content: { rendered: snapshot.post.content },
      title: { rendered: snapshot.post.title } }) };
  } });
  assert.equal(record.id, 90999);
  assert.equal(calls, 1);
  await assert.rejects(readLiveSeymourOct10({ endpoint: 'https://wordpress-159231-2098144.cloudwaysapps.com/wp-json/wp/v2/posts/90999' }), /restricted/);
  const prior = process.env.MIGRATION_LIVE_SEYMOUR_OCT10_READ;
  try {
    process.env.MIGRATION_LIVE_SEYMOUR_OCT10_READ = '1';
    await assert.rejects(seymourOct10Preview({ snapshotRead: async () => snapshot,
      freshRead: async () => { throw new Error('Live REST unavailable'); } }), /Live REST unavailable/);
  } finally {
    if (prior === undefined) delete process.env.MIGRATION_LIVE_SEYMOUR_OCT10_READ;
    else process.env.MIGRATION_LIVE_SEYMOUR_OCT10_READ = prior;
  }
});

test('exact Seymour page remains noindex with author box and safe sidebar', async () => {
  const source = await readFile(new URL('../src/pages/saturdays-horse-racing-preview-tips-10th-october-2026-seymour-biz.html.astro', import.meta.url), 'utf8');
  assert.match(source, /robots="noindex,nofollow"/);
  assert.match(source, /<BaseLayout[^>]*sidebar withholdSidebarOffers/);
  assert.match(source, /<ColumnistProfile[^>]*variant="byline"/);
  assert.match(source, /<ColumnistProfile[^>]*variant="full"[^>]*archiveHref="\/saturday-horse-racing-tips"/);
  assert.match(source, /set:html=\{body.html\}/);
});
