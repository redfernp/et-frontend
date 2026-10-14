import { createHash } from 'node:crypto';
import { parseDocument, DomUtils } from 'htmlparser2';

export const oct11ExtraPlacePath = '/extra-place-races-today-tips-11-october.html';
export const oct11ExtraPlaceSource = Object.freeze({
  id: 91076,
  slug: 'extra-place-races-today-tips-11-october',
  date: '2026-10-11T07:36:47',
  modified: '2026-10-11T07:36:47',
  sha256: '585c991d1ad0853295fc9ff4a6a228530631809d45a804b1438b91552d6a27ee',
});
export const oct11ExtraPlaceHeaders = Object.freeze(['Time', 'Course', 'Places (1/5 odds)', 'Runners', 'Our tip']);
export const oct11ExtraPlaceRows = Object.freeze([
  ['14:02', 'Chepstow', '4', '13', 'UGO BINGO (forecast 4/1)'],
  ['15:05', 'Naas', '4', '16', 'PRINCESS CHILD (4/1)'],
  ['15:12', 'Chepstow', '4', '12', 'HARBOUR LIGHT (forecast 2/1)'],
  ['15:32', 'Goodwood', '4', '14', 'FROM THE HIP (forecast 12/1)'],
  ['15:40', 'Naas', '4', '16', 'BESET (7/4)'],
  ['16:15', 'Naas', '5', '18', 'HELVIC DREAM (16/1)'],
  ['16:42', 'Goodwood', '4', '13', 'CRAZEE ICON (forecast 7/1)'],
].map((row) => Object.freeze(row)));

const analysisPhrase = 'FROM THE HIP in the 15:32 at Goodwood has the biggest gap on our model today: forecast at 12/1, against our tissue price of 4.85.';

/** Read-only source check; changed live copy must be re-reviewed. */
export function verifyOct11ExtraPlaceSource(post) {
  const actualHash = createHash('sha256').update(post?.content?.rendered ?? '').digest('hex');
  if (post?.id !== oct11ExtraPlaceSource.id || post.status !== 'publish' ||
      post.slug !== oct11ExtraPlaceSource.slug || post.date !== oct11ExtraPlaceSource.date ||
      post.modified !== oct11ExtraPlaceSource.modified || actualHash !== oct11ExtraPlaceSource.sha256 ||
      new URL(post.link).pathname !== oct11ExtraPlacePath) {
    throw new Error('11 October extra-place source identity/hash changed');
  }
  const content = post.content.rendered;
  if (/\[(?:ninja_tables|ninja_table)\b|\bfl-builder\b|\btve_[\w-]+\b/i.test(content)) {
    throw new Error('Unexpected builder or Ninja shortcode in 11 October source');
  }
  const doc = parseDocument(content, { decodeEntities: true });
  const tables = DomUtils.findAll((node) => node.name === 'table', doc.children, true);
  if (tables.length !== 1) throw new Error('Expected exactly one historical selection table');
  const tr = DomUtils.findAll((node) => node.name === 'tr', tables[0].children, true);
  const rows = tr.map((node) => (node.children ?? [])
    .filter((cell) => cell.name === 'th' || cell.name === 'td')
    .map((cell) => DomUtils.textContent(cell).replace(/\s+/g, ' ').trim()));
  if (JSON.stringify(rows) !== JSON.stringify([oct11ExtraPlaceHeaders, ...oct11ExtraPlaceRows])) {
    throw new Error('11 October historical table differs from reviewed rows');
  }
  if (!content.includes(analysisPhrase) || (content.match(/<p class="et-cta">/g) ?? []).length !== 2) {
    throw new Error('11 October editorial analysis or CTA positions changed');
  }
  return { id: post.id, path: oct11ExtraPlacePath, rows: rows.length - 1, sha256: actualHash };
}
