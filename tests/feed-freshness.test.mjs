import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { assessFeedFreshness } from '../src/lib/feed-freshness.mjs';

test('publication age is based on Europe/Rome calendar day, including midnight boundaries', () => {
  const justBeforeRomeMidnight = assessFeedFreshness('2026-10-12', { now: new Date('2026-10-12T21:59:00Z'), maxAgeDays: 0 });
  assert.equal(justBeforeRomeMidnight.asOfDate, '2026-10-12');
  assert.equal(justBeforeRomeMidnight.ageDays, 0);
  assert.equal(justBeforeRomeMidnight.stale, false);
  const afterRomeMidnight = assessFeedFreshness('2026-10-12', { now: new Date('2026-10-12T22:01:00Z'), maxAgeDays: 0 });
  assert.equal(afterRomeMidnight.asOfDate, '2026-10-13');
  assert.equal(afterRomeMidnight.ageDays, 1);
  assert.equal(afterRomeMidnight.stale, true);
});

test('weekly and daily thresholds flag the September staging posts as stale by 13 October', () => {
  const now = new Date('2026-10-13T10:00:00Z');
  const weekly = assessFeedFreshness('2026-09-24', { now, maxAgeDays: 7 });
  assert.equal(weekly.ageDays, 19);
  assert.equal(weekly.stale, true);
  const daily = assessFeedFreshness('2026-10-10', { now, maxAgeDays: 2 });
  assert.equal(daily.ageDays, 3);
  assert.equal(daily.stale, true);
  assert.equal(assessFeedFreshness('2026-10-11', { now, maxAgeDays: 2 }).stale, false);
});

test('invalid and future publication dates fail closed', () => {
  const now = new Date('2026-10-13T10:00:00Z');
  assert.throws(() => assessFeedFreshness('2026-02-31', { now, maxAgeDays: 2 }), /Invalid/);
  assert.throws(() => assessFeedFreshness('2026-10-14', { now, maxAgeDays: 2 }), /future/);
  assert.throws(() => assessFeedFreshness('2026-10-13', { now, maxAgeDays: -1 }), /Invalid/);
});

test('exact preview pages remain noindex and do not claim a stale feed is today’s tips', async () => {
  const home = await readFile(new URL('../src/pages/pilot/home.astro', import.meta.url), 'utf8');
  const tips = await readFile(new URL('../src/pages/pilot/free-betting-tips.astro', import.meta.url), 'utf8');
  assert.match(home, /<meta name="robots" content="noindex,nofollow"/);
  assert.match(tips, /previewOnly=\{!!exactRecord\}/);
  assert.match(home, /stale as of/);
  assert.match(tips, /stale as of/);
  assert.doesNotMatch(home, /Latest Free Betting Tips/);
  assert.doesNotMatch(tips, /Latest Published Articles on Staging|Today’s Betting Offer News/);
});
