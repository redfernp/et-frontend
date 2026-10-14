// Section 4 launch gate: compare the build's fresh-source receipt with its assets.
import { readFile, writeFile } from 'node:fs/promises';
import { parseDocument } from 'htmlparser2';
import { robotsFor } from '../src/lib/launch-content.mjs';
const source = JSON.parse(await readFile('outputs/launch-source.json', 'utf8'));
const sitemap = await readFile('dist/sitemap.xml', 'utf8');
const failures = [];
let checked = 0;
function elements(node, name) {
  return [...(node.name === name ? [node] : []), ...(node.children ?? []).flatMap(child => elements(child, name))];
}
function text(node) { return node?.type === 'text' ? node.data : (node?.children ?? []).map(text).join(''); }
for (const record of source.records) {
  const asset = record.uri === '/' ? 'dist/index.html' : `dist${record.uri}${record.uri.endsWith('.html') ? '' : '/index.html'}`;
  let html;
  try { html = await readFile(asset, 'utf8'); } catch { failures.push({ path: record.uri, field: 'asset', error: 'missing' }); continue; }
  checked++;
  if (html.includes('data-everytip-offer-slot')) failures.push({ path: record.uri, field: 'unresolved-offer-slot' });
  const doc = parseDocument(html);
  const meta = Object.fromEntries(elements(doc, 'meta').map(node => [node.attribs.name, node.attribs.content]));
  const canonical = elements(doc, 'link').find(node => node.attribs.rel === 'canonical')?.attribs.href ?? '';
  const actual = { title: text(elements(doc, 'title')[0]), description: meta.description ?? '', canonical, robots: meta.robots };
  const expected = { title: record.seo?.title || text(parseDocument(record.title)), description: record.seo?.metaDesc || '', canonical: record.seo?.canonical || '', robots: robotsFor(record) };
  for (const field of Object.keys(expected)) if (actual[field] !== expected[field]) failures.push({ path: record.uri, field, expected: expected[field], actual: actual[field] });
  const sitemapPath = new URL(record.uri, 'https://www.everytip.co.uk').href.replaceAll('&', '&amp;');
  const included = sitemap.includes(`<loc>${sitemapPath}</loc>`);
  if (included === robotsFor(record).includes('noindex')) failures.push({ path: record.uri, field: 'sitemap' });
  for (const a of elements(doc, 'a')) if (/\/go\//.test(a.attribs.href ?? '') && !['sponsored','nofollow'].every(rel => (a.attribs.rel ?? '').split(/\s+/).includes(rel))) failures.push({ path: record.uri, field: 'affiliate-rel' });
}
const result = { fetchedAt: source.fetchedAt, checked, failures, scope: 'Post/page assets only; excludes taxonomy/archive discovery, network redirects and browser QA.' };
await writeFile('outputs/launch-parity.json', JSON.stringify(result, null, 2));
console.log(JSON.stringify({ checked, failures: failures.length, firstFailures: failures.slice(0, 10) }));
if (failures.length) process.exitCode = 1;
