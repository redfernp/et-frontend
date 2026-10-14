import test from 'node:test';
import assert from 'node:assert/strict';
import { latestContentSnapshot } from '../src/lib/migration-preview.mjs';
import { extractFreeTipsEditorial } from '../src/lib/free-tips-editorial.mjs';
import { freeTipsFeedPreview, readStagingFreeTipsFeed, validateFreeTipsFeed } from '../src/lib/staging-free-tips-feed.mjs';

test('free tips hub takes long-form copy from the exact WordPress page without builder or affiliate markup', async () => {
  const snapshot = await latestContentSnapshot();
  const source = [...snapshot.posts, ...snapshot.pages].find(({ uri }) => uri === '/free-betting-tips');
  const result = extractFreeTipsEditorial(source);
  assert.ok(result.headingCount >= 8);
  assert.match(result.html, /Free Sports Betting Tips From Professional Betting Tipsters/i);
  assert.doesNotMatch(result.html, /<a\b|<table\b|<iframe\b|<script\b|fl-builder|\/go\//i);
});

const feedPayload = () => ({ data: { posts: { nodes: [
  { databaseId: 1001, uri: '/latest-football-tips.html', status: 'publish', title: 'Football &amp; analysis', date: '2026-10-13T10:30:00' },
  { databaseId: 1002, uri: '/racing-tips.html', status: 'publish', title: 'Racing <em>preview</em>', date: '2026-10-12T10:30:00' },
  { databaseId: 1003, uri: '/weekend-preview.html', status: 'publish', title: 'Weekend preview', date: '2026-10-11T10:30:00' },
  { databaseId: 1004, uri: '/daily-tips.html', status: 'publish', title: 'Daily tips', date: '2026-10-10T10:30:00' },
  { databaseId: 1005, uri: '/news-story.html', status: 'publish', title: 'News story', date: '2026-10-09T10:30:00' },
] } } });

test('free tips feed accepts five published posts, plain titles and exact internal paths only', () => {
  const feed = validateFreeTipsFeed(feedPayload());
  assert.equal(feed.items.length, 5);
  assert.equal(feed.items[0].title, 'Football & analysis');
  assert.equal(feed.items[0].dateLabel, '13 Oct');
  assert.equal(feed.items[1].title, 'Racing preview');
  assert.equal(feed.items[0].href, '/latest-football-tips.html');
  assert.equal(feed.freshness.latestDate, '2026-10-13');
  const duplicate = feedPayload(); duplicate.data.posts.nodes[1].uri = duplicate.data.posts.nodes[0].uri;
  assert.throws(() => validateFreeTipsFeed(duplicate), /contract mismatch/);
  const draft = feedPayload(); draft.data.posts.nodes[0].status = 'draft';
  assert.throws(() => validateFreeTipsFeed(draft), /contract mismatch/);
  const outbound = feedPayload(); outbound.data.posts.nodes[0].uri = '//example.test/go/offer';
  assert.throws(() => validateFreeTipsFeed(outbound), /contract mismatch/);
  const affiliate = feedPayload(); affiliate.data.posts.nodes[0].uri = '/go/bet365';
  assert.throws(() => validateFreeTipsFeed(affiliate), /contract mismatch/);
  const badDate = feedPayload(); badDate.data.posts.nodes[0].date = '2026-02-31T10:30:00';
  assert.throws(() => validateFreeTipsFeed(badDate), /invalid publication date/);
  assert.throws(() => validateFreeTipsFeed({ errors: [{ message: 'Unavailable' }] }), /Unavailable/);
  const short = feedPayload(); short.data.posts.nodes.pop();
  assert.throws(() => validateFreeTipsFeed(short), /exactly 5/);
});

test('fresh free tips feed is read-only, opt-in and restricted to staging; failures never use fixtures', async () => {
  let calls = 0;
  const skipped = await freeTipsFeedPreview({ enabled: false, freshRead: async () => { calls++; throw new Error('Must not read'); } });
  assert.equal(skipped, null);
  assert.equal(calls, 0);
  await assert.rejects(freeTipsFeedPreview({ enabled: true, freshRead: async () => { throw new Error('Staging down'); } }), /Staging down/);
  const feed = await readStagingFreeTipsFeed({ fetchImpl: async (url, options) => {
    calls++;
    assert.equal(String(url), 'https://wordpress-159231-2098144.cloudwaysapps.com/graphql');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, undefined);
    assert.match(JSON.parse(options.body).query, /posts\(first: 5/);
    return { ok: true, json: async () => feedPayload() };
  } });
  assert.equal(calls, 1);
  assert.equal(feed.sourceMode, 'fresh-staging-wpgraphql-preview');
  await assert.rejects(readStagingFreeTipsFeed({ endpoint: 'https://www.everytip.co.uk/graphql',
    fetchImpl: async () => { throw new Error('Must not query live'); } }), /restricted/);
  await assert.rejects(readStagingFreeTipsFeed({ fetchImpl: async () => ({ ok: false, status: 503 }) }), /HTTP 503/);
});
