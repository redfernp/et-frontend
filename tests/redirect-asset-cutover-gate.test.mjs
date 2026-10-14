import test from 'node:test';
import assert from 'node:assert/strict';
import { launchAuditFails } from '../src/lib/launch-audit-gate.mjs';

const otherwiseReady = {
  missingAssets: 0, redirectAssetCollisions: [], previewAssets: 0,
  robotsMismatches: 0, canonicalMismatches: 0, stagingHostReferences: 0,
  descriptionRegressions: 0, missingTitles: 0,
  freshLiveDelta: { checked: true, missingNewAssetCount: 0, modifiedExistingCount: 0 },
};

test('a built asset at a verified 301 source fails the public cutover gate', () => {
  assert.equal(launchAuditFails(otherwiseReady, 'launch-gate'), false);
  assert.equal(launchAuditFails({ ...otherwiseReady, redirectAssetCollisions: ['/old-page.html'] }, 'launch-gate'), true);
});

test('redirect collision remains advisory for an explicitly noindex local preview', () => {
  assert.equal(launchAuditFails({ ...otherwiseReady, redirectAssetCollisions: ['/old-page.html'], accidentallyIndexablePreviews: 0 }, 'preview-safety'), false);
});
