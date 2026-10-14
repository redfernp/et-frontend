// Read-only preview SEO check for published live-200 URLs absent from the dated crawl.
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parseDocument } from 'htmlparser2';
import { latestContentSnapshot } from '../src/lib/migration-preview.mjs';
import { parseCrawlCsv, uncrawledRedirectPaths } from '../src/lib/exact-route-preview.mjs';

const root = resolve(import.meta.dirname, '..');
const snapshot = await latestContentSnapshot();
if (!snapshot) throw new Error('No local WordPress snapshot');
const crawl = parseCrawlCsv(await readFile(join(root, 'docs/everytip-template-map-2026-09-30.csv'), 'utf8'));
const crawledPaths = new Set(crawl.map((row) => row.path));
const records = [...snapshot.posts, ...snapshot.pages].filter((record) => record.uri
  && !crawledPaths.has(record.uri) && !uncrawledRedirectPaths.has(record.uri));
const collect = (node, name, output = []) => {
  if (node.name === name) output.push(node);
  for (const child of node.children ?? []) collect(child, name, output);
  return output;
};
const nodeText = (node) => node?.type === 'text' ? node.data : (node?.children ?? []).map(nodeText).join('');
const assetPath = (path) => path.endsWith('.html')
  ? join(root, 'dist', path.slice(1)) : join(root, 'dist', path.slice(1), 'index.html');
const issues = { missingAsset: [], missingTitle: [], indexablePreview: [], descriptionRegression: [], stagingHost: [], activeAffiliate: [] };
let built = 0;
for (const record of records) {
  const file = assetPath(record.uri);
  if (!existsSync(file)) { issues.missingAsset.push(record.uri); continue; }
  built++;
  const html = await readFile(file, 'utf8');
  const document = parseDocument(html);
  const meta = collect(document, 'meta');
  const title = nodeText(collect(document, 'title')[0]).trim();
  const robots = meta.find((node) => node.attribs?.name?.toLowerCase() === 'robots')?.attribs?.content?.toLowerCase() ?? '';
  const description = meta.find((node) => node.attribs?.name?.toLowerCase() === 'description')?.attribs?.content?.trim() ?? '';
  if (!title) issues.missingTitle.push(record.uri);
  if (!/\bnoindex\b/.test(robots)) issues.indexablePreview.push(record.uri);
  if (record.seo?.metaDesc?.trim() && !description) issues.descriptionRegression.push(record.uri);
  if (html.includes('wordpress-159231-2098144.cloudwaysapps.com')) issues.stagingHost.push(record.uri);
  if (/href=["'](?:https?:\/\/www\.everytip\.co\.uk)?\/go\//i.test(html)) issues.activeAffiliate.push(record.uri);
}
const summary = {
  uncrawledLive200: records.length,
  builtNoindexPreviewAssets: built,
  missingAssets: issues.missingAsset.length,
  missingTitles: issues.missingTitle.length,
  accidentallyIndexable: issues.indexablePreview.length,
  descriptionRegressions: issues.descriptionRegression.length,
  stagingHostReferences: issues.stagingHost.length,
  activeAffiliateLinks: issues.activeAffiliate.length,
  samples: Object.fromEntries(Object.entries(issues).map(([key, paths]) => [key, paths.slice(0, 10)])),
  scope: 'Additional live-200 paths from the 2026-10-03 read-only HEAD probe; noindex local previews only, not launch approval.',
};
console.log(JSON.stringify(summary, null, 2));
if (process.argv.includes('--preview-strict') && Object.entries(issues).some(([key, paths]) => key !== 'missingAsset' && paths.length)) process.exitCode = 1;
if (process.argv.includes('--strict') && Object.values(issues).some((paths) => paths.length)) process.exitCode = 1;
