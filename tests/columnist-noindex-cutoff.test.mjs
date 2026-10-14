import test from 'node:test';
import assert from 'node:assert/strict';
import { columnistNoindexCutoff } from '../src/lib/columnist-noindex-cutoff.mjs';

test('uses the rolling Europe/Rome 12-month publication cutoff', () => {
  assert.equal(columnistNoindexCutoff(new Date('2026-10-13T20:00:00Z')), '2025-10-13');
  assert.equal(columnistNoindexCutoff(new Date('2026-10-13T22:10:00Z')), '2025-10-14');
  assert.equal(columnistNoindexCutoff(new Date('2028-02-29T12:00:00Z')), '2027-02-28');
});
