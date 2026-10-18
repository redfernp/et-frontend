import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { createGraphqlClient } from './graphql-cache.mjs';
import { launchArchives } from './launch-archives.mjs';
import { resolveLaunchOffers } from './launch-offers.mjs';
// Default builds are incremental: listings are always fresh, and only new or changed records
// (plus every record with a tip table) are re-fetched. WPGRAPHQL_FRESH=1 re-fetches everything.
export const endpoint = import.meta.env?.WPGRAPHQL_ENDPOINT || process.env.WPGRAPHQL_ENDPOINT ||
  'https://wordpress-159231-2098144.cloudwaysapps.com/graphql';

const fresh = (process.env.WPGRAPHQL_FRESH ?? import.meta.env?.WPGRAPHQL_FRESH) === '1';
const client = createGraphqlClient({ endpoint, fresh });
export const requestGraphql = (query, variables = {}) => client.request(query, variables);

let pending;
export function launchContent() {
  return pending ??= (fresh ? readContent().then(async records => { await writeContentCache(records); return records; }) : readContentIncremental()).then(async records => {
    await resolveLaunchOffers(records, requestGraphql);
    const archiveReceipts = [];
    // Archive listings must reflect today's posts, so their GraphQL reads skip the disk cache;
    // the rendered archive SEO pages stay cached per URL unless this is a fresh build.
    const listingQuery = (document, variables) => requestGraphql(document, variables, { fresh: true });
    const archives = await launchArchives(records, {query:listingQuery, endpoint, fresh, receipts:archiveReceipts});
    records.push(...archives.records);
    // Output-only receipt for launch gates, never a build input or fallback.
    await mkdir('outputs', { recursive: true });
    await writeFile('outputs/launch-source.json', JSON.stringify({ endpoint, fetchedAt: new Date().toISOString(),
      mode: fresh ? 'fresh' : 'incremental', receipts: [...client.receipts,...archiveReceipts], records, archiveRedirects:archives.redirects }));
    return records;
  });
}

const recordFields = kind => `databaseId uri title content date modified status
  ${kind === 'pages' ? 'isPostsPage' : ''}
  seo { title metaDesc canonical metaRobotsNoindex metaRobotsNofollow }`;
const hasTipTable = record => /ninja_table_instance|footable_\d+/.test(record.content ?? '');
const contentCacheDir = process.env.EVERYTIP_CONTENT_CACHE || 'outputs/content-cache';

// Validate and collect one record, failing the whole build on bad or duplicate routes.
function acceptRecord(record, kind, records, paths) {
  if (record.isPostsPage && !record.uri) return;
  if (record.status !== 'publish' || !record.uri?.startsWith('/') || record.uri.startsWith('//') ||
    /[?#\\]/.test(record.uri) || record.uri.split('/').some(s => s === '..') || paths.has(record.uri)) {
    throw new Error(`Invalid/duplicate published route: ${record.databaseId} ${record.uri}`);
  }
  paths.add(record.uri);
  records.push({ ...record, kind });
}

async function readCached(kind, id) {
  // Entries carry their source endpoint, so a staging cache is never reused for a live build.
  try { const hit = JSON.parse(await readFile(`${contentCacheDir}/${kind}-${id}.json`, 'utf8')); return hit.endpoint === endpoint ? hit : null; }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
export async function writeContentCache(records) {
  await mkdir(contentCacheDir, { recursive: true });
  for (const record of records) {
    if (!['posts', 'pages'].includes(record.kind)) continue;
    const file = `${contentCacheDir}/${record.kind}-${record.databaseId}.json`;
    const { kind, ...rest } = record;
    await writeFile(`${file}.tmp`, JSON.stringify({ ...rest, endpoint })); await rename(`${file}.tmp`, file);
  }
}

// Incremental source read. The listing (id, uri, modified) is fetched fresh every time, so new,
// unpublished and deleted records are always right. Content comes from the per-record cache
// unless the record is new, its modified date changed, or it embeds a tip table: table rows are
// rendered into the content and editing a row does not change the post's modified date.
export async function readContentIncremental({ query = requestGraphql } = {}) {
  const records = [];
  const paths = new Set();
  const refreshed = [];
  for (const kind of ['posts', 'pages']) {
    const listing = [];
    let after = null;
    const cursors = new Set();
    do {
      const result = await query(`query LaunchListing($after: String) {
        ${kind}(first: 100, after: $after) {
          nodes { databaseId uri modified status ${kind === 'pages' ? 'isPostsPage' : ''} }
          pageInfo { endCursor hasNextPage }
        }
      }`, { after }, { fresh: true });
      const connection = result[kind];
      if (!Array.isArray(connection?.nodes) || typeof connection.pageInfo?.hasNextPage !== 'boolean') throw new Error(`Incomplete ${kind} listing`);
      listing.push(...connection.nodes);
      if (!connection.pageInfo.hasNextPage) break;
      after = connection.pageInfo.endCursor;
      if (!after || cursors.has(after) || !connection.nodes.length) throw new Error(`Listing stalled: ${kind}`);
      cursors.add(after);
    } while (true);

    const cached = new Map();
    const stale = [];
    for (const node of listing) {
      const hit = await readCached(kind, node.databaseId);
      if (hit && hit.modified === node.modified && hit.uri === node.uri && !hasTipTable(hit)) cached.set(node.databaseId, hit);
      else stale.push(node.databaseId);
    }
    const fetched = new Map();
    for (let index = 0; index < stale.length; index += 5) {
      const ids = stale.slice(index, index + 5);
      const result = await query(`query LaunchRecords($ids: [ID]) {
        ${kind}(first: 5, where: { in: $ids }) { nodes { ${recordFields(kind)} } }
      }`, { ids }, { fresh: true });
      if (!Array.isArray(result[kind]?.nodes)) throw new Error(`Incomplete ${kind} records`);
      for (const record of result[kind].nodes) fetched.set(record.databaseId, record);
      console.log(`WPGraphQL ${kind}: refreshed ${Math.min(index + 5, stale.length)}/${stale.length}`);
    }
    for (const node of listing) {
      const record = fetched.get(node.databaseId) ?? cached.get(node.databaseId);
      if (!record) throw new Error(`Record ${kind} ${node.databaseId} missing from the source`);
      acceptRecord(record, kind, records, paths);
    }
    refreshed.push(...[...fetched.values()].map(record => ({ ...record, kind })));
    console.log(`Incremental WPGraphQL: ${listing.length} ${kind}, ${fetched.size} re-fetched, ${cached.size} from cache`);
  }
  if (!paths.has('/')) throw new Error('Staging homepage missing');
  await writeContentCache(refreshed);
  return records;
}

export async function readContent({ query = requestGraphql } = {}) {
  const records = [];
  const paths = new Set();
  for (const kind of ['posts', 'pages']) {
    let after = null;
    const cursors = new Set();
    do {
      const result = await query(`query LaunchContent($after: String) {
        ${kind}(first: 5, after: $after) {
          nodes { databaseId uri title content date modified status
            ${kind === 'pages' ? 'isPostsPage' : ''}
            seo { title metaDesc canonical metaRobotsNoindex metaRobotsNofollow }
          }
          pageInfo { endCursor hasNextPage }
        }
      }`, { after });
      const connection = result[kind];
      if (!Array.isArray(connection?.nodes) || typeof connection.pageInfo?.hasNextPage !== 'boolean') {
        throw new Error(`Incomplete ${kind} connection`);
      }
      for (const record of connection.nodes) {
        if (record.isPostsPage && !record.uri) continue;
        if (record.status !== 'publish' || !record.uri?.startsWith('/') || record.uri.startsWith('//') ||
          /[?#\\]/.test(record.uri) || record.uri.split('/').some(s => s === '..') || paths.has(record.uri)) {
          throw new Error(`Invalid/duplicate published route: ${record.databaseId} ${record.uri}`);
        }
        paths.add(record.uri);
        records.push({ ...record, kind });
      }
      console.log(`WPGraphQL ${kind}: ${records.filter(r => r.kind === kind).length} records fetched`);
      if (!connection.pageInfo.hasNextPage) break;
      after = connection.pageInfo.endCursor;
      if (!after || cursors.has(after) || !connection.nodes.length) throw new Error(`Pagination stalled: ${kind}`);
      cursors.add(after);
    } while (true);
    console.log(`Fresh WPGraphQL: ${records.filter(r => r.kind === kind).length} ${kind}`);
  }
  if (!paths.has('/')) throw new Error('Staging homepage missing');
  return records;
}

export function robotsFor(record) {
  return [record.seo?.metaRobotsNoindex || 'index', record.seo?.metaRobotsNofollow || 'follow'].join(', ');
}
