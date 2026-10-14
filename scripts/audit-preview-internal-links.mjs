// Read-only static link audit for the public noindex preview package.
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

const root = resolve('preview-dist');
const previewHost = 'everytip-review-everytip-astro-preview.jpredfern1979.workers.dev';
const htmlFiles = [];
async function collect(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) await collect(path);
    else if (entry.name.endsWith('.html')) htmlFiles.push(path);
  }
}
await collect(root);
if (htmlFiles.length < 1000) throw new Error('Preview package is missing or unexpectedly small');

const broken = new Map();
let internalLinks = 0;
for (const source of htmlFiles) {
  const html = await readFile(source, 'utf8');
  for (const [, raw] of html.matchAll(/\bhref=["']([^"']+)["']/gi)) {
    if (raw.startsWith('#') || raw.startsWith('mailto:') || raw.startsWith('tel:')) continue;
    let url;
    try { url = new URL(raw, `https://${previewHost}/`); } catch { continue; }
    if (url.hostname !== previewHost) continue;
    internalLinks++;
    let path;
    try { path = decodeURIComponent(url.pathname); } catch { path = url.pathname; }
    if (path.includes('..') || path.includes('\\')) continue;
    const candidate = path === '/' ? join(root, 'index.html')
      : /\.[a-z0-9]+$/i.test(path) ? join(root, path.slice(1))
      : join(root, path.slice(1), 'index.html');
    if (existsSync(candidate)) continue;
    const item = broken.get(path) ?? { count: 0, examples: [] };
    item.count++;
    if (item.examples.length < 3) item.examples.push(relative(root, source));
    broken.set(path, item);
  }
}
console.log(JSON.stringify({ htmlFiles: htmlFiles.length, internalLinks, brokenUnique: broken.size,
  broken: [...broken].sort((a, b) => b[1].count - a[1].count).map(([path, detail]) => ({ path, ...detail })) }, null, 2));
if (broken.size) process.exitCode = 1;
