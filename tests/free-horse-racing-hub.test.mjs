import test from 'node:test';
import assert from 'node:assert/strict';
import { latestContentSnapshot } from '../src/lib/migration-preview.mjs';
import { extractRacingHubEditorial, racingHubIdentity } from '../src/lib/free-horse-racing-hub.mjs';

test('racing hub retains evergreen source guidance, not 2025 tips or bookmaker offers', async () => {
  const snapshot = await latestContentSnapshot();
  const source = snapshot.pages.find((record) => record.databaseId === racingHubIdentity.databaseId);
  const result = extractRacingHubEditorial(source);
  assert.equal(result.sections.length, 4);
  assert.equal(result.faq.length, 4);
  const html = [...result.sections.map(({ html }) => html), ...result.faq.map(({ html }) => html), result.responsibleHtml].join('');
  assert.match(html, /trainer and jockey/i);
  assert.match(html, /Never gamble more than you can afford to lose/);
  assert.doesNotMatch(html, /October 20, 2025|Bet £10|Get Free Bets|#Ad|<a\b|href=|\/go\//i);
  assert.ok(html.replace(/<[^>]+>/g, '').length > 5000);
});

test('racing hub rejects another slug or a changed source structure', async () => {
  const snapshot = await latestContentSnapshot();
  const source = snapshot.pages.find((record) => record.databaseId === racingHubIdentity.databaseId);
  assert.throws(() => extractRacingHubEditorial({ ...source, uri: '/racing-tips' }), /identity/);
  assert.throws(() => extractRacingHubEditorial({ ...source, content: '<h2>Another page</h2>' }), /section boundaries/);
});
