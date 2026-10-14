import { readFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = new URL('../', import.meta.url);
const snapshotDirectory = new URL('data/raw/', root);
const files = (await readdir(snapshotDirectory)).filter((name) => /^staging-wordpress-public-.*\.json$/.test(name)).sort();
if (!files.length) throw new Error('No staging snapshot found. Run npm run snapshot:wp first.');
const snapshot = JSON.parse(await readFile(new URL(files.at(-1), snapshotDirectory), 'utf8'));
const csv = await readFile(new URL('docs/everytip-template-map-2026-09-30.csv', root), 'utf8');
const dist = fileURLToPath(new URL('dist/', root));

function parseCsv(source) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (quoted) {
      if (char === '"' && source[i + 1] === '"') { value += '"'; i++; }
      else if (char === '"') quoted = false;
      else value += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(value); value = ''; }
    else if (char === '\n') { row.push(value); rows.push(row); row = []; value = ''; }
    else if (char !== '\r') value += char;
  }
  if (quoted) throw new Error('Unclosed quoted field in crawl CSV');
  if (value || row.length) { row.push(value); rows.push(row); }
  const [headers, ...data] = rows;
  return data.map((values, index) => {
    if (values.length !== headers.length) throw new Error(`Malformed crawl CSV row ${index + 2}`);
    return Object.fromEntries(headers.map((header, column) => [header, values[column]]));
  });
}

const crawl = parseCsv(csv);
const sourcePaths = new Set([...snapshot.posts, ...snapshot.pages].map((node) => node.uri));
const live200 = crawl.filter((row) => row.status_code === '200');
const missing = live200.filter((row) => !sourcePaths.has(row.path));
const assetPath = (row) => {
  const relative = row.path === '/' ? 'index.html'
    : row.path.endsWith('.html') ? row.path.slice(1)
    : `${row.path.replace(/^\/|\/$/g, '')}/index.html`;
  return join(dist, relative);
};
const built = live200.filter((row) => existsSync(assetPath(row)));
const missingAssets = live200.filter((row) => !existsSync(assetPath(row)));
const byTemplate = Object.fromEntries(
  [...new Set(missing.map((row) => row.suggested_template))].sort()
    .map((template) => [template, missing.filter((row) => row.suggested_template === template).length]),
);
console.log(JSON.stringify({
  snapshot: files.at(-1),
  live200: live200.length,
  matchingPostOrPageUri: live200.length - missing.length,
  exactBuiltAssets: built.length,
  missingBuiltAssets: live200.length - built.length,
  missingAssetPaths: missingAssets.map((row) => row.path),
  missingByTemplate: byTemplate,
  missingPaths: missing.map((row) => row.path),
  unroutable: snapshot.unroutable,
}, null, 2));
if (process.argv.includes('--strict') && built.length !== live200.length) process.exitCode = 1;
