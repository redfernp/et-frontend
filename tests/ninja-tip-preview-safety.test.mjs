import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  latestContentSnapshot, ninjaBackedTipPreviewUris, previewHtml, withholdsSnapshotTipTables,
} from '../src/lib/migration-preview.mjs';

test('all audited Ninja-backed tips posts withhold dated table subtrees but retain editorial prose', async () => {
  const audit = JSON.parse(await readFile(resolve('artifacts/staging-ninja-shortcodes/audit-2026-10-13T19-51-32.541Z.json'), 'utf8'));
  const expected = audit.rows.filter((row) => row.type === 'posts' && row.uri !== '/best-paypal-betting-sites.html').map((row) => row.uri);
  assert.equal(expected.length, 14);
  assert.deepEqual([...ninjaBackedTipPreviewUris].sort(), expected.sort());

  const snapshot = await latestContentSnapshot();
  assert.ok(snapshot, 'dated WordPress snapshot is required for this safety test');
  for (const uri of expected) {
    const record = snapshot.posts.find((post) => post.uri === uri);
    assert.ok(record, `missing snapshot record for ${uri}`);
    assert.ok(withholdsSnapshotTipTables(record), uri);
    const html = previewHtml(record);
    assert.doesNotMatch(html, /<\/?(?:table|thead|tbody|tr|th|td)\b/i, uri);
    assert.ok(html.replace(/<[^>]*>/g, '').trim().length > 100, `editorial prose missing: ${uri}`);
  }
});

test('ordinary non-tip editorial tables remain unaffected', () => {
  const record = { uri: '/unrelated-editorial.html', content: '<p>Context</p><table><tr><td>Reference data</td></tr></table>' };
  assert.equal(withholdsSnapshotTipTables(record), false);
  assert.match(previewHtml(record), /Reference data/);
});

test('exact and migration preview routes display a feed-unavailable status while staying noindex', async () => {
  for (const path of ['src/pages/[...legacyPath].astro', 'src/pages/migration-preview/[...path].astro']) {
    const source = await readFile(resolve(path), 'utf8');
    assert.match(source, /withholdsSnapshotTipTables\(record\)/, path);
    assert.match(source, /Tips table feed unavailable in this preview/, path);
    assert.match(source, /noindex,\s*nofollow/, path);
  }
});
