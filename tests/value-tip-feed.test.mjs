import test from 'node:test';
import assert from 'node:assert/strict';
import { parseValueTipCsv, validateValueTipFeed } from '../src/lib/value-tip-feed.mjs';

const csv = 'Time,Course,Horse Name,Forecast SP,Jockey,Trainer,Tissue Value Price\n13:57,Kempton (AW),Example Runner,1.53,Example Jockey,Example Trainer,1.68\n14:32,Catterick,Another Runner,3.5,Other Jockey,Other Trainer,4.1\n';

test('CSV parser handles quoted commas without losing seven-column alignment', () => {
  assert.deepEqual(parseValueTipCsv('A,B\n"One, Two",Three\n'), [['A', 'B'], ['One, Two', 'Three']]);
});

test('verified dated feed maps all seven columns and the Kempton (AW) alias', () => {
  const all = validateValueTipFeed(csv, { feedDate: '2026-10-13', targetDate: '2026-10-13' });
  assert.equal(all.length, 2);
  assert.deepEqual(all[0], { published: '2026-10-13', time: '13:57', course: 'Kempton (AW)', courseId: 'kempton', horse: 'Example Runner', forecast: '1.53', jockey: 'Example Jockey', trainer: 'Example Trainer', tissue: '1.68' });
  assert.deepEqual(validateValueTipFeed(csv, { feedDate: '2026-10-13', targetDate: '2026-10-13', courseFilter: 'KEMPTON' }), [all[0]]);
});

test('missing, stale or fabricated fetch-date cannot substitute for trusted feed date', () => {
  assert.throws(() => validateValueTipFeed(csv, { targetDate: '2026-10-13' }), /date missing/);
  assert.throws(() => validateValueTipFeed(csv, { feedDate: '2026-10-12', targetDate: '2026-10-13' }), /stale/);
  assert.throws(() => validateValueTipFeed(csv, { feedDate: '2026-02-30', targetDate: '2026-02-30' }), /invalid/);
});

test('schema drift, unsupported filters and markup fail closed', () => {
  assert.throws(() => validateValueTipFeed(csv.replace('Forecast SP', 'Odds'), { feedDate: '2026-10-13', targetDate: '2026-10-13' }), /column contract/);
  assert.throws(() => validateValueTipFeed(csv, { feedDate: '2026-10-13', targetDate: '2026-10-13', courseFilter: 'BRIGHTON ' }), /Unverified/);
  assert.throws(() => validateValueTipFeed(csv.replace('Example Runner', '<b>Runner</b>'), { feedDate: '2026-10-13', targetDate: '2026-10-13' }), /Invalid value-tips row/);
});
