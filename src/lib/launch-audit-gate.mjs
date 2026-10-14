/** Distinguishes a safe local preview from a public launch-ready asset. */
export function launchAuditFails(summary, mode) {
  if (mode === 'preview-safety') {
    return Boolean(summary.accidentallyIndexablePreviews || summary.stagingHostReferences);
  }
  if (mode === 'launch-gate') {
    return Boolean(summary.missingAssets || summary.redirectAssetCollisions?.length
      || summary.previewAssets || summary.robotsMismatches
      || summary.canonicalMismatches || summary.stagingHostReferences
      || summary.descriptionRegressions || summary.missingTitles
      || (summary.freshLiveDelta && !summary.freshLiveDelta.checked)
      || summary.freshLiveDelta?.missingNewAssetCount
      || summary.freshLiveDelta?.modifiedExistingCount);
  }
  return false;
}
