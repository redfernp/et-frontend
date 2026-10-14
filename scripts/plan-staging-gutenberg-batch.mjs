// Read-only plan for a small, strictly convertible classic-editor batch.
// No POST requests are made. Re-read every source just before any later write.
import { readdir, readFile } from 'node:fs/promises';
import { parseDocument } from 'htmlparser2';
import { classicHtmlToBlocks, columnistConversionOptions } from '../src/lib/classic-to-gutenberg.mjs';
import { columnistKeyForUri } from '../src/lib/columnist-profiles.mjs';

const limit = Number(process.argv[2] ?? 10);
if (!Number.isInteger(limit) || limit < 1 || limit > 30) throw new Error('Choose a batch size from 1 to 30');
const family = process.argv[3] ?? 'all';
if (!['all', 'seymour', 'john'].includes(family)) throw new Error('Family must be all, seymour or john');
const base = process.env.EVERYTIP_WP_BASE_URL;
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!base || !username || !password) throw new Error('Missing staging REST credentials');
const site = new URL(base);
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') {
  throw new Error('Batch planning is restricted to EveryTip staging');
}

const directory = new URL('../data/raw/', import.meta.url);
const filename = (await readdir(directory)).filter((name) => /^staging-wordpress-public-.*\.json$/.test(name)).sort().at(-1);
if (!filename) throw new Error('No local WordPress snapshot');
const snapshot = JSON.parse(await readFile(new URL(filename, directory), 'utf8'));
const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
const articleText = (html) => {
  const read = (node) => node.name === 'br' ? ' ' : node.type === 'text' ? node.data : (node.children ?? []).map(read).join('');
  return read(parseDocument(html, { decodeEntities: true })).replace(/\s+/g, ' ').trim();
};
const candidates = snapshot.posts.filter((post) => family === 'all' || columnistKeyForUri(post.uri) === family)
  .sort((a, b) => String(b.date).localeCompare(String(a.date)));
const rows = [];
for (const post of candidates) {
  if (rows.length >= limit) break;
  try { classicHtmlToBlocks(post.content, columnistConversionOptions(post.uri)); }
  catch { continue; }
  const response = await fetch(new URL(`/wp-json/wp/v2/posts/${post.databaseId}?context=edit`, site), {
    headers: { Authorization: authorization }, signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Staging read ${post.databaseId}: HTTP ${response.status}`);
  const current = await response.json();
  let reason = '';
  let detail = '';
  let blocks = '';
  if (current.id !== post.databaseId || current.slug !== post.slug || current.status !== 'publish') {
    reason = 'identity-or-status-changed';
  } else if (current.modified !== post.modified) {
    reason = 'modified-since-snapshot';
  } else if (!current.content?.raw || /<!--\s*wp:/.test(current.content.raw)) {
    reason = 'empty-or-already-block-content';
  } else {
    try { blocks = classicHtmlToBlocks(current.content.raw, columnistConversionOptions(post.uri)); }
    catch (error) {
      reason = 'current-raw-content-not-strictly-convertible';
      detail = String(error.message);
      if (detail === 'Unsupported quote structure') {
        const quotes = parseDocument(current.content.raw).children.filter((node) => node.name === 'blockquote');
        detail += ` (${quotes.slice(0, 3).map((quote) =>
          (quote.children ?? []).filter((node) => node.type !== 'text' || node.data.trim())
            .map((node) => node.name ?? node.type).join(',')).join('; ')})`;
      }
    }
    if (!reason && articleText(current.content.raw) !== articleText(blocks)) {
      reason = 'text-parity-failed';
      const original = articleText(current.content.raw);
      const converted = articleText(blocks);
      let offset = 0;
      while (offset < Math.min(original.length, converted.length) && original[offset] === converted[offset]) offset++;
      detail = `at ${offset}; source="${original.slice(Math.max(0, offset - 28), offset + 45)}" blocks="${converted.slice(Math.max(0, offset - 28), offset + 45)}"`;
    }
  }
  rows.push({ id: post.databaseId, uri: post.uri, date: post.date?.slice(0, 10),
    modified: current.modified, eligible: !reason,
    reason: reason || undefined, detail: detail || undefined,
    blocks: blocks ? (blocks.match(/<!-- wp:/g) ?? []).length : undefined });
}
console.log(JSON.stringify({ environment: 'staging', mode: 'read-only-plan', family, snapshot: filename,
  inspected: rows.length, eligible: rows.filter((row) => row.eligible).length, rows }, null, 2));
