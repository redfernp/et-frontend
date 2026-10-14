// Guarded staging-only conversion for the first plain editorial/legal pages.
// This deliberately excludes builder pages, offer pages and pages with shortcodes.
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { parseDocument } from 'htmlparser2';
import { classicHtmlToBlocks } from '../src/lib/classic-to-gutenberg.mjs';

const id = Number(process.argv[2]);
const apply = process.argv[3] === '--apply';
if (![70281, 9310].includes(id) || (process.argv[3] && !apply) || process.argv.length > 4) {
  throw new Error('Usage: apply-staging-gutenberg-page.mjs <70281|9310> [--apply]');
}
const site = new URL(process.env.EVERYTIP_WP_BASE_URL ?? '');
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') {
  throw new Error('Only the named EveryTip staging site is permitted');
}
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!username || !password) throw new Error('Missing staging REST credentials');
const headers = { Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}` };
const directory = new URL('../data/raw/', import.meta.url);
const filename = (await readdir(directory)).filter((name) => /^staging-wordpress-public-.*\.json$/.test(name)).sort().at(-1);
if (!filename) throw new Error('No staging snapshot');
const snapshot = JSON.parse(await readFile(new URL(filename, directory), 'utf8'));
const source = snapshot.pages.find((page) => page.databaseId === id);
if (!source || !['/safer-gambling', '/about-us'].includes(source.uri)) throw new Error('Unexpected page identity');
const endpoint = `/wp-json/wp/v2/pages/${id}`;
async function request(path, options = {}) {
  const response = await fetch(new URL(path, site), { ...options,
    headers: { ...headers, ...options.headers }, signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`${options.method ?? 'GET'} ${path}: HTTP ${response.status}`);
  return response.json();
}
const read = () => request(`${endpoint}?context=edit`);
const visibleText = (html) => {
  const walk = (node) => node.name === 'br' ? ' ' : node.type === 'text' ? node.data :
    (node.children ?? []).map(walk).join('');
  return walk(parseDocument(html, { decodeEntities: true })).replace(/\s+/g, ' ').trim();
};
const links = (html) => {
  const found = [];
  const visit = (node) => {
    if (node.name === 'a') found.push(node.attribs?.href ?? '');
    for (const child of node.children ?? []) visit(child);
  };
  visit(parseDocument(html));
  return found;
};
const imageCount = (html) => (html.match(/<img\b/gi) ?? []).length;
const stable = (page) => ({ id: page.id, slug: page.slug, status: page.status,
  title: page.title?.raw, date: page.date, parent: page.parent, menuOrder: page.menu_order,
  author: page.author, featuredMedia: page.featured_media, template: page.template });
const seo = (page) => page.yoast_head_json && ({ title: page.yoast_head_json.title,
  description: page.yoast_head_json.description, canonical: page.yoast_head_json.canonical,
  robots: page.yoast_head_json.robots });
const before = await read();
if (before.id !== id || before.slug !== source.slug || before.status !== 'publish' ||
    before.modified !== source.modified || !before.content?.raw || /<!--\s*wp:/.test(before.content.raw)) {
  throw new Error('Page identity, status, modified time or classic body changed; refusing write');
}
const converted = classicHtmlToBlocks(before.content.raw, { imageMode: 'wordpress-upload' });
if (visibleText(before.content.raw) !== visibleText(converted)) throw new Error('Visible text changed during conversion');
if (JSON.stringify(links(before.content.raw)) !== JSON.stringify(links(converted)) ||
    imageCount(before.content.raw) !== imageCount(converted)) {
  throw new Error('Link or image inventory changed during conversion');
}
const blockCount = (converted.match(/<!-- wp:/g) ?? []).length;
if (!blockCount) throw new Error('No Gutenberg blocks generated');
console.log(JSON.stringify({ environment: 'staging', mode: apply ? 'apply' : 'dry-run',
  id, uri: source.uri, blockCount, visibleTextParity: true, linkAndImageParity: true }));
if (apply) {
  const backup = new URL(`wp-page-preconversion-${id}-${new Date().toISOString().slice(0, 10)}.json`, directory);
  await mkdir(directory, { recursive: true });
  await writeFile(backup, JSON.stringify({ savedAt: new Date().toISOString(), snapshot: filename,
    before: { ...stable(before), modified: before.modified, content: before.content.raw, seo: seo(before) },
    converted }, null, 2), { flag: 'wx' });
  await request(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: converted }) });
  const after = await read();
  const checks = { rawEqual: after.content?.raw === converted,
    textEqual: visibleText(after.content?.raw ?? '') === visibleText(before.content.raw),
    linksEqual: JSON.stringify(links(after.content?.raw ?? '')) === JSON.stringify(links(before.content.raw)),
    imagesEqual: imageCount(after.content?.raw ?? '') === imageCount(before.content.raw),
    metadataStable: JSON.stringify(stable(after)) === JSON.stringify(stable(before)),
    seoStable: JSON.stringify(seo(after)) === JSON.stringify(seo(before)) };
  console.log(JSON.stringify({ environment: 'staging', id, checks, backup: backup.pathname }));
  if (Object.values(checks).some((value) => !value)) process.exitCode = 1;
}
