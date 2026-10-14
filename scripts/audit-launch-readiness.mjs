// Read-only gate for exact URL assets. A pilot page is never counted as launch-ready.
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseDocument } from 'htmlparser2';
import { parseCrawlCsv } from '../src/lib/exact-route-preview.mjs';
import { latestContentSnapshot } from '../src/lib/migration-preview.mjs';
import { launchAuditFails } from '../src/lib/launch-audit-gate.mjs';
import { verifiedLegacyRedirects } from '../src/lib/legacy-redirects.mjs';

const root = resolve(import.meta.dirname, '..');
// A public launch gate must never rely on the dated crawl alone.
const freshLive = process.argv.includes('--fresh-live') || process.argv.includes('--strict');
const freshLiveCutoff = '2026-09-30T00:00:00';
const crawl = parseCrawlCsv(await readFile(join(root, 'docs/everytip-template-map-2026-09-30.csv'), 'utf8'));
const datedLive = crawl.filter((row) => row.status_code === '200');
const redirectedDatedPaths = [...new Set(datedLive.map((row) => row.path).filter((path) => verifiedLegacyRedirects.has(path)))];
const live = datedLive.filter((row) => !verifiedLegacyRedirects.has(row.path));
const snapshot = await latestContentSnapshot();
if (!snapshot) throw new Error('No local WordPress content snapshot');
const sourceByUri = new Map([...snapshot.posts, ...snapshot.pages].map((record) => [record.uri, record]));
const assetPath = (path) => path === '/' ? join(root, 'dist/index.html')
  : path.endsWith('.html') ? join(root, 'dist', path.slice(1))
    : join(root, 'dist', path.replace(/^\/|\/$/g, ''), 'index.html');
const collect = (node, name, output = []) => {
  if (node.name === name) output.push(node);
  for (const child of node.children ?? []) collect(child, name, output);
  return output;
};
const text = (node) => node.type === 'text' ? node.data : (node.children ?? []).map(text).join('');
const issues = {
  missing: [], preview: [], robotsMismatch: [], canonicalMismatch: [], stagingHost: [],
  missingDescription: [], sourceMissingDescription: [], descriptionRegression: [],
  previewIndexable: [], intentionalNoindexPreview: [], missingTitle: [],
};
const redirectAssetCollisions = redirectedDatedPaths.filter((path) => existsSync(assetPath(path)));
const freshLiveDelta = { checked: false, cutoff: freshLiveCutoff,
  basis: 'Published live WordPress REST metadata compared by ID/path/slug/modified with the local staging snapshot',
  modifiedPosts: 0, modifiedPages: 0,
  newPosts: 0, newPages: 0, modifiedExistingPosts: 0, modifiedExistingPages: 0,
  missingNewAssets: [], modifiedExistingPaths: [] };
if (freshLive) {
  const sourceIds = {
    posts: new Map(snapshot.posts.map((record) => [record.databaseId, record])),
    pages: new Map(snapshot.pages.map((record) => [record.databaseId, record])),
  };
  for (const kind of ['posts', 'pages']) {
    let totalPages = 1;
    const seen = new Set();
    for (let page = 1; page <= totalPages; page++) {
      const url = new URL(`/wp-json/wp/v2/${kind}`, 'https://www.everytip.co.uk');
      url.search = new URLSearchParams({ modified_after: freshLiveCutoff,
        per_page: '100', page: String(page), _fields: 'id,link,slug,modified' }).toString();
      const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
      if (!response.ok) throw new Error(`Fresh live ${kind} page ${page}: HTTP ${response.status}`);
      const pages = Number(response.headers.get('x-wp-totalpages'));
      if (!Number.isInteger(pages) || pages < 1 || pages > 20 || (page > 1 && pages !== totalPages)) {
        throw new Error(`Unstable fresh live ${kind} pagination`);
      }
      totalPages = pages;
      const records = await response.json();
      if (!Array.isArray(records)) throw new Error(`Malformed fresh live ${kind} response`);
      for (const record of records) {
        if (!Number.isInteger(record.id) || !record.link || !record.modified || seen.has(record.id)) {
          throw new Error(`Invalid or duplicate fresh live ${kind} ID`);
        }
        seen.add(record.id);
        const liveUrl = new URL(record.link);
        if (!['www.everytip.co.uk', 'everytip.co.uk'].includes(liveUrl.hostname) ||
            !['http:', 'https:'].includes(liveUrl.protocol)) {
          throw new Error(`Unexpected fresh live ${kind} origin for ID ${record.id}`);
        }
        const path = liveUrl.pathname.replace(/\/$/, '') || '/';
        const prior = sourceIds[kind].get(record.id);
        if (prior) {
          if (prior.modified !== record.modified || prior.uri !== path || prior.slug !== record.slug) {
            freshLiveDelta[kind === 'posts' ? 'modifiedExistingPosts' : 'modifiedExistingPages']++;
            freshLiveDelta.modifiedExistingPaths.push(path);
          }
          continue;
        }
        freshLiveDelta[kind === 'posts' ? 'newPosts' : 'newPages']++;
        if (!existsSync(assetPath(path))) freshLiveDelta.missingNewAssets.push(path);
      }
    }
    freshLiveDelta[kind === 'posts' ? 'modifiedPosts' : 'modifiedPages'] = seen.size;
  }
  freshLiveDelta.checked = true;
}
let built = 0;
for (const row of live) {
  const file = assetPath(row.path);
  if (!existsSync(file)) { issues.missing.push(row.path); continue; }
  built++;
  const html = await readFile(file, 'utf8');
  const document = parseDocument(html);
  const meta = collect(document, 'meta');
  const links = collect(document, 'link');
  const robots = meta.find((node) => node.attribs?.name?.toLowerCase() === 'robots')?.attribs?.content?.toLowerCase() ?? '';
  const canonical = links.find((node) => node.attribs?.rel?.toLowerCase() === 'canonical')?.attribs?.href ?? '';
  const description = meta.find((node) => node.attribs?.name?.toLowerCase() === 'description')?.attribs?.content ?? '';
  const title = text(collect(document, 'title')[0] ?? {}).toLowerCase();
  const explicitPreview = meta.some((node) => node.attribs?.name?.toLowerCase() === 'everytip-preview');
  const isPreview = explicitPreview || /template preview|migration preview|local route test|not for publication/i.test(title + html.slice(0, 5000));
  if (isPreview) {
    issues.preview.push(row.path);
    if (/\bnoindex\b/.test(robots)) issues.intentionalNoindexPreview.push(row.path);
    else issues.previewIndexable.push(row.path);
  }
  if (!title.trim()) issues.missingTitle.push(row.path);
  if (row.indexability === 'Indexable' && /\bnoindex\b/.test(robots)) issues.robotsMismatch.push(row.path);
  if (row.indexability === 'Non-Indexable' && !/\bnoindex\b/.test(robots)) issues.robotsMismatch.push(row.path);
  if (row.canonical && canonical !== row.canonical) issues.canonicalMismatch.push(row.path);
  if (html.includes('wordpress-159231-2098144.cloudwaysapps.com')) issues.stagingHost.push(row.path);
  if (!description) {
    issues.missingDescription.push(row.path);
    if (sourceByUri.get(row.path)?.seo?.metaDesc?.trim()) issues.descriptionRegression.push(row.path);
    else issues.sourceMissingDescription.push(row.path);
  }
}
const summary = {
  datedCrawl200: datedLive.length,
  verifiedRedirectsFromDatedCrawl: redirectedDatedPaths.length,
  redirectAssetCollisions,
  liveStatusBasis: '2026-09-30 crawl minus exact redirects verified by live HEAD on 2026-10-04; remaining 200 statuses not freshly probed',
  live200: live.length,
  exactBuiltAssets: built,
  missingAssets: issues.missing.length,
  previewAssets: issues.preview.length,
  intentionalNoindexPreviews: issues.intentionalNoindexPreview.length,
  accidentallyIndexablePreviews: issues.previewIndexable.length,
  missingTitles: issues.missingTitle.length,
  robotsMismatches: issues.robotsMismatch.length,
  canonicalMismatches: issues.canonicalMismatch.length,
  stagingHostReferences: issues.stagingHost.length,
  missingDescriptions: issues.missingDescription.length,
  sourceMissingDescriptions: issues.sourceMissingDescription.length,
  descriptionRegressions: issues.descriptionRegression.length,
  freshLiveDelta: { ...freshLiveDelta, missingNewAssetCount: freshLiveDelta.missingNewAssets.length,
    modifiedExistingCount: freshLiveDelta.modifiedExistingPaths.length,
    missingNewAssets: freshLiveDelta.missingNewAssets.slice(0, 20),
    modifiedExistingPaths: freshLiveDelta.modifiedExistingPaths.slice(0, 20) },
  auditMode: process.argv.includes('--strict') ? 'launch-gate' : process.argv.includes('--preview-strict') ? 'preview-safety' : 'report',
  samples: Object.fromEntries(Object.entries(issues).map(([key, paths]) => [key, paths.slice(0, 10)])),
};
console.log(JSON.stringify(summary, null, 2));
if (launchAuditFails(summary, summary.auditMode)) process.exitCode = 1;
