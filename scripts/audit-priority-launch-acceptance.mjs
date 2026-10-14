// Local-only, dated-source preflight. This never requests live/staging WordPress.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { latestContentSnapshot } from '../src/lib/migration-preview.mjs';
import { buildDatedPriorityAcceptanceInputs } from '../src/lib/dated-priority-acceptance-inputs.mjs';
import { evaluatePriorityLaunchAcceptance } from '../src/lib/priority-launch-acceptance.mjs';

const modeFlag = process.argv.find((arg) => arg.startsWith('--mode='));
const mode = modeFlag?.slice('--mode='.length);
if (!['preview', 'public'].includes(mode) || process.argv.length !== 3) {
  throw new Error('Usage: node scripts/audit-priority-launch-acceptance.mjs --mode=preview|public');
}
const root = resolve(import.meta.dirname, '..');
const snapshot = await latestContentSnapshot();
const inventory = await readFile(resolve(root, 'docs/everytip-live-only-posts-audit-2026-10-13.md'), 'utf8');
const inputs = await buildDatedPriorityAcceptanceInputs({ snapshot, inventory,
  assetRead: (path) => readFile(resolve(root, 'dist', path), 'utf8').catch((error) => {
    if (error.code === 'ENOENT') return null;
    throw error;
  }) });
const result = evaluatePriorityLaunchAcceptance({ ...inputs, mode });
console.log(JSON.stringify({ auditedAt: new Date().toISOString(), readOnly: true,
  sourceMode: 'dated-local-preflight-no-network', snapshotGeneratedAt: snapshot.generatedAt,
  inventoryDate: '2026-10-13', priorLiveSeoReference: 'docs/everytip-priority-seo-parity-2026-10-13.md',
  ...result }, null, 2));
// This local preflight cannot certify a public cutover even if every local
// comparison later passes. Public mode therefore always exits nonzero.
if (mode === 'preview' ? !result.previewGatePass : true) process.exitCode = 1;
