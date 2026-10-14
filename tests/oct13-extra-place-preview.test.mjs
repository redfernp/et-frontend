import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { extractOct13ExtraPlacePreview, oct13ExtraPlacePath } from '../src/lib/oct13-extra-place-preview.mjs';

const fixture = JSON.parse(await readFile(resolve('data/source-locked/extra-place-races-2026-10-13.json'), 'utf8'));

test('13 October source stays exact-path, dated, source-locked and table-complete', () => {
  const preview = extractOct13ExtraPlacePreview(fixture);
  assert.equal(preview.path, oct13ExtraPlacePath);
  assert.equal(preview.date, '13 October 2026');
  assert.equal(preview.rows.length, 8);
  assert.deepEqual(preview.headers, ['Time', 'Course', 'Places (1/5 odds)', 'Paying', 'Runners', 'Our tip']);
  assert.deepEqual(preview.rows.map((row) => row.length), Array(8).fill(6));
  assert.deepEqual(preview.rows.map((row) => row[2]), ['5', '5', '5', '5', '5', '5', '4', '4']);
  assert.deepEqual(preview.rows[0], ['15:20', 'Punchestown', '5', 'Betfred, QuinnBet', '18', 'LIVE TO LAUGH (7/2)']);
  assert.deepEqual(preview.rows[7], ['20:00', 'Wolverhampton', '4', 'QuinnBet', '11', 'COXY’S STAR (forecast 7/2)']);
});

test('archival preview withholds offer CTAs, live links, instructions and current-day language', () => {
  const preview = extractOct13ExtraPlacePreview(fixture);
  const html = preview.introHtml + preview.afterHtml;
  assert.doesNotMatch(html, /<a\b|\/go\/|\btoday\b|\bthis morning\b/i);
  assert.doesNotMatch(html, /See Betfred|Bet each way|How it works|Key terms|Back your horse/i);
  assert.match(html, /13 October 2026/);
  assert.match(html, /Where the extra place helps most/);
});

test('changed body, identity, or table rejects rather than silently importing', () => {
  assert.throws(() => extractOct13ExtraPlacePreview({ ...fixture, slug: 'wrong' }), /identity\/hash/);
  assert.throws(() => extractOct13ExtraPlacePreview({ ...fixture, content: fixture.content.replace('LIVE TO LAUGH', 'OTHER HORSE') }), /identity\/hash/);
  assert.throws(() => extractOct13ExtraPlacePreview({ ...fixture, hash: '0'.repeat(64) }), /identity\/hash/);
});
