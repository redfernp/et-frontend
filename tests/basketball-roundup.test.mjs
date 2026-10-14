import test from 'node:test';
import assert from 'node:assert/strict';
import { latestContentSnapshot } from '../src/lib/migration-preview.mjs';
import { roundupSnapshotPreview } from '../src/lib/roundup-snapshot-preview.mjs';
import { splitBasketballRoundup } from '../src/lib/basketball-roundup.mjs';
import { stagingRoundupFamilyFixture } from '../src/lib/roundup-family-fixture.mjs';

test('basketball design isolates the legacy bookmaker shortlist while retaining the analysis', async () => {
  const snapshot = await latestContentSnapshot();
  assert.ok(snapshot, 'staging snapshot required');
  const preview = roundupSnapshotPreview(snapshot, '/best-betting-sites-for-basketball.html');
  const { intro, body, withheldNodes } = splitBasketballRoundup(preview.source, preview.hero);
  assert.equal(withheldNodes, 18);
  assert.match(body, /How We Evaluate Sites/);
  assert.match(body, /What Are The Most Common Basketball Bets/);
  assert.doesNotMatch(intro + body, /Sign Up to Betway Now|Sign Up To Bet365 Now|See William Hill’s Basketball Offering Here/i);
  assert.doesNotMatch(intro + body, /<a\b/i);
});

test('basketball staging capture supplies its ACF offer while old CTAs remain withheld', async () => {
  const fixture = await stagingRoundupFamilyFixture('basketball');
  if (!fixture) return;
  const { intro, body } = splitBasketballRoundup({ uri: '/best-betting-sites-for-basketball.html', content: fixture.content });
  assert.equal(fixture.rankedEntries[0].offer.nodes[0].databaseId, 90850);
  assert.match(body, /How We Evaluate Sites/);
  assert.doesNotMatch(intro + body, /Sign Up to Betway Now|Sign Up To Bet365 Now/i);
});
