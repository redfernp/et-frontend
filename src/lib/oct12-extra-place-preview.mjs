import { createHash } from 'node:crypto';
import { parseDocument, DomUtils } from 'htmlparser2';

export const oct12ExtraPlacePath = '/extra-place-races-today-tips-12-october.html';
export const oct12ExtraPlaceSource = Object.freeze({
  id: 91093,
  slug: 'extra-place-races-today-tips-12-october',
  date: '2026-10-12T08:51:28',
  modified: '2026-10-12T08:51:28',
  sha256: '346eb44ec32f7fe703ed468a34ee7bdfebfc7e37dcc131a87212f643df54a4a6',
});
export const oct12ExtraPlaceHeaders = Object.freeze(['Time', 'Course', 'Places (1/5 odds)', 'Paying', 'Runners', 'Our tip']);
export const oct12ExtraPlaceRows = Object.freeze([
  ['14:00', 'Roscommon', '4', 'Betfred, QuinnBet', '16', 'LA LA LUCRATIVE (5/1)'],
  ['14:30', 'Roscommon', '4', 'Betfred, QuinnBet', '14', 'ALEX BELARDO (13/2)'],
  ['15:00', 'Roscommon', '4', 'Betfred, QuinnBet', '14', 'MOGWLI (8/1)'],
  ['15:17', 'Musselburgh', '4', 'Betfred, QuinnBet', '14', 'SKI ANGEL (forecast 6/1)'],
  ['15:24', 'Yarmouth', '4', 'Betfred, QuinnBet', '12', 'DARKEST RED (forecast 9/2)'],
  ['15:47', 'Musselburgh', '3', 'Betfred', '7', 'ICE SOVEREIGNS (forecast 10/1)'],
  ['16:24', 'Yarmouth', '4', 'Betfred', '13', 'RAFFLES ANGEL (forecast 11/2)'],
  ['16:30', 'Roscommon', '5', 'Betfred', '18', 'LAUDERDALE KING (4/1)'],
  ['17:07', 'Roscommon', '5', 'Betfred', '19', 'BALLAGHKEEN (9/2)'],
  ['18:30', 'Newcastle', '4', 'Betfred', '13', 'MAE AMOR (forecast 7/2)'],
  ['18:45', 'Kempton', '4', 'Betfred, QuinnBet', '14', 'FANTASTIC FOX (forecast 9/2)'],
  ['19:30', 'Newcastle', '4', 'Betfred, QuinnBet', '14', 'WHISKEY PETE (forecast 13/2)'],
  ['20:00', 'Newcastle', '4', 'Betfred', '13', 'SPARTAN FIGHTER (forecast 3/1)'],
  ['20:30', 'Newcastle', '4', 'Betfred', '13', 'PHOENIX BEACH (forecast 7/1)'],
].map((row) => Object.freeze(row)));

const originalAnalysis = [
  'ICE SOVEREIGNS in the 15:47 at Musselburgh has the biggest gap on our model today: forecast at 10/1, against our tissue price of 2.87.',
  'RAFFLES ANGEL (16:24 Yarmouth, forecast 11/2, tissue 2.98) and FANTASTIC FOX (18:45 Kempton, forecast 9/2, tissue 2.88) are the other big value calls.',
];

/** Read-only source check. A changed live post must be re-reviewed, not silently imported. */
export function verifyOct12ExtraPlaceSource(post) {
  const actualHash = createHash('sha256').update(post?.content?.rendered ?? '').digest('hex');
  if (post?.id !== oct12ExtraPlaceSource.id || post.status !== 'publish' ||
      post.slug !== oct12ExtraPlaceSource.slug || post.date !== oct12ExtraPlaceSource.date ||
      post.modified !== oct12ExtraPlaceSource.modified || actualHash !== oct12ExtraPlaceSource.sha256 ||
      new URL(post.link).pathname !== oct12ExtraPlacePath) {
    throw new Error('12 October extra-place source identity/hash changed');
  }
  const content = post.content.rendered;
  if (/\[(?:ninja_tables|ninja_table)\b|\bfl-builder\b|\btve_[\w-]+\b/i.test(content)) {
    throw new Error('Unexpected builder or Ninja shortcode in 12 October source');
  }
  const doc = parseDocument(content, { decodeEntities: true });
  const tables = DomUtils.findAll((node) => node.name === 'table', doc.children, true);
  if (tables.length !== 1) throw new Error('Expected exactly one historical selection table');
  const tr = DomUtils.findAll((node) => node.name === 'tr', tables[0].children, true);
  const rows = tr.map((node) => (node.children ?? [])
    .filter((cell) => cell.name === 'th' || cell.name === 'td')
    .map((cell) => DomUtils.textContent(cell).replace(/\s+/g, ' ').trim()));
  if (JSON.stringify(rows) !== JSON.stringify([oct12ExtraPlaceHeaders, ...oct12ExtraPlaceRows])) {
    throw new Error('12 October historical table differs from reviewed rows');
  }
  for (const phrase of originalAnalysis) if (!content.includes(phrase)) {
    throw new Error('12 October historical analysis changed');
  }
  const ctaCount = (content.match(/<p class="et-cta">/g) ?? []).length;
  if (ctaCount !== 3) throw new Error('12 October CTA count changed');
  return { id: post.id, path: oct12ExtraPlacePath, rows: rows.length - 1, sha256: actualHash };
}
