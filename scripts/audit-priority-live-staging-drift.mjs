// Read-only comparison of the named live and staging WordPress content records.
// It reports identity, dates and visible-text hashes, never article or offer copy.
import { createHash } from 'node:crypto';
import { parseDocument } from 'htmlparser2';

const origins = {
  live: 'https://www.everytip.co.uk',
  staging: 'https://wordpress-159231-2098144.cloudwaysapps.com',
};
const records = [
  [16, 'pages', '/'], [76939, 'pages', '/free-betting-tips'],
  [56315, 'pages', '/bookie-free-bets-bonus-offers'], [87553, 'pages', '/bet365-review'],
  [58743, 'posts', '/best-paypal-betting-sites.html'],
  [33470, 'posts', '/low-or-no-minimum-deposit-betting-sites.html'],
  [72421, 'posts', '/value-bet-tips-dark-horses.html'],
  [45270, 'pages', '/racecourses/kempton-racing-tips'],
  [41881, 'pages', '/free-horse-racing-tips'],
  [70281, 'pages', '/safer-gambling'], [61, 'pages', '/terms-conditions'],
  [6376, 'pages', '/privacy-policy'], [23888, 'pages', '/saturday-horse-racing-tips'],
  [24016, 'pages', '/english-premier-league-predictions-for-saturday'],
];
const visibleText = (html) => {
  const walk = (node) => node.type === 'text' ? node.data :
    node.name === 'br' ? ' ' : (node.children ?? []).map(walk).join('');
  return parseDocument(html ?? '', { decodeEntities: true }).children.map(walk).join('')
    .replace(/\s+/g, ' ').trim();
};
const digest = (text) => createHash('sha256').update(text).digest('hex').slice(0, 16);
async function readRecord(origin, type, id) {
  const url = new URL(`/wp-json/wp/v2/${type}/${id}?_fields=id,slug,status,modified,link,content.rendered`, origin);
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const item = await response.json();
  if (item.id !== id || item.status !== 'publish' || typeof item.content?.rendered !== 'string') {
    throw new Error('identity/status/content mismatch');
  }
  const text = visibleText(item.content.rendered);
  return { slug: item.slug, modified: item.modified, textLength: text.length, textHash: digest(text) };
}

const results = [];
for (const [id, type, path] of records) {
  const row = { id, path, type };
  for (const [environment, origin] of Object.entries(origins)) {
    try { row[environment] = await readRecord(origin, type, id); }
    catch (error) { row[environment] = { error: String(error.message ?? error) }; }
  }
  row.sameVisibleText = !!row.live.textHash && row.live.textHash === row.staging.textHash;
  row.sameModified = !!row.live.modified && row.live.modified === row.staging.modified;
  results.push(row);
}
console.log(JSON.stringify({ auditedAt: new Date().toISOString(), readOnly: true, records: results,
  summary: { total: results.length,
    identicalVisibleText: results.filter((row) => row.sameVisibleText).length,
    sameModified: results.filter((row) => row.sameModified).length,
    readErrors: results.filter((row) => row.live.error || row.staging.error).length } }, null, 2));
