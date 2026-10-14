// The launch build has no disk snapshot or live-content overlay fallback.
export const endpoint = import.meta.env?.WPGRAPHQL_ENDPOINT || process.env.WPGRAPHQL_ENDPOINT ||
  'https://wordpress-159231-2098144.cloudwaysapps.com/graphql';

export async function requestGraphql(query, variables = {}, fetchImpl = fetch) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetchImpl(endpoint, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query, variables }), signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) throw new Error(`WPGraphQL HTTP ${response.status}`);
      const result = await response.json();
      if (result.errors?.length) throw new Error(result.errors.map(e => e.message).join('; '));
      if (!result.data) throw new Error('WPGraphQL returned no data');
      return result.data;
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise(resolve => setTimeout(resolve, 750 * (attempt + 1)));
    }
  }
}

let pending;
export function launchContent() {
  return pending ??= readContent();
}

export async function readContent({ query = requestGraphql } = {}) {
  const records = [];
  const paths = new Set();
  for (const kind of ['posts', 'pages']) {
    let after = null;
    const cursors = new Set();
    do {
      const result = await query(`query LaunchContent($after: String) {
        ${kind}(first: 25, after: $after) {
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
