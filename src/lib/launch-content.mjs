import { mkdir, writeFile } from 'node:fs/promises';
import { createGraphqlClient } from './graphql-cache.mjs';
import { launchArchives } from './launch-archives.mjs';
import { resolveLaunchOffers } from './launch-offers.mjs';
// Section 0 permits resumable local reads; final launch uses WPGRAPHQL_FRESH=1.
export const endpoint = import.meta.env?.WPGRAPHQL_ENDPOINT || process.env.WPGRAPHQL_ENDPOINT ||
  'https://wordpress-159231-2098144.cloudwaysapps.com/graphql';

const fresh = (process.env.WPGRAPHQL_FRESH ?? import.meta.env?.WPGRAPHQL_FRESH) === '1';
const client = createGraphqlClient({ endpoint, fresh });
export const requestGraphql = (query, variables = {}) => client.request(query, variables);

let pending;
export function launchContent() {
  return pending ??= readContent().then(async records => {
    await resolveLaunchOffers(records, requestGraphql);
    const archiveReceipts = [];
    const archives = await launchArchives(records, {query:requestGraphql, endpoint, fresh, receipts:archiveReceipts});
    records.push(...archives.records);
    // Output-only receipt for launch gates, never a build input or fallback.
    await mkdir('outputs', { recursive: true });
    await writeFile('outputs/launch-source.json', JSON.stringify({ endpoint, fetchedAt: new Date().toISOString(),
      mode: fresh ? 'fresh' : 'resumable-local', receipts: [...client.receipts,...archiveReceipts], records, archiveRedirects:archives.redirects }));
    return records;
  });
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
