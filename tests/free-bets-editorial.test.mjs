import test from 'node:test';
import assert from 'node:assert/strict';
import { latestContentSnapshot } from '../src/lib/migration-preview.mjs';
import { extractFreeBetsEditorial } from '../src/lib/free-bets-editorial.mjs';

test('free-bets exact preview retains source guide without old affiliate markup', async () => {
  const snapshot = await latestContentSnapshot();
  const record = [...snapshot.posts, ...snapshot.pages].find((item) => item.uri === '/bookie-free-bets-bonus-offers');
  const editorial = extractFreeBetsEditorial(record);
  assert.ok(editorial.headingCount >= 12);
  assert.match(editorial.html, /What Are Free Bets\?/);
  assert.doesNotMatch(editorial.html, /<a\b|<img\b|<script\b|\/go\//i);
});
