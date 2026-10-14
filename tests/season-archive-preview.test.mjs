import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { latestContentSnapshot } from '../src/lib/migration-preview.mjs';
import { parseCrawlCsv } from '../src/lib/exact-route-preview.mjs';
import { seasonArchivePaths, seasonArchivePreview } from '../src/lib/season-archive-preview.mjs';

test('all mapped John Newsome season archives retain only safe, exact-path local article links', async () => {
  const snapshot = await latestContentSnapshot();
  const crawl = parseCrawlCsv(await readFile(new URL('../docs/everytip-template-map-2026-09-30.csv', import.meta.url), 'utf8'));
  const availablePaths = new Set(crawl.filter((item) => item.status_code === '200').map((item) => item.path));
  for (const path of seasonArchivePaths) {
    const record = snapshot.pages.find((item) => item.uri === path);
    assert.ok(record, path);
    const archive = seasonArchivePreview(record, snapshot, availablePaths);
    assert.ok(archive.links.length >= 20, path);
    assert.equal(new Set(archive.links.map((item) => item.href)).size, archive.links.length);
    assert.ok(archive.links.every((item) => item.href.startsWith('/') && !item.href.includes('/go/')));
    assert.ok(archive.links.every((item) => availablePaths.has(item.href)), path);
  }
});
