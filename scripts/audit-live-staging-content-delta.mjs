// Read-only triage of published live edits since the staging-copy cutoff.
// This does not copy content, infer editorial parity, or write to WordPress.
import { readdir, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const cutoff = '2026-09-30T00:00:00';
const liveOrigin = 'https://www.everytip.co.uk';
const snapshotDirectory = new URL('../data/raw/', import.meta.url);
const distDirectory = new URL('../dist/', import.meta.url);
const snapshotName = (await readdir(snapshotDirectory))
  .filter((name) => /^staging-wordpress-public-.*\.json$/.test(name)).sort().at(-1);
if (!snapshotName) throw new Error('Missing dated staging WordPress snapshot');
const snapshot = JSON.parse(await readFile(new URL(snapshotName, snapshotDirectory), 'utf8'));

async function liveChanges(kind) {
  const records = [];
  let totalPages;
  for (let page = 1; !totalPages || page <= totalPages; page++) {
    const url = new URL(`/wp-json/wp/v2/${kind}`, liveOrigin);
    url.search = new URLSearchParams({
      modified_after: cutoff, per_page: '100', page: String(page),
      _fields: 'id,slug,date,modified,link',
    }).toString();
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Live ${kind} metadata page ${page}: HTTP ${response.status}`);
    const pages = Number(response.headers.get('x-wp-totalpages'));
    if (!Number.isInteger(pages) || pages < 1 || pages > 20) throw new Error(`Unexpected live ${kind} pagination`);
    if (totalPages && totalPages !== pages) throw new Error(`Live ${kind} pagination changed during audit`);
    totalPages = pages;
    const batch = await response.json();
    if (!Array.isArray(batch)) throw new Error(`Malformed live ${kind} response`);
    records.push(...batch);
  }
  if (new Set(records.map(({ id }) => id)).size !== records.length) throw new Error(`Duplicate live ${kind} IDs`);
  return records;
}

const groups = {};
for (const kind of ['posts', 'pages']) {
  const stagingById = new Map(snapshot[kind].map((record) => [record.databaseId, record]));
  const changed = await liveChanges(kind);
  const newSinceCopy = [];
  const changedSinceCopy = [];
  for (const record of changed) {
    const old = stagingById.get(record.id);
    const path = new URL(record.link).pathname.replace(/\/$/, '') || '/';
    const relativeAsset = path.endsWith('.html') ? path.slice(1) : join(path.slice(1), 'index.html');
    const item = { id: record.id, path, slug: record.slug, date: record.date,
      liveModified: record.modified, exactLocalAsset: existsSync(new URL(relativeAsset.replaceAll('\\', '/'), distDirectory)) };
    if (!old) newSinceCopy.push(item);
    else if (old.modified !== record.modified || old.slug !== record.slug || old.uri !== path) {
      changedSinceCopy.push({ ...item, stagingSnapshotModified: old.modified,
        stagingSnapshotPath: old.uri });
    }
  }
  groups[kind] = { liveModifiedSinceCutoff: changed.length, absentFromStagingSnapshot: newSinceCopy.length,
    differentFromStagingSnapshot: changedSinceCopy.length,
    newWithoutExactLocalAsset: newSinceCopy.filter((item) => !item.exactLocalAsset).length,
    newSinceCopy, changedSinceCopy };
}
console.log(JSON.stringify({ mode: 'read-only-live-metadata-vs-dated-staging-snapshot', cutoff,
  snapshot: snapshotName, snapshotGeneratedAt: snapshot.generatedAt, ...groups }, null, 2));
