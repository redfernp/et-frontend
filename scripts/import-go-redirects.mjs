// Import the cloaked affiliate links from WordPress's /go/redirects.txt (slug,destination per
// line, read by /go/index.php) into data/affiliate-redirects.json, which the worker serves.
// Read-only: one GET of the text file, partner links are never visited.
// Usage: node scripts/import-go-redirects.mjs [source-url]
import { readFile, writeFile } from 'node:fs/promises';

const source = process.argv[2] ?? 'https://www.everytip.co.uk/go/redirects.txt';
const response = await fetch(source, { signal: AbortSignal.timeout(30000) });
if (!response.ok) throw new Error(`${source}: ${response.status}`);
const lines = (await response.text()).split(/\r?\n/);

// A few long ClickBank links are wrapped onto a second line that starts with "&". Join them
// back on, so /go/the-source etc. keep their vendor parameters.
const entries = [];
for (const line of lines) {
  const value = line.trim();
  if (!value) continue;
  if (value.startsWith('&') && entries.length) { entries.at(-1).location += value; continue; }
  const comma = value.indexOf(',');
  if (comma < 1) { console.warn(`Skipped: ${value}`); continue; }
  entries.push({ slug: value.slice(0, comma).trim(), location: value.slice(comma + 1).trim() });
}

const current = JSON.parse(await readFile('data/affiliate-redirects.json', 'utf8')).redirects;
const redirects = { ...current };
const changed = [];
const added = [];
for (const { slug, location } of entries) {
  // "default" is index.php's fallback for unknown slugs, not a link.
  if (slug === 'default') continue;
  if (!/^[a-z0-9][a-z0-9&=_.-]*$/i.test(slug)) { console.warn(`Skipped slug: ${slug}`); continue; }
  if (!/^https?:\/\//.test(location)) { console.warn(`Skipped ${slug}: ${location}`); continue; }
  const path = `/go/${slug}`;
  if (!redirects[path]) added.push(path);
  else if (redirects[path].location !== location) changed.push(path);
  redirects[path] = { status: 302, location };
}
const sorted = Object.fromEntries(Object.keys(redirects).sort().map((key) => [key, redirects[key]]));
await writeFile('data/affiliate-redirects.json', JSON.stringify({ checkedAt: new Date().toISOString(), source, redirects: sorted }, null, 2) + '\n');
console.log(JSON.stringify({ source, inFile: entries.length, total: Object.keys(sorted).length, added: added.length, changed }));
