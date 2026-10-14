import test from 'node:test';
import assert from 'node:assert/strict';
import { latestContentSnapshot, previewHtml } from '../src/lib/migration-preview.mjs';
import { patentBetPreviewRecord } from '../src/lib/patent-bet-preview.mjs';

test('patent guide retains dated article copy while withholding its one source-locked calculator', async () => {
  const snapshot = await latestContentSnapshot();
  const source = snapshot.pages.find(({ uri }) => uri === '/what-is-a-patent-bet');
  const result = patentBetPreviewRecord(source);
  const html = previewHtml(result);
  assert.equal(result.withheldWidget, 'patent-calculator');
  assert.match(html, /patent bet gives you 7 chances/i);
  assert.doesNotMatch(result.content, /id="patent-calculator"|<script\b|fl-builder-content/i);
  assert.doesNotMatch(html, /href=|<script\b|<form\b/i);
  assert.throws(() => patentBetPreviewRecord({ ...source, content: `${source.content}<p>Changed</p>` }), /source changed/);
});
