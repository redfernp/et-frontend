import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { johnWeek6, readLiveJohnWeek6, validateLiveJohnWeek6 } from '../src/lib/live-john-week6.mjs';

test('John Week 6 exact public source is locked to one ID, slug, path and hash', () => {
  assert.equal(johnWeek6.id, 90942);
  assert.equal(johnWeek6.uri, '/epl-game-week-6-2026-27-season-premier-league-tips-john-newsome.html');
  assert.match(johnWeek6.contentSha256, /^[a-f0-9]{64}$/);
  assert.throws(() => validateLiveJohnWeek6({ id: 90942, slug: johnWeek6.slug,
    link: `https://www.everytip.co.uk${johnWeek6.uri}`, date: '2026-10-05T18:21:54',
    modified: johnWeek6.sourceModified, status: 'publish', author: 5,
    title: { rendered: 'Changed title' }, content: { rendered: '<p>Changed article.</p>' },
  }), /source lock changed/);
});

test('John Week 6 REST reader rejects any alternate endpoint before fetching', async () => {
  let fetched = false;
  await assert.rejects(readLiveJohnWeek6({ endpoint: 'https://www.everytip.co.uk/wp-json/wp/v2/posts/91110',
    fetchImpl: async () => { fetched = true; } }), /restricted/);
  assert.equal(fetched, false);
});

test('John Week 6 exact Astro route stays noindex with commercial sidebar withheld', async () => {
  const route = await readFile(new URL('../src/pages/epl-game-week-6-2026-27-season-premier-league-tips-john-newsome.html.astro', import.meta.url), 'utf8');
  assert.match(route, /previewOnly/);
  assert.match(route, /withholdSidebarOffers/);
  assert.match(route, /robots="noindex,nofollow"/);
  assert.match(route, /archiveHref="\/english-premier-league-predictions-for-saturday"/);
  assert.doesNotMatch(route, /href="\/go\//);
});
