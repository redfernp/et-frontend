import test from 'node:test';
import assert from 'node:assert/strict';
import { latestContentSnapshot } from '../src/lib/migration-preview.mjs';
import { bookmakerFeaturePaths, extractBookmakerFeature } from '../src/lib/bookmaker-feature-preview.mjs';

test('bookmaker feature guides retain editorial sections without active affiliate links or builder wrappers', async () => {
  assert.equal(bookmakerFeaturePaths.length, 16);
  const snapshot = await latestContentSnapshot();
  assert.ok(snapshot);
  for (const path of bookmakerFeaturePaths) {
    const record = [...snapshot.posts, ...snapshot.pages].find((item) => item.uri === path);
    assert.ok(record, path);
    const editorial = extractBookmakerFeature(record);
    assert.match(editorial.html, /<h2>/);
    assert.doesNotMatch(editorial.html, /href=|<script|<iframe|fl-builder|tve_/i);
    assert.ok(editorial.withheld > 0, path);
  }
});
