import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { validateDailyTipImport, writeDailyTipImport } from '../src/lib/daily-tip-import.mjs';
import { loadOptedInDailyTipSnapshot, validateImportedTipSnapshot } from '../src/lib/opted-in-daily-tip-snapshot.mjs';

const now = new Date('2026-10-13T20:00:00Z');
const nextDay = new Date('2026-10-14T08:00:00Z');

async function importedFixture() {
  const manifest = JSON.parse(await readFile(resolve('tests/fixtures/daily-tip-import/valid.manifest.json'), 'utf8'));
  const csv = await readFile(resolve('tests/fixtures/daily-tip-import/valid.csv'));
  return validateDailyTipImport(manifest, csv, { expectedDate: '2026-10-13', now });
}

test('upload-ID opt-in is absent by default and stale/tampered snapshots fail closed', async () => {
  const root = await mkdtemp(join(tmpdir(), 'everytip-tip-preview-'));
  try {
    const snapshot = await importedFixture();
    const file = await writeDailyTipImport(snapshot, root);
    assert.equal(await loadOptedInDailyTipSnapshot({ uploadId: '', artifactRoot: root, now }), null);
    assert.equal(await loadOptedInDailyTipSnapshot({ uploadId: '../escape', artifactRoot: root, now }), null);
    assert.equal(await loadOptedInDailyTipSnapshot({ uploadId: 'missing-001', artifactRoot: root, now }), null);
    const valid = await loadOptedInDailyTipSnapshot({ uploadId: snapshot.uploadId, artifactRoot: root, now });
    assert.equal(valid?.rowCount, 1);
    assert.equal(valid.rows[0].horse, 'Fixture Runner');
    assert.equal(await loadOptedInDailyTipSnapshot({ uploadId: snapshot.uploadId, artifactRoot: root, now: nextDay }), null);
    assert.equal(validateImportedTipSnapshot({ ...snapshot, rows: [{ ...snapshot.rows[0], horse: '<b>bad</b>' }] },
      { uploadId: snapshot.uploadId, now }), null);
    await writeFile(file, '{broken JSON');
    assert.equal(await loadOptedInDailyTipSnapshot({ uploadId: snapshot.uploadId, artifactRoot: root, now }), null);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('only the Dark Horse and Kempton exact previews opt into the local feed; both stay noindex', async () => {
  const catchAll = await readFile(resolve('src/pages/[...legacyPath].astro'), 'utf8');
  const racecourse = await readFile(resolve('src/components/RacecoursePreview.astro'), 'utf8');
  const component = await readFile(resolve('src/components/DatedTipsPreview.astro'), 'utf8');
  assert.match(catchAll, /const tipPlacement = valueTipPlacements\[record\.uri\]/);
  assert.match(catchAll, /resolveValueTipPlacement\(\{/);
  assert.match(racecourse, /record\.uri === '\/racecourses\/kempton-racing-tips' \? valueTipPlacements\[record\.uri\]/);
  assert.match(racecourse, /resolveValueTipPlacement\(\{/);
  assert.match(catchAll, /robots="noindex, nofollow"/);
  assert.match(racecourse, /previewOnly/);
  assert.match(component, /data-dated-tip-body data-feed-date=\{feedDate\} hidden/);
  assert.match(component, /body\.dataset\.feedDate === today/);
  assert.match(component, /window\.setInterval\(updateDatedTips, 60_000\)/);
  assert.match(component, /<TipsTable rows=\{rows\}/);
  assert.doesNotMatch(catchAll + racecourse, /tipsForCourse|Example Runner/);
});
