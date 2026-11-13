import test from 'node:test';
import assert from 'node:assert/strict';
import { rankOffers } from '../scripts/rerank-offers.mjs';
import { renderTopOffers } from '../src/lib/launch-offers.mjs';
import worker, { recordClick } from '../src/worker/index.mjs';

const offer = (id, partner, position, extra = {}) => ({ id, partner, bookmaker: partner, position, link: `/go/${partner}`, ...extra });
const order = result => result.offers.filter(o => o.position < 99).sort((a, b) => a.position - b.position).map(o => o.partner);

test('ladder is re-ranked by clicks, ties keep the old order', () => {
  const offers = [offer(1, 'a', 1), offer(2, 'b', 2), offer(3, 'c', 3), offer(4, 'd', 4)];
  assert.deepEqual(order(rankOffers(offers, { c: 50, b: 10, d: 10 }, '2026-11-16')), ['c', 'b', 'd', 'a']);
});

test('a new partner is held at #3 until newUntil, then ranked on clicks', () => {
  const offers = [offer(1, 'a', 1), offer(2, 'b', 2), offer(3, 'c', 3), offer(9, 'new', 8, { newUntil: '2026-11-22' })];
  assert.deepEqual(order(rankOffers(offers, { c: 50, a: 40, b: 30 }, '2026-11-16')), ['c', 'a', 'new', 'b']);
  assert.deepEqual(order(rankOffers(offers, { c: 50, a: 40, b: 30 }, '2026-11-23')), ['c', 'a', 'b', 'new']);
});

test('a pinned #1 cannot be outranked, and a new partner still lands at #3', () => {
  const offers = [offer(1, 'betfred', 1, { pinned: 1 }), offer(2, 'b', 2), offer(3, 'c', 3), offer(4, 'd', 4), offer(9, 'new', 5, { newUntil: '2026-11-22' })];
  const clicks = { d: 5000, c: 900, b: 10, betfred: 1 };
  assert.deepEqual(order(rankOffers(offers, clicks, '2026-11-16')), ['betfred', 'd', 'new', 'c', 'b']);
  assert.deepEqual(order(rankOffers(offers, clicks, '2026-11-30')), ['betfred', 'd', 'c', 'b', 'new']);
});

test('offers outside the ladder keep their position', () => {
  const offers = [offer(1, 'a', 1), offer(2, 'b', 2), offer(5, 'promo', 99, { lineup: false }), offer(6, 'off', 4, { active: false })];
  const result = rankOffers(offers, { b: 5 }, '2026-11-16');
  assert.equal(result.offers.find(o => o.id === 5).position, 99);
  assert.equal(result.offers.find(o => o.id === 6).position, 4);
  assert.deepEqual(order({ offers: result.offers.filter(o => o.active !== false) }), ['b', 'a']);
});

test('Top offers shows three and puts every other ladder offer under View all', () => {
  const html = renderTopOffers('[everytip_top_offers count="3"]');
  const top = html.split('<details')[0];
  assert.equal((top.match(/class="home-ladder-row"/g) ?? []).length, 3);
  assert.match(html, /<details class="home-ladder-more"><summary><span class="show-more">View all \d+ offers/);
  assert.match(top, /href="\/go\/[a-z0-9-]+\?pl=top"/);
  assert.match(html.split('<details')[1], /href="\/go\/[a-z0-9-]+\?pl=more"/);
});

const fakeClicks = () => { const points = []; return { points, env: { CLICKS: { writeDataPoint: p => points.push(p) } } }; };
const human = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Safari/604.1';

test('a reader click on /go/ is logged with slug, placement and page, and still redirects', async () => {
  const { points, env } = fakeClicks();
  const response = await worker.fetch(new Request('https://www.everytip.co.uk/go/betfred?pl=top', { headers: { 'user-agent': human, referer: 'https://www.everytip.co.uk/both-teams-to-score-btts-tips.html' } }), env);
  assert.ok([301, 302, 307, 308].includes(response.status));
  assert.deepEqual(points[0].blobs.slice(0, 3), ['betfred', 'top', '/both-teams-to-score-btts-tips.html']);
});

test('bots and HEAD requests are not counted', () => {
  const { points, env } = fakeClicks();
  const url = new URL('https://www.everytip.co.uk/go/betfred');
  recordClick(new Request(url, { headers: { 'user-agent': 'Googlebot/2.1' } }), env, url);
  recordClick(new Request(url, { method: 'HEAD', headers: { 'user-agent': human } }), env, url);
  recordClick(new Request(url), env, url);
  assert.equal(points.length, 0);
});
