import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { oct11ExtraPlacePath, oct11ExtraPlaceHeaders, oct11ExtraPlaceRows, oct11ExtraPlaceSource, verifyOct11ExtraPlaceSource } from '../src/lib/oct11-extra-place-preview.mjs';

test('11 October preview keeps its exact path and all seven five-column historical selections', () => {
  assert.equal(oct11ExtraPlacePath, '/extra-place-races-today-tips-11-october.html');
  assert.equal(oct11ExtraPlaceSource.id, 91076);
  assert.equal(oct11ExtraPlaceRows.length, 7);
  assert.equal(oct11ExtraPlaceHeaders.length, 5);
  assert.ok(oct11ExtraPlaceRows.every((row) => row.length === 5));
  assert.deepEqual(oct11ExtraPlaceRows[0], ['14:02', 'Chepstow', '4', '13', 'UGO BINGO (forecast 4/1)']);
  assert.deepEqual(oct11ExtraPlaceRows.at(-1), ['16:42', 'Goodwood', '4', '13', 'CRAZEE ICON (forecast 7/1)']);
});

test('11 October noindex preview is dated and contains no active betting links', async () => {
  const page = await readFile(new URL('../src/pages/extra-place-races-today-tips-11-october.html.astro', import.meta.url), 'utf8');
  assert.match(page, /noindex,nofollow/);
  assert.match(page, /Historical record, not today’s tips/);
  assert.match(page, /11 October 2026/);
  assert.match(page, /terms have not been independently verified/);
  assert.doesNotMatch(page, /<a\b|\/go\/|<button\b|\bSign up\b/i);
});

test('source lock fails closed on mismatched identity or body', () => {
  assert.throws(() => verifyOct11ExtraPlaceSource({ ...oct11ExtraPlaceSource, status: 'publish', link: `https://www.everytip.co.uk${oct11ExtraPlacePath}`, content: { rendered: '<p>changed</p>' } }), /identity\/hash/);
});
