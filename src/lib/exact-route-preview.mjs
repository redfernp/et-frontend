import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { assessContent, latestContentSnapshot } from './migration-preview.mjs';
import { columnistKeyForUri, getColumnistProfiles } from './columnist-profiles.mjs';
import { curatedExactPaths, curatedPreviewSections, curatedReasonMatches } from './curated-exact-preview.mjs';
import { freshGenericRecordMap } from './staging-generic-cms.mjs';
import { representativeArticle } from './staging-article-cms.mjs';
import { johnWeek7 } from './live-john-week7.mjs';
import { seymourOct10 } from './live-seymour-oct10.mjs';
import { seymourOct3 } from './live-seymour-oct3.mjs';
import { patentBetPreviewRecord } from './patent-bet-preview.mjs';
import { verifiedLegacyRedirects } from './legacy-redirects.mjs';
import { ownerRewritePreviewRecords, ownerRewriteSources } from './owner-rewrite-preview.mjs';

const crawlPath = resolve(process.cwd(), 'docs/everytip-template-map-2026-09-30.csv');
const separateRouteFamilies = new Set(['homepage', 'editorial-archive', 'query-variant']);
const dedicatedRoundupPaths = new Set([
  '/best-paypal-betting-sites.html',
  '/low-or-no-minimum-deposit-betting-sites.html',
  '/online-bookmakers-that-accept-neteller.html',
  '/online-bookmakers-that-accept-skrill.html',
  '/best-betting-sites-for-basketball.html',
]);
const dedicatedLegalPaths = new Set(['/safer-gambling', '/terms-conditions', '/privacy-policy']);
const dedicatedWeeklyArchivePaths = new Set(['/saturday-horse-racing-tips', '/english-premier-league-predictions-for-saturday']);
const dedicatedReviewPaths = new Set(['/bet365-review']);
const dedicatedTipsHubPaths = new Set(['/free-horse-racing-tips']);
const dailyOct13 = Object.freeze({ id: 91113, slug: 'extra-place-races-today-tips-13-october', uri: '/extra-place-races-today-tips-13-october.html' });
const dailyOct12 = Object.freeze({ id: 91093, slug: 'extra-place-races-today-tips-12-october', uri: '/extra-place-races-today-tips-12-october.html' });
const dailyOct11 = Object.freeze({ id: 91076, slug: 'extra-place-races-today-tips-11-october', uri: '/extra-place-races-today-tips-11-october.html' });
const johnWeek6 = Object.freeze({ id: 90942, slug: 'epl-game-week-6-2026-27-season-premier-league-tips-john-newsome', uri: '/epl-game-week-6-2026-27-season-premier-league-tips-john-newsome.html' });
const dedicatedLiveArticlePaths = new Set([johnWeek7.uri, johnWeek6.uri, seymourOct10.uri, seymourOct3.uri, dailyOct13.uri, dailyOct12.uri, dailyOct11.uri]);
// Redirects must not be rebuilt as local 200 pages from an older CMS snapshot.
export const uncrawledRedirectPaths = new Set(verifiedLegacyRedirects.keys());

export function parseCrawlCsv(source) {
  const rows = [];
  let row = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') { value += '"'; index++; }
      else if (char === '"') quoted = false;
      else value += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(value); value = ''; }
    else if (char === '\n') { row.push(value); rows.push(row); row = []; value = ''; }
    else if (char !== '\r') value += char;
  }
  if (quoted) throw new Error('Unclosed quoted field in crawl CSV');
  if (value || row.length) { row.push(value); rows.push(row); }
  const [headers, ...data] = rows;
  if (!headers?.includes('path') || !headers.includes('status_code')) throw new Error('Crawl CSV is missing required columns');
  return data.map((values, index) => {
    if (values.length !== headers.length) throw new Error(`Malformed crawl CSV row ${index + 2}`);
    return Object.fromEntries(headers.map((header, column) => [header, values[column]]));
  });
}

export function isSafeExactPath(path) {
  return typeof path === 'string'
    && path.startsWith('/')
    && path !== '/'
    && !path.endsWith('/')
    && !/[?#%\\\s\u0000-\u001f]/.test(path)
    && !path.includes('//')
    && !path.split('/').some((segment) => segment === '.' || segment === '..')
    && !path.startsWith('/pilot/')
    && !path.startsWith('/migration-preview/');
}

/** Each live 200 path is included once or excluded with an explicit reason. */
export function planExactRoutePreview(snapshot, crawl) {
  const records = new Map();
  const duplicateSnapshotUris = new Set();
  for (const [kind, items] of [['post', snapshot.posts], ['page', snapshot.pages]]) for (const record of items) {
    if (records.has(record.uri)) duplicateSnapshotUris.add(record.uri);
    else records.set(record.uri, { record, kind });
  }
  const seenCrawlPaths = new Set();
  const included = [];
  const excluded = [];
  for (const row of crawl) {
    if (row.status_code !== '200') continue;
    const path = row.path;
    let reason;
    if (seenCrawlPaths.has(path)) reason = 'duplicate-crawl-path';
    else seenCrawlPaths.add(path);
    if (!reason && !isSafeExactPath(path)) reason = 'unsafe-or-reserved-path';
    if (!reason && verifiedLegacyRedirects.has(path)) reason = 'verified-live-redirect';
    if (!reason && separateRouteFamilies.has(row.suggested_template)) reason = 'separate-route-family';
    if (!reason && dedicatedRoundupPaths.has(path)) reason = 'dedicated-roundup-template';
    if (!reason && dedicatedLegalPaths.has(path)) reason = 'dedicated-legal-template';
    if (!reason && dedicatedWeeklyArchivePaths.has(path)) reason = 'dedicated-weekly-archive-template';
    if (!reason && dedicatedReviewPaths.has(path)) reason = 'dedicated-review-template';
    if (!reason && dedicatedTipsHubPaths.has(path)) reason = 'dedicated-tips-hub-template';
    if (!reason && dedicatedLiveArticlePaths.has(path)) reason = 'dedicated-live-article-template';
    if (!reason && duplicateSnapshotUris.has(path)) reason = 'duplicate-snapshot-uri';
    const entry = records.get(path);
    const record = entry?.record;
    if (!reason && !record) reason = 'missing-snapshot-record';
    if (!reason) {
      const issues = assessContent(record);
      if (issues.length) reason = `unsafe-content:${issues.join('+')}`;
    }
    if (reason) excluded.push({ path, reason, template: row.suggested_template });
    else included.push({ row, record, kind: entry.kind });
  }
  const counts = Object.fromEntries(
    [...new Set(excluded.map(({ reason }) => reason))].sort()
      .map((reason) => [reason, excluded.filter((item) => item.reason === reason).length]),
  );
  return { included, excluded, counts };
}

export function selectExactRoutePreview(snapshot, crawl) {
  return planExactRoutePreview(snapshot, crawl).included;
}

/** Published CMS paths omitted by the external crawl. Preview only: noindex. */
export function supplementalPublishedPreviewRows(snapshot, crawl) {
  const crawlPaths = new Set(crawl.map(({ path }) => path));
  const excludedDedicated = new Set([representativeArticle.uri, ...dedicatedWeeklyArchivePaths, ...dedicatedReviewPaths, ...dedicatedTipsHubPaths, ...dedicatedLiveArticlePaths]);
  const records = [...snapshot.posts.map((record) => ({ record, kind: 'post' })),
    ...snapshot.pages.map((record) => ({ record, kind: 'page' }))];
  const duplicates = new Set();
  const seen = new Set();
  for (const { record } of records) {
    if (seen.has(record.uri)) duplicates.add(record.uri);
    seen.add(record.uri);
  }
  return records.filter(({ record }) => !crawlPaths.has(record.uri)
      && !excludedDedicated.has(record.uri) && !uncrawledRedirectPaths.has(record.uri) && !duplicates.has(record.uri)
      && isSafeExactPath(record.uri) && (!assessContent(record).length || record.uri === '/what-is-a-patent-bet'))
    .map(({ record, kind }) => ({ record: record.uri === '/what-is-a-patent-bet' ? patentBetPreviewRecord(record) : record, kind, row: {
      path: record.uri, indexability: 'Non-Indexable', canonical: '',
      suggested_template: 'uncrawled-published-cms-preview', unverified_crawl_path: true,
      withheld_widget: record.uri === '/what-is-a-patent-bet' ? 'patent-calculator' : undefined,
    } }));
}

export async function exactRoutePreviewPaths() {
  if (process.env.MIGRATION_EXACT_PREVIEW !== '1') return [];
  const snapshot = await latestContentSnapshot();
  if (!snapshot) throw new Error('MIGRATION_EXACT_PREVIEW requires a staging WordPress snapshot.');
  const crawl = parseCrawlCsv(await readFile(crawlPath, 'utf8'));
  const profiles = await getColumnistProfiles();
  const plan = planExactRoutePreview(snapshot, crawl);
  const supplemental = supplementalPublishedPreviewRows(snapshot, crawl);
  const combinedPlan = { ...plan, included: [...plan.included, ...supplemental] };
  const fresh = await freshGenericRecordMap(snapshot, combinedPlan, {
    reservedNewEntries: new Map([
      [johnWeek7.uri, { databaseId: johnWeek7.id, slug: johnWeek7.slug }],
      [johnWeek6.uri, { databaseId: johnWeek6.id, slug: johnWeek6.slug }],
      [seymourOct10.uri, { databaseId: seymourOct10.id, slug: seymourOct10.slug }],
      [seymourOct3.uri, { databaseId: seymourOct3.id, slug: seymourOct3.slug }],
      [dailyOct13.uri, { databaseId: dailyOct13.id, slug: dailyOct13.slug }],
      [dailyOct12.uri, { databaseId: dailyOct12.id, slug: dailyOct12.slug }],
      [dailyOct11.uri, { databaseId: dailyOct11.id, slug: dailyOct11.slug }],
    ]),
  });
  const curated = new Set(curatedExactPaths);
  const records = new Map([...snapshot.posts, ...snapshot.pages].map((record) => [record.uri, record]));
  const crawlPaths = new Set(crawl.map(({ path }) => path));
  const uncrawledCurated = curatedExactPaths.filter((path) => !crawlPaths.has(path)).map((path) => {
    const record = records.get(path);
    const reason = path === '/bet365-review-redesign' ? 'uncrawled-inline-style' : 'uncrawled-builder';
    const unsafeSignal = reason === 'uncrawled-inline-style' ? 'inline-style' : 'builder-markup';
    if (!record || !curatedReasonMatches(path, reason) || !assessContent(record).includes(unsafeSignal) || uncrawledRedirectPaths.has(path)) {
      throw new Error(`Uncrawled curated source needs review: ${path}`);
    }
    return { path, reason };
  });
  const curatedRows = [...plan.excluded.filter(({ path, reason }) => curated.has(path) && curatedReasonMatches(path, reason)), ...uncrawledCurated];
  if (curatedRows.length !== curated.size) throw new Error('Curated exact-route selection no longer matches the crawl and safety audit');
  console.log(`Exact-URL noindex preview: ${plan.included.length} crawled general + ${supplemental.length} uncrawled published + ${fresh.newEntries.length} newly published + ${curatedRows.length} curated paths; ${fresh.modifiedCount} records changed since snapshot. Reasons: ${JSON.stringify(plan.counts)}`);
  const general = [...combinedPlan.included, ...fresh.newEntries].map(({ row, record, kind }) => ({
    params: { legacyPath: row.path.slice(1) },
    props: { record: fresh.records.get(record.databaseId) ?? record, contentKind: kind, crawlRow: row,
      snapshotDate: fresh.records.has(record.databaseId) ? fresh.records.get(record.databaseId).fetchedAt : snapshot.generatedAt,
      columnist: profiles[columnistKeyForUri(record.uri)] ?? null },
  }));
  const curatedPaths = curatedRows.map(({ path }) => {
    const row = crawl.find((item) => item.path === path) ?? { path, indexability: 'Non-Indexable', canonical: '',
      suggested_template: 'uncrawled-curated-review-preview', unverified_crawl_path: true };
    const record = records.get(path);
    return {
      params: { legacyPath: path.slice(1) },
      props: { record, contentKind: snapshot.posts.includes(record) ? 'post' : 'page', crawlRow: row, snapshotDate: snapshot.generatedAt, columnist: null, curatedSections: curatedPreviewSections(record) },
    };
  });
  const ownerRewrites = await ownerRewritePreviewRecords();
  if (ownerRewrites.length !== ownerRewriteSources.length) throw new Error('Owner rewrite preview count changed');
  const occupiedPaths = new Set([...general, ...curatedPaths].map((entry) => `/${entry.params.legacyPath}`));
  const handoffPaths = ownerRewrites.map(({ source, record, contentKind }) => {
    const row = crawl.find((item) => item.path === source.uri && item.status_code === '200');
    const excluded = plan.excluded.find((item) => item.path === source.uri);
    if (!row || excluded?.reason !== source.oldExclusion || occupiedPaths.has(source.uri)
      || verifiedLegacyRedirects.has(source.uri)) {
      throw new Error(`Owner rewrite route needs fresh identity review: ${source.uri}`);
    }
    return { params: { legacyPath: source.uri.slice(1) }, props: {
      record, contentKind, crawlRow: row, snapshotDate: '2026-10-04T00:00:00', columnist: null,
    } };
  });
  return [...general, ...curatedPaths, ...handoffPaths];
}
