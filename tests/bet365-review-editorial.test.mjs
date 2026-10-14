import test from 'node:test';
import assert from 'node:assert/strict';
import { latestContentSnapshot } from '../src/lib/migration-preview.mjs';
import { bet365ReviewIdentity, extractBet365ReviewEditorial, validateBet365Review } from '../src/lib/bet365-review-editorial.mjs';

test('exact Bet365 review retains complete dated editorial sections, without offer copy', async () => {
  const snapshot = await latestContentSnapshot();
  const source = snapshot.pages.find((record) => record.uri === '/bet365-review');
  assert.equal(source.databaseId, bet365ReviewIdentity.databaseId);
  const result = extractBet365ReviewEditorial(source);
  assert.deepEqual(result.sections.map(({ number }) => number), [2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.ok(result.methodHtml.includes('real £20 bankroll'));
  assert.ok(result.prosHtml.includes('Full Tote betting integrated'));
  assert.ok(result.consHtml.includes('Promotions for existing customers'));
  assert.doesNotMatch(result.prosHtml, /welcome offer|withdrawals via PayPal/i);
  assert.ok(result.sections.find(({ number }) => number === 3).html.includes('Pete'));
  assert.ok(result.sections.find(({ number }) => number === 7).html.includes('nothing truly standout'));
  assert.ok(result.verdictHtml.includes('patents, Lucky 15s, Tote bets'));
  assert.equal(result.sections.every(({ paragraphCount }) => paragraphCount >= 2), true);
  const visible = `${result.methodHtml}${result.prosHtml}${result.consHtml}${result.sections.map(({ html }) => html).join('')}${result.verdictHtml}`;
  assert.doesNotMatch(visible, /£30|#Ad|\/go\/|<a\b|Bet £10/i);
  assert.ok(visible.replace(/<[^>]+>/g, '').length > 3000);
});

test('PPC and mutated review identities cannot flow through the exact editorial route', async () => {
  const snapshot = await latestContentSnapshot();
  const source = snapshot.pages.find((record) => record.uri === '/bet365-review');
  assert.throws(() => validateBet365Review({ ...source, uri: '/bet365-review-ppc' }), /identity/);
  assert.throws(() => validateBet365Review({ ...source, uri: '/bet365-review-redesign', slug: 'bet365-review-redesign', databaseId: 89169 }), /identity/);
  assert.throws(() => validateBet365Review({ ...source, databaseId: 1 }), /identity/);
  assert.throws(() => extractBet365ReviewEditorial({ ...source, content: '<p>Short body</p>' }), /ten-section/);
});
