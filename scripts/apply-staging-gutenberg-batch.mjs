// Staging-only, one post per invocation. Dry-run by default.
// Example: node --env-file=.env.local scripts/apply-staging-gutenberg-batch.mjs 8300 --apply
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { parseDocument } from 'htmlparser2';
import { classicHtmlToBlocks, columnistConversionOptions } from '../src/lib/classic-to-gutenberg.mjs';

const id = Number(process.argv[2]);
const apply = process.argv[3] === '--apply';
if (!Number.isInteger(id) || id <= 0 || (process.argv[3] && !apply) || process.argv.length > 4) {
  throw new Error('Usage: apply-staging-gutenberg-batch.mjs <post-id> [--apply]');
}
const base = process.env.EVERYTIP_WP_BASE_URL;
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!base || !username || !password) throw new Error('Missing staging REST credentials');
const site = new URL(base);
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com' ||
    site.username || site.password || site.search || site.hash) throw new Error('Staging host only');

const directory = new URL('../data/raw/', import.meta.url);
const filename = (await readdir(directory)).filter((name) => /^staging-wordpress-public-.*\.json$/.test(name)).sort().at(-1);
if (!filename) throw new Error('No local WordPress snapshot');
const snapshot = JSON.parse(await readFile(new URL(filename, directory), 'utf8'));
const source = snapshot.posts.find((post) => post.databaseId === id);
if (!source) throw new Error(`Post ${id} is absent from the staging snapshot`);
const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
const endpoint = new URL(`/wp-json/wp/v2/posts/${id}`, site);
async function read() {
  const response = await fetch(new URL(`${endpoint.pathname}?context=edit`, site), {
    headers: { Authorization: authorization }, signal: AbortSignal.timeout(45000),
  });
  if (!response.ok) throw new Error(`Staging REST read ${id}: HTTP ${response.status}`);
  return response.json();
}
const articleText = (html) => {
  const text = (node) => node.name === 'br' ? ' ' : node.type === 'text' ? node.data : (node.children ?? []).map(text).join('');
  return text(parseDocument(html, { decodeEntities: true })).replace(/\s+/g, ' ').trim();
};
const destinations = (html) => {
  const links = [];
  const visit = (node) => {
    if (node.type === 'tag' && node.name === 'a' && node.attribs?.href) links.push(node.attribs.href);
    for (const child of node.children ?? []) visit(child);
  };
  for (const node of parseDocument(html, { decodeEntities: true }).children) visit(node);
  return links.sort();
};
const stable = (post) => ({
  id: post.id, slug: post.slug, status: post.status, title: post.title?.raw, date: post.date,
  author: post.author, categories: post.categories, tags: post.tags,
  featuredMedia: post.featured_media, format: post.format, template: post.template, sticky: post.sticky,
});
const seo = (post) => {
  const value = post.yoast_head_json;
  return value ? { title: value.title, description: value.description, canonical: value.canonical, robots: value.robots } : null;
};

const before = await read();
if (before.id !== id || before.slug !== source.slug || before.status !== 'publish' ||
    before.modified !== source.modified || !before.content?.raw || /<!--\s*wp:/.test(before.content.raw)) {
  throw new Error('Identity, status, modified time or classic-editor body changed; refusing write');
}
const converted = classicHtmlToBlocks(before.content.raw, {
  ...columnistConversionOptions(source.uri), rejectLinkedImages: true,
});
if (articleText(before.content.raw) !== articleText(converted)) throw new Error('Text parity failed; refusing write');
if (JSON.stringify(destinations(before.content.raw)) !== JSON.stringify(destinations(converted))) {
  throw new Error('Link destination parity failed; refusing write');
}
const blockCount = (converted.match(/<!-- wp:/g) ?? []).length;
if (!blockCount) throw new Error('No Gutenberg blocks generated');
const backupDate = new Date().toISOString().slice(0, 10);
const backupUrl = new URL(`wp-preconversion-${id}-${backupDate}.json`, directory);
console.log(JSON.stringify({ environment: 'staging', id, uri: source.uri, mode: apply ? 'apply' : 'dry-run',
  snapshot: filename, sourceModified: before.modified, blockCount, textParity: true }));
if (apply) {
  await mkdir(directory, { recursive: true });
  await writeFile(backupUrl, JSON.stringify({ savedAt: new Date().toISOString(), snapshot: filename,
    before: { ...stable(before), modified: before.modified, content: before.content.raw, seo: seo(before) },
    converted }, null, 2), { flag: 'wx' });
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { Authorization: authorization, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: converted }), signal: AbortSignal.timeout(45000),
  });
  if (!response.ok) throw new Error(`Staging REST update ${id}: HTTP ${response.status}; inspect saved backup`);
  const after = await read();
  const contentVerified = after.content?.raw === converted;
  const metadataStable = JSON.stringify(stable(after)) === JSON.stringify(stable(before));
  const seoStable = JSON.stringify(seo(after)) === JSON.stringify(seo(before));
  console.log(JSON.stringify({ environment: 'staging', id, status: after.status, blockCount,
    contentVerified, textParity: articleText(after.content?.raw ?? '') === articleText(before.content.raw),
    metadataStable, seoStable, backup: backupUrl.pathname }));
  if (!contentVerified || !metadataStable || !seoStable) process.exitCode = 1;
}
