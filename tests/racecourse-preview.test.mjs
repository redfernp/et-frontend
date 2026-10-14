import test from 'node:test';
import assert from 'node:assert/strict';
import { latestContentSnapshot } from '../src/lib/migration-preview.mjs';
import { extractRacecoursePreview, racecoursePreviewPaths, topLevelRacecoursePreviewPaths } from '../src/lib/racecourse-preview.mjs';

test('racecourse family covers the 45 crawl-mapped pages in opt-in mode', async () => {
  const old = process.env.MIGRATION_EXACT_PREVIEW;
  process.env.MIGRATION_EXACT_PREVIEW = '1';
  try {
    const paths = await racecoursePreviewPaths();
    assert.equal(paths.length, 45);
    assert.equal(new Set(paths.map(({ props }) => props.record.uri)).size, 45);
    assert.ok(paths.every(({ props }) => props.editorial.sections.length >= 2));
    for (const { props } of paths) {
      const html = props.editorial.introHtml + props.editorial.sections.map(({ html }) => html).join('');
      assert.doesNotMatch(html, /<a\b|<table\b|<script\b|<iframe\b|fl-builder|ninja_table/i, props.record.uri);
    }
  } finally {
    if (old === undefined) delete process.env.MIGRATION_EXACT_PREVIEW;
    else process.env.MIGRATION_EXACT_PREVIEW = old;
  }
});

test('Kempton editorial excludes stale tables and commercial modules', async () => {
  const snapshot = await latestContentSnapshot();
  const page = snapshot.pages.find(({ uri }) => uri === '/racecourses/kempton-racing-tips');
  const guide = extractRacecoursePreview(page);
  const html = guide.introHtml + guide.sections.map(({ html }) => html).join('');
  assert.match(guide.hero.src, /^https:\/\/www\.everytip\.co\.uk\/wp-content\/uploads\//);
  assert.ok(guide.sections.some(({ heading }) => /racecourse history/i.test(heading)));
  assert.doesNotMatch(html, /<a\b|<table\b|fl-builder|ninja_table|<script\b|<iframe\b/i);
  assert.ok(guide.discardedModules > 0);
});

test('four top-level legacy racecourse guides use the same safe editorial extraction', async () => {
  const old = process.env.MIGRATION_EXACT_PREVIEW;
  process.env.MIGRATION_EXACT_PREVIEW = '1';
  try {
    const paths = await topLevelRacecoursePreviewPaths();
    assert.equal(paths.length, 4);
    for (const { props } of paths) {
      assert.ok(props.editorial.sections.length >= 2, props.record.uri);
      const html = props.editorial.introHtml + props.editorial.sections.map(({ html }) => html).join('');
      assert.doesNotMatch(html, /<a\b|<table\b|<script\b|<iframe\b|fl-builder|ninja_table/i, props.record.uri);
    }
  } finally {
    if (old === undefined) delete process.env.MIGRATION_EXACT_PREVIEW;
    else process.env.MIGRATION_EXACT_PREVIEW = old;
  }
});
