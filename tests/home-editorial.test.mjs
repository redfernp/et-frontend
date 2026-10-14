import test from 'node:test';
import assert from 'node:assert/strict';
import { latestContentSnapshot } from '../src/lib/migration-preview.mjs';
import { extractHomeEditorial } from '../src/lib/home-editorial.mjs';

test('homepage exact preview retains editorial copy without old commercial links', async () => {
  const snapshot = await latestContentSnapshot();
  const record = [...snapshot.posts, ...snapshot.pages].find((item) => item.uri === '/');
  const editorial = extractHomeEditorial(record);
  assert.ok(editorial.paragraphCount >= 6);
  assert.match(editorial.html, /EveryTip publishes free betting tips daily/);
  assert.doesNotMatch(editorial.html, /<a\b|\/go\/|sign-up bonuses|casino sites|fastest-growing/i);
});
