import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const rawDirectory = fileURLToPath(new URL('../data/raw/', import.meta.url));
const snapshots = (await readdir(rawDirectory))
  .filter((name) => /^staging-wordpress-public-.*\.json$/.test(name))
  .sort();
const latest = snapshots.at(-1);
if (!latest) throw new Error('No staging WordPress snapshot found; run npm run snapshot:wp first.');

const snapshot = JSON.parse(await readFile(new URL(`../data/raw/${latest}`, import.meta.url), 'utf8'));
const records = [
  ...snapshot.posts.map((node) => ({ ...node, type: 'post' })),
  ...snapshot.pages.map((node) => ({ ...node, type: 'page' })),
];

const inspect = (record) => {
  const html = record.content ?? '';
  const flags = {
    empty: !html.trim(),
    beaver: /\bfl-builder\b|\bfl-row\b|\bfl-col\b/i.test(html),
    thrive: /\btve_[\w-]+\b|\bthrv_[\w-]+\b/i.test(html),
    shortcode: /\[(?:ninja_tables|adinserter|su_|vc_|et_|fl_builder|thrive_)[^\]]*\]/i.test(html),
    activeEmbed: /<\s*(?:script|iframe|form)\b/i.test(html),
    stagingHost: /wordpress-159231-2098144\.cloudwaysapps\.com/i.test(html),
  };
  return { type: record.type, uri: record.uri, length: html.length, flags };
};

const rows = records.map(inspect);
const count = (key, type) => rows.filter((row) => (!type || row.type === type) && row.flags[key]).length;
const focusPaths = [
  '/value-bet-tips-dark-horses.html',
  '/racecourses/kempton-racing-tips',
  '/best-paypal-betting-sites.html',
  '/bet365-review',
  '/free-betting-tips',
  '/bookie-free-bets-bonus-offers',
];

console.log(`Snapshot: ${latest}`);
console.log(`Records: ${rows.length} (${snapshot.posts.length} posts, ${snapshot.pages.length} pages)`);
for (const key of ['empty', 'beaver', 'thrive', 'shortcode', 'activeEmbed', 'stagingHost']) {
  console.log(`${key}: ${count(key)} total (${count(key, 'post')} posts, ${count(key, 'page')} pages)`);
}
console.log('Priority examples:');
for (const uri of focusPaths) {
  const row = rows.find((item) => item.uri === uri);
  console.log(JSON.stringify(row ?? { uri, missingFromSnapshot: true }));
}
