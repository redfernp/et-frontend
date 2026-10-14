// Read-only gap audit: the dated external crawl is not the whole CMS inventory.
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { latestContentSnapshot, assessContent } from '../src/lib/migration-preview.mjs';
import { parseCrawlCsv, isSafeExactPath, uncrawledRedirectPaths } from '../src/lib/exact-route-preview.mjs';

const root = resolve(import.meta.dirname, '..');
const snapshot = await latestContentSnapshot();
if (!snapshot) throw new Error('No local WordPress snapshot');
const crawl = parseCrawlCsv(await readFile(join(root, 'docs/everytip-template-map-2026-09-30.csv'), 'utf8'));
const crawled = new Set(crawl.filter((row) => row.status_code === '200').map((row) => row.path));
const allCrawled = new Set(crawl.map(({ path }) => path));
const assetPath = (path) => path.endsWith('.html')
  ? join(root, 'dist', path.slice(1)) : join(root, 'dist', path.slice(1), 'index.html');
const outsideLive200 = [...snapshot.posts, ...snapshot.pages]
  .filter((record) => record.uri && !crawled.has(record.uri))
  .map((record) => ({ id: record.databaseId, path: record.uri, date: record.date?.slice(0, 10),
    sourceNoindex: record.seo?.metaRobotsNoindex === 'noindex',
    issues: isSafeExactPath(record.uri) ? assessContent(record) : ['unsafe-path'],
    hasLocalAsset: existsSync(assetPath(record.uri)) }));
const uncrawled = outsideLive200.filter((row) => !allCrawled.has(row.path));
const count = (predicate) => uncrawled.filter(predicate).length;
const uncrawledLive200 = uncrawled.filter((row) => !uncrawledRedirectPaths.has(row.path));
const crawledBuilt = [...crawled].filter((path) => existsSync(assetPath(path))).length;
const uncrawledBuilt = uncrawledLive200.filter((row) => row.hasLocalAsset).length;
const knownLive200 = crawled.size + uncrawledLive200.length;
console.log(JSON.stringify({
  snapshotDate: snapshot.generatedAt,
  publishedSnapshotRecords: snapshot.posts.length + snapshot.pages.length,
  notInLive200Crawl: outsideLive200.length,
  presentInCrawlWithNon200Status: outsideLive200.length - uncrawled.length,
  completelyAbsentFromCrawl: uncrawled.length,
  verifiedLiveRedirects: count((row) => uncrawledRedirectPaths.has(row.path)),
  crawlLive200Rows: crawl.filter((row) => row.status_code === '200').length,
  uniqueCrawlLive200Paths: crawled.size,
  uncrawledLive200Paths: uncrawledLive200.length,
  knownUniqueLive200Paths: knownLive200,
  knownUniqueLive200WithAsset: crawledBuilt + uncrawledBuilt,
  knownUniqueLive200MissingAsset: knownLive200 - crawledBuilt - uncrawledBuilt,
  knownUniqueLive200AssetPercent: Number(((crawledBuilt + uncrawledBuilt) / knownLive200 * 100).toFixed(1)),
  alreadyHaveLocalAsset: count((row) => row.hasLocalAsset),
  safeTextButNoAsset: count((row) => !row.issues.length && !row.hasLocalAsset && !uncrawledRedirectPaths.has(row.path)),
  unsafeOrEmptyNoAsset: count((row) => !!row.issues.length && !row.hasLocalAsset),
  unsafeOrEmptyNoAssetSourceIndexable: uncrawledLive200.filter((row) => !!row.issues.length && !row.hasLocalAsset && !row.sourceNoindex).length,
  unsafeOrEmptyNoAssetSourceNoindex: uncrawledLive200.filter((row) => !!row.issues.length && !row.hasLocalAsset && row.sourceNoindex).length,
  safeNoAssetExamples: uncrawled.filter((row) => !row.issues.length && !row.hasLocalAsset && !uncrawledRedirectPaths.has(row.path)).slice(0, 25),
  unsafeNoAssetExamples: uncrawledLive200.filter((row) => !!row.issues.length && !row.hasLocalAsset),
  scope: 'Published staging snapshot URLs outside the dated live-200 crawl. The two redirect exceptions were verified by a separate read-only live HEAD probe on 2026-10-03. All other absent paths returned live 200 in that probe. These numbers measure inert local asset coverage, not SEO, content or publication approval.',
}, null, 2));
