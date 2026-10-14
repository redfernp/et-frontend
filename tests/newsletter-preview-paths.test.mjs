import test from 'node:test';
import assert from 'node:assert/strict';
import { newsletterPreviewPaths } from '../src/lib/newsletter-preview-paths.mjs';

test('old email landing URL is a single opt-in noindex design preview', async () => {
  const old = process.env.MIGRATION_EXACT_PREVIEW;
  try {
    delete process.env.MIGRATION_EXACT_PREVIEW;
    assert.deepEqual(await newsletterPreviewPaths(), []);
    process.env.MIGRATION_EXACT_PREVIEW = '1';
    const paths = await newsletterPreviewPaths();
    assert.equal(paths.length, 1);
    assert.equal(paths[0].params.newsletterSlug, 'free-betting-tips-previews-analysis-by-email');
    assert.equal(paths[0].props.source.databaseId, 12419);
  } finally {
    if (old === undefined) delete process.env.MIGRATION_EXACT_PREVIEW;
    else process.env.MIGRATION_EXACT_PREVIEW = old;
  }
});
