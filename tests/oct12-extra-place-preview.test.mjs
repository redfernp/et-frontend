import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { oct12ExtraPlacePath, oct12ExtraPlaceHeaders, oct12ExtraPlaceRows, oct12ExtraPlaceSource, verifyOct12ExtraPlaceSource } from '../src/lib/oct12-extra-place-preview.mjs';

test('12 October preview keeps its exact path and all fourteen six-column historical selections', () => {
  assert.equal(oct12ExtraPlacePath, '/extra-place-races-today-tips-12-october.html');
  assert.equal(oct12ExtraPlaceSource.id, 91093);
  assert.equal(oct12ExtraPlaceRows.length, 14);
  assert.equal(oct12ExtraPlaceHeaders.length, 6);
  assert.ok(oct12ExtraPlaceRows.every((row) => row.length === 6));
  assert.deepEqual(oct12ExtraPlaceRows[0], ['14:00', 'Roscommon', '4', 'Betfred, QuinnBet', '16', 'LA LA LUCRATIVE (5/1)']);
  assert.deepEqual(oct12ExtraPlaceRows.at(-1), ['20:30', 'Newcastle', '4', 'Betfred', '13', 'PHOENIX BEACH (forecast 7/1)']);
});

test('12 October noindex preview is dated and contains no active betting links or current-day framing', async () => {
  const page = await readFile(new URL('../src/pages/extra-place-races-today-tips-12-october.html.astro', import.meta.url), 'utf8');
  assert.match(page, /noindex,nofollow/);
  assert.match(page, /Historical record, not today’s tips/);
  assert.match(page, /12 October 2026/);
  assert.match(page, /terms have not been independently verified/);
  assert.doesNotMatch(page, /<a\b|\/go\/|<button\b|\bSign up\b/i);
});

test('source lock fails closed on mismatched identity or body', () => {
  assert.throws(() => verifyOct12ExtraPlaceSource({ ...oct12ExtraPlaceSource, status: 'publish', link: `https://www.everytip.co.uk${oct12ExtraPlacePath}`, content: { rendered: '<p>changed</p>' } }), /identity\/hash/);
});
