import test from 'node:test';
import assert from 'node:assert/strict';
import { launchAuditFails } from '../src/lib/launch-audit-gate.mjs';

const safePreview = {
  missingAssets: 26, previewAssets: 1031, accidentallyIndexablePreviews: 0,
  robotsMismatches: 477, canonicalMismatches: 478, stagingHostReferences: 0,
  descriptionRegressions: 0, missingTitles: 0,
};

test('intentional noindex preview is safe to inspect but never launch-ready', () => {
  assert.equal(launchAuditFails(safePreview, 'preview-safety'), false);
  assert.equal(launchAuditFails(safePreview, 'launch-gate'), true);
});

test('indexable preview and staging-domain output fail the preview safety gate', () => {
  assert.equal(launchAuditFails({ ...safePreview, accidentallyIndexablePreviews: 1 }, 'preview-safety'), true);
  assert.equal(launchAuditFails({ ...safePreview, stagingHostReferences: 1 }, 'preview-safety'), true);
});

test('source-missing meta descriptions are advisory, but lost source descriptions block launch', () => {
  const ready = { ...safePreview, missingAssets: 0, previewAssets: 0, robotsMismatches: 0, canonicalMismatches: 0, missingDescriptions: 100 };
  assert.equal(launchAuditFails(ready, 'launch-gate'), false);
  assert.equal(launchAuditFails({ ...ready, descriptionRegressions: 1 }, 'launch-gate'), true);
  assert.equal(launchAuditFails({ ...ready, freshLiveDelta: { checked: true, missingNewAssetCount: 1 } }, 'launch-gate'), true);
  assert.equal(launchAuditFails({ ...ready, freshLiveDelta: { checked: true, missingNewAssetCount: 0 } }, 'launch-gate'), false);
  assert.equal(launchAuditFails({ ...ready, freshLiveDelta: { checked: false, missingNewAssetCount: 0 } }, 'launch-gate'), true);
  assert.equal(launchAuditFails({ ...ready, freshLiveDelta: { checked: true, missingNewAssetCount: 0, modifiedExistingCount: 1 } }, 'launch-gate'), true);
});
