import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { ownerRewritePreviewRecords, ownerRewriteSources } from '../src/lib/owner-rewrite-preview.mjs';
import { previewHtml } from '../src/lib/migration-preview.mjs';
import { parseCrawlCsv } from '../src/lib/exact-route-preview.mjs';

test('eight owner-rewritten live 200 paths have exact, substantive and inert local previews', async () => {
  const crawl = parseCrawlCsv(await readFile(new URL('../docs/everytip-template-map-2026-09-30.csv', import.meta.url), 'utf8'));
  const records = await ownerRewritePreviewRecords();
  assert.equal(records.length, 8);
  assert.equal(new Set(records.map(({ record }) => record.uri)).size, 8);
  assert.deepEqual(records.map(({ source }) => source.uri), ownerRewriteSources.map(({ uri }) => uri));
  for (const { source, record } of records) {
    assert.equal(record.databaseId, source.id);
    assert.equal(crawl.filter((row) => row.path === record.uri && row.status_code === '200').length, 1);
    assert.ok(record.content.length > 1000, `Insufficient review content at ${record.uri}`);
    const html = previewHtml(record);
    assert.doesNotMatch(html, /href=|\/go\/|\[fl_builder_insert_layout\b/i);
    assert.match(html, /<p|<h2|<li/i);
  }
});
