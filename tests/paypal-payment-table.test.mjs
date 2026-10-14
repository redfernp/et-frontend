import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { splitPayPalPaymentTable } from '../src/lib/paypal-payment-table.mjs';

test('PayPal payment table preserves every source row and all nine columns', async () => {
  const fixture = JSON.parse(await readFile(new URL('../data/raw/staging-paypal-roundup-gutenberg.json', import.meta.url), 'utf8'));
  const pieces = splitPayPalPaymentTable(fixture.content);
  const tables = pieces.filter((piece) => piece.type === 'payment-table');
  assert.equal(tables.length, 1);
  assert.equal(tables[0].headers.length, 9);
  assert.equal(tables[0].rows.length, 37);
  assert.ok(tables[0].rows.every((row) => row.length === 9));
  assert.equal(tables[0].rows[0][0], 'Bet365');
});
