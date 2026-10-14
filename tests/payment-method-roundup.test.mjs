import test from 'node:test';
import assert from 'node:assert/strict';
import { latestContentSnapshot } from '../src/lib/migration-preview.mjs';
import { roundupSnapshotPreview } from '../src/lib/roundup-snapshot-preview.mjs';
import { splitPaymentMethodRoundup } from '../src/lib/payment-method-roundup.mjs';
import { stagingRoundupFamilyFixture } from '../src/lib/roundup-family-fixture.mjs';

for (const [uri, method, expectedHeading] of [
  ['/online-bookmakers-that-accept-neteller.html', 'Neteller', /History of Neteller/],
  ['/online-bookmakers-that-accept-skrill.html', 'Skrill', /What is Skrill and How Does it Work/],
]) {
  test(`${method} guide holds back legacy offer modules and retains editorial sections`, async () => {
    const snapshot = await latestContentSnapshot();
    assert.ok(snapshot, 'staging snapshot required');
    const preview = roundupSnapshotPreview(snapshot, uri);
    const { intro, body, withheldNodes } = splitPaymentMethodRoundup(preview.source, method, preview.hero);
    assert.ok(withheldNodes > 0);
    assert.match(body, expectedHeading);
    assert.doesNotMatch(intro + body, /WELCOME40|PLAY10|Bet £10 Get £40|Bet £10 Get £30/i);
    assert.doesNotMatch(intro + body, /<a\b/i);
  });
  test(`${method} staging capture supplies ACF entries to the same safe split`, async () => {
    const fixture = await stagingRoundupFamilyFixture(method.toLowerCase());
    if (!fixture) return;
    const sections = splitPaymentMethodRoundup({ uri, content: fixture.content }, method);
    assert.equal(fixture.rankedEntries.length, 2);
    assert.match(sections.body, expectedHeading);
    assert.doesNotMatch(sections.intro + sections.body, /WELCOME40|PLAY10|Bet £10 Get £40|Bet £10 Get £30/i);
  });
}
