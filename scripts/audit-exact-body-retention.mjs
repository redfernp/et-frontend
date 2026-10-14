// Read-only editorial parity screen for the generic, safe exact-route family.
// This is not a publication gate: matching old copy can still be stale or unsafe.
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { parseDocument } from 'htmlparser2';
import { latestContentSnapshot, withholdsSnapshotTipTables } from '../src/lib/migration-preview.mjs';
import { parseCrawlCsv, planExactRoutePreview, supplementalPublishedPreviewRows } from '../src/lib/exact-route-preview.mjs';

const root = resolve(import.meta.dirname, '..');
const snapshot = await latestContentSnapshot();
if (!snapshot) throw new Error('No local WordPress content snapshot');
const crawl = parseCrawlCsv(await readFile(join(root, 'docs/everytip-template-map-2026-09-30.csv'), 'utf8'));
const plan = planExactRoutePreview(snapshot, crawl);
const supplemental = supplementalPublishedPreviewRows(snapshot, crawl);

function nodeText(node) {
  if (node.type === 'text') return node.data;
  if (['script', 'style', 'noscript'].includes(node.name)) return '';
  return (node.children ?? []).map(nodeText).join(' ');
}

function byClass(node, className) {
  if (node.attribs?.class?.split(/\s+/).includes(className)) return node;
  for (const child of node.children ?? []) {
    const match = byClass(child, className);
    if (match) return match;
  }
  return null;
}

function words(html) {
  const text = nodeText(parseDocument(html, { decodeEntities: true }));
  return (text.toLocaleLowerCase('en-GB').match(/[\p{L}\p{N}]+/gu) ?? []);
}

function retention(source, output) {
  // Five-word spans are much less likely than single words to match navigation
  // or preview disclaimers by accident. The output is only the article body.
  const width = Math.min(5, source.length);
  if (!width) return 1;
  const outputSpans = new Set();
  for (let index = 0; index <= output.length - width; index++) {
    outputSpans.add(output.slice(index, index + width).join(' '));
  }
  let kept = 0;
  const total = source.length - width + 1;
  for (let index = 0; index < total; index++) {
    if (outputSpans.has(source.slice(index, index + width).join(' '))) kept++;
  }
  return kept / total;
}

const rows = [];
for (const { row, record } of [...plan.included, ...supplemental]) {
  const outputPath = row.path.endsWith('.html')
    ? join(root, 'dist', row.path.slice(1))
    : join(root, 'dist', row.path.slice(1), 'index.html');
  const document = parseDocument(await readFile(outputPath, 'utf8'), { decodeEntities: true });
  const body = byClass(document, 'exact-preview-body');
  if (!body) throw new Error(`Generic article body missing: ${row.path}`);
  const sourceWords = words(record.content ?? '');
  const builtWords = (nodeText(body).toLocaleLowerCase('en-GB').match(/[\p{L}\p{N}]+/gu) ?? []);
  rows.push({ path: row.path, sourceWords: sourceWords.length, builtWords: builtWords.length,
    staleNinjaTableIntentionallyWithheld: withholdsSnapshotTipTables(record),
    fiveWordRetention: Number(retention(sourceWords, builtWords).toFixed(4)) });
}

const ranked = rows.filter((row) => row.sourceWords >= 50)
  .sort((a, b) => a.fiveWordRetention - b.fiveWordRetention);
const below = (threshold) => ranked.filter((row) => row.fiveWordRetention < threshold).length;
const shortTextPaths = rows.filter((row) => row.sourceWords < 50).map((row) => row.path);
console.log(JSON.stringify({
  snapshotDate: snapshot.generatedAt,
  genericExactRoutes: rows.length,
  fromLive200Crawl: plan.included.length,
  additionalPublishedCMSRoutes: supplemental.length,
  meaningfulTextRoutes: ranked.length,
  below90Percent: below(0.9),
  below75Percent: below(0.75),
  below90WithheldTipTable: ranked.filter((row) => row.fiveWordRetention < 0.9 && row.staleNinjaTableIntentionallyWithheld).length,
  below90Other: ranked.filter((row) => row.fiveWordRetention < 0.9 && !row.staleNinjaTableIntentionallyWithheld).length,
  shortTextPaths,
  lowestRetention: ranked.slice(0, 20),
  scope: 'Generic safe exact-route body only, including published CMS paths absent from the crawl. Excludes dedicated templates and curated unsafe builder extractions. Stale Ninja Tables are intentionally removed and counted separately; their low retention is a missing trusted feed, not permission to restore old selections. Five-word span retention is a screening measure, not editorial approval.',
}, null, 2));
if (process.argv.includes('--strict') && below(0.9)) process.exitCode = 1;
