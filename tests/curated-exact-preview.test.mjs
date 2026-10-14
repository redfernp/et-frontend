import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFile } from 'node:fs/promises';
import { curatedExactPaths, curatedPreviewSections, curatedReasonMatches } from '../src/lib/curated-exact-preview.mjs';
import { latestContentSnapshot } from '../src/lib/migration-preview.mjs';
import { parseCrawlCsv, planExactRoutePreview } from '../src/lib/exact-route-preview.mjs';

test('dated builder or active-embed records yield substantive inert editorial text', async () => {
  const snapshot = await latestContentSnapshot();
  const records = new Map([...snapshot.posts, ...snapshot.pages].map((record) => [record.uri, record]));
  assert.equal(curatedExactPaths.length, 13);
  for (const path of curatedExactPaths) {
    const sections = curatedPreviewSections(records.get(path));
    const text = sections.map((section) => section.text).join(' ');
    assert.ok(sections.length >= 6, path);
    assert.ok(text.length >= 500, path);
    assert.ok(sections.every(({ kind }) => ['p', 'h2', 'h3', 'li'].includes(kind)), path);
    assert.doesNotMatch(text, /<|>|https?:\/\/|sign up|clicking on the following link|guaranteed profit/i, path);
  }
});

test('curated selection fails closed if source copy changes', async () => {
  const snapshot = await latestContentSnapshot();
  const record = [...snapshot.posts, ...snapshot.pages].find(({ uri }) => uri === curatedExactPaths[0]);
  assert.throws(() => curatedPreviewSections({ ...record, content: `${record.content}<p>New copy</p>` }), /re-review/);
  assert.throws(() => curatedPreviewSections({ ...record, databaseId: -1 }), /re-review/);
});

test('challenge and method previews withhold dated prizes, offers and certainty claims', async () => {
  const snapshot = await latestContentSnapshot();
  const records = new Map([...snapshot.posts, ...snapshot.pages].map((record) => [record.uri, record]));
  for (const path of ['/bet365-6-scores-challenge', '/bet365-6-horses-challenge.html']) {
    const text = curatedPreviewSections(records.get(path)).map((section) => section.text).join(' ');
    assert.doesNotMatch(text, /£\d|free bets|jackpot|qualifying races|Portugal v Wales|Royal Ascot Festival/i, path);
  }
  const method = curatedPreviewSections(records.get('/false-favourites.html')).map((section) => section.text).join(' ');
  assert.doesNotMatch(method, /certainty|guaranteed|definitely|profitable/i);
});

test('all curated URLs still match the crawl and the expected unsafe-source classification', async () => {
  const snapshot = await latestContentSnapshot();
  const crawl = parseCrawlCsv(await readFile(new URL('../docs/everytip-template-map-2026-09-30.csv', import.meta.url), 'utf8'));
  const excluded = new Map(planExactRoutePreview(snapshot, crawl).excluded.map(({ path, reason }) => [path, reason]));
  const crawledPaths = new Set(crawl.map(({ path }) => path));
  for (const path of curatedExactPaths) {
    const reason = crawledPaths.has(path) ? excluded.get(path)
      : path === '/bet365-review-redesign' ? 'uncrawled-inline-style' : 'uncrawled-builder';
    assert.equal(curatedReasonMatches(path, reason), true, path);
  }
});

test('uncrawled bookmaker review previews omit welcome and promotions sections', async () => {
  const snapshot = await latestContentSnapshot();
  const records = new Map([...snapshot.posts, ...snapshot.pages].map((record) => [record.uri, record]));
  for (const path of ['/bet365-review-redesign', '/10bet-review', '/betwright-review', '/netbet-review', '/spreadex-review']) {
    const sections = curatedPreviewSections(records.get(path));
    const headings = sections.filter(({ kind }) => kind === 'h2').map(({ text }) => text);
    if (path !== '/bet365-review-redesign') assert.ok(headings.includes('What to watch'), path);
    assert.ok(headings.includes('Safety and licensing'), path);
    assert.ok(!headings.includes('Welcome bonus') && !headings.includes('Promotions'), path);
    assert.doesNotMatch(sections.map(({ text }) => text).join(' '), /£\d|claim now|join now|welcome offer|free bet|\bbonus\b/i, path);
  }
});
