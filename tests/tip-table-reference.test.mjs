import test from 'node:test';
import assert from 'node:assert/strict';
import { splitTipTableReferences } from '../src/lib/tip-table-reference.mjs';

const allowedTableIds = [72501, 86633];
const split = (html) => splitTipTableReferences(html, { allowedTableIds });

test('keeps prose in order and preserves exact table ID/filter without rows', () => {
  assert.deepEqual(split('<p>Before</p><div data-everytip-tip-table-id="72501" data-everytip-tip-table-filter="KEMPTON"></div><p>After</p>'), [
    { type: 'html', html: '<p>Before</p>' },
    { type: 'tip-table-reference', tableId: 72501, filter: 'KEMPTON' },
    { type: 'html', html: '<p>After</p>' },
  ]);
});

test('preserves entity-decoded filter value and meaningful trailing whitespace', () => {
  assert.deepEqual(split('<div data-everytip-tip-table-id="86633" data-everytip-tip-table-filter="BRIGHTON &amp; HOVE "></div>'), [
    { type: 'tip-table-reference', tableId: 86633, filter: 'BRIGHTON & HOVE ' },
  ]);
});

test('unfiltered reference does not invent a filter', () => {
  assert.deepEqual(split('<div data-everytip-tip-table-id="72501"></div>'), [
    { type: 'tip-table-reference', tableId: 72501, filter: null },
  ]);
});

test('rejects unknown IDs and malformed markers rather than showing stale content', () => {
  assert.throws(() => split('<div data-everytip-tip-table-id="99999"></div>'), /Unapproved/);
  assert.throws(() => split('<div data-everytip-tip-table-id="72501" data-extra="x"></div>'), /Malformed/);
  assert.throws(() => split('<div data-everytip-tip-table-id="72501">copied row</div>'), /Malformed/);
  assert.throws(() => split('<div data-everytip-tip-table-filter="KEMPTON"></div>'), /Malformed/);
});

test('ordinary historical Ninja markup is not promoted to a reference', () => {
  const html = '<table><tr><td>Old tip</td></tr></table>';
  assert.deepEqual(split(html), [{ type: 'html', html }]);
});
