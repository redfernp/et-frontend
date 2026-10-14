import test from 'node:test';
import assert from 'node:assert/strict';
import { johnWeek7 } from '../src/lib/live-john-week7.mjs';
import { johnWeek6 } from '../src/lib/live-john-week6.mjs';
import { seymourOct10 } from '../src/lib/live-seymour-oct10.mjs';
import { seymourOct3 } from '../src/lib/live-seymour-oct3.mjs';
import { selectLiveEditorialPreviewFeed, readLiveEditorialPreviewFeed } from '../src/lib/live-editorial-preview-feed.mjs';

const posts = () => [johnWeek7, johnWeek6, seymourOct10, seymourOct3].map((spec, index) => ({
  databaseId: spec.id, uri: spec.uri, slug: spec.slug, status: 'publish',
  date: `2026-10-${String(13 - index * 3).padStart(2, '0')}T08:00:00`,
  title: `${index % 2 ? 'Seymour' : 'John'} historical column`,
}));

test('four source-locked October columnist items become dated exact-route cards only', () => {
  const result = selectLiveEditorialPreviewFeed(posts(), '2026-10-13T21:00:00Z');
  assert.equal(result.items.length, 4);
  assert.equal(result.cards.length, 4);
  assert.equal(result.sourceMode, 'live-public-rest-columnist-review');
  assert.equal(result.items[0].href, johnWeek7.uri);
  assert.match(result.items[0].description, /not current advice/);
  assert.ok(result.items.every((item) => item.href.endsWith('.html') && !item.href.includes('/go/')));
  const wrong = posts(); wrong[0].databaseId = 999;
  assert.throws(() => selectLiveEditorialPreviewFeed(wrong), /identity/);
  const offer = posts(); offer[1].title = 'Get £50 free bets';
  assert.throws(() => selectLiveEditorialPreviewFeed(offer), /identity or title/);
  assert.throws(() => selectLiveEditorialPreviewFeed(posts().slice(1)), /four dated/);
});

test('live review feed is explicit and fails closed when source overlay fails', async () => {
  const keys = ['MIGRATION_EXACT_PREVIEW', 'MIGRATION_LIVE_EDITORIAL_FEED_READ'];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));
  let calls = 0;
  try {
    process.env.MIGRATION_EXACT_PREVIEW = '0';
    process.env.MIGRATION_LIVE_EDITORIAL_FEED_READ = '1';
    await assert.rejects(readLiveEditorialPreviewFeed({ overlayRead: async () => { calls++; } }), /explicit local/);
    process.env.MIGRATION_EXACT_PREVIEW = '1';
    await assert.rejects(readLiveEditorialPreviewFeed({ overlayRead: async () => { throw new Error('Live REST unavailable'); } }), /Live REST unavailable/);
    const result = await readLiveEditorialPreviewFeed({ overlayRead: async () => { calls++; return posts(); } });
    assert.equal(calls, 1);
    assert.equal(result.cards[0].uri, johnWeek7.uri);
  } finally {
    for (const key of keys) previous[key] === undefined ? delete process.env[key] : process.env[key] = previous[key];
  }
});
