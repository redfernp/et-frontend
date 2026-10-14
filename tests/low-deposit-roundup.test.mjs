import test from 'node:test';
import assert from 'node:assert/strict';
import { latestContentSnapshot } from '../src/lib/migration-preview.mjs';
import { roundupSnapshotPreview } from '../src/lib/roundup-snapshot-preview.mjs';
import { splitLowDepositRoundup } from '../src/lib/low-deposit-roundup.mjs';
import { stagingLowDepositRoundupFixture } from '../src/lib/low-deposit-roundup-fixture.mjs';

test('low-deposit design separates the legacy promotion without dropping guide sections', async () => {
  const snapshot = await latestContentSnapshot();
  assert.ok(snapshot, 'staging snapshot required');
  const preview = roundupSnapshotPreview(snapshot, '/low-or-no-minimum-deposit-betting-sites.html');
  const { intro, body, withheldNodes } = splitLowDepositRoundup(preview.source, preview.hero);
  assert.ok(withheldNodes > 0);
  assert.match(body, /No Minimum Deposit Betting/);
  assert.match(body, /Best Payment Types for Small Transactions/);
  assert.doesNotMatch(intro + body, /BETFRED50|Bet £10 Get £50|#Ad/i);
  assert.doesNotMatch(intro + body, /<a\b/i);
  assert.equal(preview.blockCount, 67);
});

test('captured staging Gutenberg draft supplies its ranked ACF offer to the same frontend split', async () => {
  const fixture = await stagingLowDepositRoundupFixture();
  if (!fixture) return;
  const sections = splitLowDepositRoundup({ uri: '/low-or-no-minimum-deposit-betting-sites.html', content: fixture.content });
  assert.equal(fixture.rankedEntries[0].offer.nodes[0].databaseId, 90846);
  assert.match(sections.body, /Best Payment Types for Small Transactions/);
  assert.doesNotMatch(sections.intro + sections.body, /BETFRED50|Bet £10 Get £50|#Ad/i);
});
