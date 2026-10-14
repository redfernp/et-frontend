import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseDocument } from 'htmlparser2';
import { previewHtml } from './migration-preview.mjs';

export const oct13ExtraPlacePath = '/extra-place-races-today-tips-13-october.html';
const fixturePath = resolve(process.cwd(), 'data/source-locked/extra-place-races-2026-10-13.json');
const sourceHash = '7699fae416138f83f5b5df0b87d3f52ef2e49cb69809ce85a3b446672c716772';
const headers = ['Time', 'Course', 'Places (1/5 odds)', 'Paying', 'Runners', 'Our tip'];

function visit(node, fn) {
  fn(node);
  for (const child of node.children ?? []) visit(child, fn);
}
function textOf(node) {
  if (node.type === 'text') return node.data;
  return (node.children ?? []).map(textOf).join('');
}
function historical(html) {
  return html.replace(/Today(?:&#8217;|’|')s extra place races/gi, 'Extra place races on 13 October 2026')
    .replace(/Today(?:&#8217;|’|')s money back race/gi, 'The money-back race on 13 October 2026')
    .replace(/\btoday\b/gi, 'on 13 October 2026')
    .replace(/this morning(?:&#8217;|’|')s racecards/gi, 'the racecards for that date')
    .replace(/this evening/gi, 'that evening')
    .replace('Betfred is paying', 'Betfred was listed as paying')
    .replace('QuinnBet matches it', 'QuinnBet was listed as matching it')
    .replace('Add two races at Wolverhampton', 'The article also listed two races at Wolverhampton')
    .replace('and that is 8 extra place races, with our tip for every one.', 'for eight archived selections in total.')
    .replace('has the biggest gap on our model', 'had the biggest gap on our model')
    .replace('David Allan rides', 'David Allan was listed to ride')
    .replace('Betfred and QuinnBet pay 5 places', 'Betfred and QuinnBet were listed as paying 5 places')
    .replace('HUNGARIAN (16:47 Leicester) is', 'HUNGARIAN (16:47 Leicester) was')
    .replace('has exactly 12 runners', 'had exactly 12 runners')
    .replace('has only 11 runners', 'had only 11 runners')
    .replace('QuinnBet still lists it', 'QuinnBet listed it')
    .replace('Betfred’s standard place terms apply there', 'Betfred’s standard place terms were described as applying there')
    .replace('Check the place terms before you bet.', 'The original article advised readers to check the place terms.');
}

export function extractOct13ExtraPlacePreview(source) {
  if (source?.id !== 91113 || source.slug !== 'extra-place-races-today-tips-13-october' ||
      source.date !== '2026-10-13T08:41:03' || source.modified !== source.date ||
      source.hash !== sourceHash || typeof source.content !== 'string' ||
      createHash('sha256').update(source.content).digest('hex') !== sourceHash) {
    throw new Error('13 October extra-place source identity/hash changed');
  }
  if (/\[(?:ninja_tables|ninja_table)\b|\bfl-builder\b|\btve_[\w-]+\b/i.test(source.content)) {
    throw new Error('Unexpected builder or Ninja shortcode in locked source');
  }
  const tableMatches = [...source.content.matchAll(/<table>[\s\S]*?<\/table>/g)];
  if (tableMatches.length !== 1) throw new Error('Expected one historical source table');
  const document = parseDocument(tableMatches[0][0], { decodeEntities: true });
  const rowNodes = [];
  visit(document, (node) => { if (node.name === 'tr') rowNodes.push(node); });
  const cells = rowNodes.map((node) => (node.children ?? [])
    .filter((cell) => cell.name === 'th' || cell.name === 'td')
    .map((cell) => textOf(cell).replace(/\s+/g, ' ').trim()));
  if (cells.length !== 9 || JSON.stringify(cells[0]) !== JSON.stringify(headers) ||
      cells.slice(1).some((row) => row.length !== 6) ||
      cells.slice(1).filter((row) => row[2] === '5').length !== 6 ||
      cells.slice(1).filter((row) => row[2] === '4').length !== 2) {
    throw new Error('Historical extra-place table shape changed');
  }
  const [beforeTable, afterTable] = source.content.split(tableMatches[0][0]);
  if (!afterTable.includes('<h2>How it works</h2>')) throw new Error('Expected historical offer-terms boundary');
  const historicalAnalysis = afterTable.split('<p>Today&#8217;s money back race')[0];
  if (!historicalAnalysis.includes('<h2>Where the extra place helps most</h2>')) throw new Error('Missing historical analysis section');
  const ctaPattern = /<p class="et-cta">[\s\S]*?<\/p>/g;
  const ctaCount = [...source.content.matchAll(ctaPattern)].length;
  if (ctaCount !== 3) throw new Error('Unexpected number of source offer CTAs');
  const inert = (content) => historical(previewHtml({ uri: oct13ExtraPlacePath, content: content.replace(ctaPattern, '') }));
  const introHtml = inert(beforeTable);
  const afterHtml = inert(historicalAnalysis);
  if (/<a\b|\/go\//i.test(introHtml + afterHtml)) throw new Error('Commercial link survived sanitization');
  return { id: source.id, slug: source.slug, path: oct13ExtraPlacePath, date: '13 October 2026',
    introHtml, afterHtml, headers, rows: cells.slice(1), sourceHash };
}

export async function readOct13ExtraPlacePreview() {
  return extractOct13ExtraPlacePreview(JSON.parse(await readFile(fixturePath, 'utf8')));
}
