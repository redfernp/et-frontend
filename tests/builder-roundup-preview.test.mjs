import test from 'node:test';
import assert from 'node:assert/strict';
import { latestContentSnapshot } from '../src/lib/migration-preview.mjs';
import { builderRoundupPreviewPaths, extractBuilderRoundup } from '../src/lib/builder-roundup-preview.mjs';

test('builder roundups retain their exact source URLs', async () => {
  const old = process.env.MIGRATION_EXACT_PREVIEW;
  process.env.MIGRATION_EXACT_PREVIEW = '1';
  try {
    const paths = await builderRoundupPreviewPaths();
    assert.deepEqual(paths.map(({ props }) => props.record.uri).sort(), [
      '/best-betting-sites-for-accumulators.html', '/best-betting-sites-for-live-sports-streaming', '/best-bookie-for-lucky-15-bets-uk-ireland', '/best-cash-out-betting-sites-uk-ire',
      '/best-darts-betting-sites', '/best-golf-betting-sites', '/best-horse-racing-betting-sites',
      '/best-mobile-betting-sites-in-uk', '/best-odds-guaranteed-bookies.html', '/best-rugby-betting-sites',
      '/best-snooker-betting-sites', '/best-telephone-betting-bookmakers-uk', '/high-stakes-betting-sites-for-high-rollers-vips',
      '/top-cricket-betting-sites', '/what-is-best-way-to-bet-on-greyhounds',
    ]);
  } finally {
    if (old === undefined) delete process.env.MIGRATION_EXACT_PREVIEW;
    else process.env.MIGRATION_EXACT_PREVIEW = old;
  }
});

test('old rankings and active markup stay out of the editorial preview', async () => {
  const snapshot = await latestContentSnapshot();
  for (const uri of ['/best-odds-guaranteed-bookies.html', '/best-cash-out-betting-sites-uk-ire',
    '/best-rugby-betting-sites', '/best-telephone-betting-bookmakers-uk', '/best-darts-betting-sites',
    '/best-snooker-betting-sites', '/best-mobile-betting-sites-in-uk',
    '/best-betting-sites-for-live-sports-streaming', '/top-cricket-betting-sites',
    '/best-horse-racing-betting-sites', '/best-betting-sites-for-accumulators.html', '/best-golf-betting-sites',
    '/best-bookie-for-lucky-15-bets-uk-ireland', '/what-is-best-way-to-bet-on-greyhounds',
    '/high-stakes-betting-sites-for-high-rollers-vips']) {
    const source = [...snapshot.posts, ...snapshot.pages].find((entry) => entry.uri === uri);
    const preview = extractBuilderRoundup(source);
    assert.ok(preview.withheldNodes > 0, uri);
    assert.match(preview.body, /<h2>/);
    assert.doesNotMatch(preview.intro + preview.body, /<a\b|<script\b|<iframe\b|<table\b|fl-builder|ninja_table/i, uri);
  }
});
