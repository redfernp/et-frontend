import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { validateDailyTipImport, writeDailyTipImport } from '../src/lib/daily-tip-import.mjs';

const fixtureDir = resolve('tests/fixtures/daily-tip-import');
const now = new Date('2026-10-13T20:00:00Z');
async function fixture() {
  return {
    manifest: JSON.parse(await readFile(join(fixtureDir, 'valid.manifest.json'), 'utf8')),
    csv: await readFile(join(fixtureDir, 'valid.csv')),
  };
}

test('dated fixture validates hash and seven-column rows without publishing', async () => {
  const { manifest, csv } = await fixture();
  const snapshot = validateDailyTipImport(manifest, csv, { expectedDate: '2026-10-13', now });
  assert.equal(snapshot.uploadId, 'fixture-20261013-001');
  assert.equal(snapshot.feedDate, '2026-10-13');
  assert.equal(snapshot.rowCount, 1);
  assert.equal(snapshot.rows[0].courseId, 'kempton');
});

test('stale feed day and generated timestamp fail closed', async () => {
  const { manifest, csv } = await fixture();
  assert.throws(() => validateDailyTipImport(manifest, csv, { expectedDate: '2026-10-14', now }), /date missing, invalid or stale/);
  assert.throws(() => validateDailyTipImport({ ...manifest, generated_at: '2026-10-10T10:00:00Z' }, csv,
    { expectedDate: '2026-10-13', now }), /generated_at is invalid, stale/);
});

test('changed CSV, malformed rows, unsafe ID and future timestamp fail closed', async () => {
  const { manifest, csv } = await fixture();
  assert.throws(() => validateDailyTipImport(manifest, Buffer.concat([csv, Buffer.from('extra')]),
    { expectedDate: '2026-10-13', now }), /hash does not match/);
  assert.throws(() => validateDailyTipImport({ ...manifest, upload_id: '../escape' }, csv,
    { expectedDate: '2026-10-13', now }), /identity or hash is invalid/);
  assert.throws(() => validateDailyTipImport({ ...manifest, generated_at: '2026-10-14T20:00:00Z' }, csv,
    { expectedDate: '2026-10-13', now }), /future/);
  assert.throws(() => validateDailyTipImport({ ...manifest, generated_at: '2026-02-30T19:00:00Z' }, csv,
    { expectedDate: '2026-10-13', now }), /generated_at is invalid/);
  const malformed = Buffer.from(csv.toString('utf8').replace('Fixture Jockey,Fixture Trainer', 'Fixture Jockey'));
  const source_sha256 = (await import('node:crypto')).createHash('sha256').update(malformed).digest('hex');
  assert.throws(() => validateDailyTipImport({ ...manifest, source_sha256 }, malformed,
    { expectedDate: '2026-10-13', now }), /Invalid value-tips row/);
});

test('one immutable upload ID writes atomically and rejects a duplicate', async () => {
  const root = await mkdtemp(join(tmpdir(), 'everytip-daily-tip-test-'));
  try {
    const { manifest, csv } = await fixture();
    const snapshot = validateDailyTipImport(manifest, csv, { expectedDate: '2026-10-13', now });
    const path = await writeDailyTipImport(snapshot, root);
    assert.equal(JSON.parse(await readFile(path, 'utf8')).rowCount, 1);
    await assert.rejects(writeDailyTipImport(snapshot, root), /Duplicate daily-tip upload ID/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('CLI imports only into local artifacts and rejects replayed fixture ID', async () => {
  const root = await mkdtemp(join(tmpdir(), 'everytip-daily-tip-cli-'));
  try {
    const args = [resolve('scripts/import-daily-tips.mjs'), '--manifest', join(fixtureDir, 'valid.manifest.json'),
      '--csv', join(fixtureDir, 'valid.csv'), '--expected-date', '2026-10-13'];
    const first = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
    assert.equal(first.status, 0, first.stderr);
    const result = JSON.parse(first.stdout);
    assert.equal(result.status, 'validated-local-only');
    assert.ok(result.destination.startsWith(join(root, 'artifacts', 'daily-tip-imports')));
    const second = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
    assert.notEqual(second.status, 0);
    assert.match(second.stderr, /Duplicate daily-tip upload ID/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
