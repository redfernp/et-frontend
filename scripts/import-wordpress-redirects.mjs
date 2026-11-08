// Import the Redirection plugin's 301 list from live WordPress into data/wordpress-redirects.json.
// Since cutover the Astro worker serves public pages, so WordPress's own redirects never run;
// src/lib/legacy-redirects.mjs serves these instead. Read-only: GETs the plugin's REST list.
// Usage: node scripts/import-wordpress-redirects.mjs [path/to/.wp-articles.env]
import { readFile, writeFile } from 'node:fs/promises';

const envFile = process.argv[2] ?? '../.wp-articles.env';
const env = Object.fromEntries((await readFile(envFile, 'utf8')).split(/\r?\n/)
  .filter((line) => line.includes('=') && !line.startsWith('#'))
  .map((line) => [line.slice(0, line.indexOf('=')).trim(), line.slice(line.indexOf('=') + 1).trim()]));
const base = env.WP_BASE_URL.replace(/\/$/, '');
const auth = `Basic ${Buffer.from(`${env.WP_USERNAME}:${env.WP_APP_PASSWORD}`).toString('base64')}`;

const items = [];
for (let page = 0; ; page++) {
  const response = await fetch(`${base}/wp-json/redirection/v1/redirect?per_page=200&page=${page}`, { headers: { authorization: auth }, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Redirection list: ${response.status}`);
  const data = await response.json();
  items.push(...data.items);
  if (!data.items.length || items.length >= Number(data.total)) break;
}

const redirects = {};
const skipped = [];
for (const item of items) {
  const target = item.action_data?.url ?? '';
  // Only plain enabled URL-to-URL redirects; regex or conditional rules need hand porting.
  if (!item.enabled || item.regex || item.match_type !== 'url' || item.action_type !== 'url' || ![301, 308].includes(item.action_code)) { skipped.push(item.url); continue; }
  const source = item.url.split('?')[0];
  const location = target.replace(/^https?:\/\/(?:www\.)?everytip\.co\.uk(?=\/)/, '');
  if (!source.startsWith('/') || !location.startsWith('/')) { skipped.push(item.url); continue; }
  if (redirects[source] && redirects[source] !== location) throw new Error(`Conflicting redirects for ${source}`);
  redirects[source] = location;
}
const sorted = Object.fromEntries(Object.keys(redirects).sort().map((key) => [key, redirects[key]]));
await writeFile('data/wordpress-redirects.json', JSON.stringify({ checkedAt: new Date().toISOString(), source: 'WordPress Redirection plugin', redirects: sorted }, null, 2) + '\n');
console.log(JSON.stringify({ items: items.length, redirects: Object.keys(sorted).length, skipped }));
