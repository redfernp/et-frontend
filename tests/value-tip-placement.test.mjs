import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validateDailyTipImport } from '../src/lib/daily-tip-import.mjs';
import { splitTipTableReferences } from '../src/lib/tip-table-reference.mjs';
import { resolveValueTipPlacement } from '../src/lib/value-tip-placement.mjs';

const now = new Date('2026-10-13T20:00:00Z');
const manifest = JSON.parse(await readFile(resolve('tests/fixtures/daily-tip-import/valid.manifest.json'), 'utf8'));
const csv = await readFile(resolve('tests/fixtures/daily-tip-import/valid.csv'));
const snapshot = validateDailyTipImport(manifest, csv, { expectedDate: '2026-10-13', now });
const marker = (filter = '') => `<div data-everytip-tip-table-id="72501"${filter ? ` data-everytip-tip-table-filter="${filter}"` : ''}></div>`;
const reference = (filter = '') => splitTipTableReferences(marker(filter), { allowedTableIds: [72501, 86633] })[0];

test('ACF Dark Horse reference maps all seven dated source columns without copying Ninja rows', () => {
  const result = resolveValueTipPlacement({ path: '/value-bet-tips-dark-horses.html', reference: reference(), snapshot, now });
  assert.equal(result.tableId, 72501);
  assert.equal(result.filter, null);
  assert.equal(result.feedDate, '2026-10-13');
  assert.deepEqual(result.rows[0], { published: '2026-10-13', time: '13:57', course: 'Kempton (AW)', courseId: 'kempton', horse: 'Fixture Runner', forecast: '1.53', jockey: 'Fixture Jockey', trainer: 'Fixture Trainer', tissue: '1.68' });
});

test('Kempton ACF filter preserves exact marker semantics and course alias', () => {
  const result = resolveValueTipPlacement({ path: '/racecourses/kempton-racing-tips', reference: reference('KEMPTON'), snapshot, now });
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].courseId, 'kempton');
  assert.equal(result.emptyCourse, false);
  const catterickOnly = { ...snapshot, rowCount: 1, rows: [{ ...snapshot.rows[0], course: 'Catterick', courseId: 'catterick' }] };
  assert.equal(resolveValueTipPlacement({ path: '/racecourses/kempton-racing-tips', reference: reference('KEMPTON'), snapshot: catterickOnly, now })?.emptyCourse, true);
});

test('missing or stale dated upload fails closed; wrong table/filter cannot borrow 72501 rows', () => {
  assert.equal(resolveValueTipPlacement({ path: '/value-bet-tips-dark-horses.html', reference: reference(), snapshot: null, now }), null);
  assert.equal(resolveValueTipPlacement({ path: '/value-bet-tips-dark-horses.html', reference: reference(), snapshot, now: new Date('2026-10-14T08:00:00Z') }), null);
  assert.throws(() => resolveValueTipPlacement({ path: '/racecourses/kempton-racing-tips', reference: reference(), snapshot, now }), /reference does not match/);
  assert.throws(() => resolveValueTipPlacement({ path: '/racecourses/kempton-racing-tips', reference: reference('KEMPTON '), snapshot, now }), /reference does not match/);
  assert.throws(() => resolveValueTipPlacement({ path: '/value-bet-tips-dark-horses.html', reference: { type: 'tip-table-reference', tableId: 86633, filter: null }, snapshot, now }), /reference does not match/);
});
