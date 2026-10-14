const stagingOrigin = 'https://wordpress-159231-2098144.cloudwaysapps.com';
const pageSize = 50;
const maxPagesPerKind = 100;

async function fetchConnectionPage(url, kind, after, fetchImpl) {
  const options = {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: connectionQuery(kind), variables: { after } }),
  };
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetchImpl(url, { ...options, signal: AbortSignal.timeout(30000) });
      if (!response.ok) {
        if ((response.status === 429 || response.status >= 500) && attempt < 3) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 500));
          continue;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      return validateDiscoveryPage(await response.json(), kind, after);
    } catch (error) {
      if (attempt === 3 || /Incomplete|Invalid published|discovery error|Oversized/.test(error.message)) {
        throw new Error(`WPGraphQL ${kind} discovery failed after cursor ${after ?? 'START'}: ${error.message}`, { cause: error });
      }
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
  throw new Error(`WPGraphQL ${kind} discovery exhausted retries`);
}

function connectionQuery(kind) {
  if (kind !== 'posts' && kind !== 'pages') throw new Error(`Unsupported WordPress connection: ${kind}`);
  return `query EveryTipPublished${kind === 'posts' ? 'Posts' : 'Pages'}($after: String) {
    ${kind}(first: ${pageSize}, after: $after) {
      nodes { __typename databaseId uri slug status title modified ${kind === 'pages' ? 'isPostsPage' : ''} }
      pageInfo { endCursor hasNextPage }
    }
  }`;
}

function validatePath(uri) {
  return typeof uri === 'string' && uri.startsWith('/') && !uri.startsWith('//') &&
    !/[?#%\\\s\u0000-\u001f]/.test(uri) && !uri.includes('//') &&
    !uri.split('/').some((segment) => segment === '.' || segment === '..');
}

export function validateDiscoveryPage(payload, kind, after) {
  if (payload?.errors?.length) throw new Error(`WPGraphQL ${kind} discovery error: ${payload.errors.map(({ message }) => message).join('; ')}`);
  const connection = payload?.data?.[kind];
  const pageInfo = connection?.pageInfo;
  if (!Array.isArray(connection?.nodes) || typeof pageInfo?.hasNextPage !== 'boolean' ||
      (pageInfo.hasNextPage && (typeof pageInfo.endCursor !== 'string' || !pageInfo.endCursor || pageInfo.endCursor === after || !connection.nodes.length))) {
    throw new Error(`Incomplete WPGraphQL ${kind} connection page after ${after ?? 'START'}`);
  }
  if (connection.nodes.length > pageSize) throw new Error(`Oversized WPGraphQL ${kind} connection page`);
  const expectedType = kind === 'posts' ? 'Post' : 'Page';
  for (const node of connection.nodes) {
    // WordPress's assigned posts-index Page is published but WPGraphQL does
    // not give it a URI. It is CMS configuration, not an exact frontend route.
    const assignedPostsIndex = kind === 'pages' && node?.uri === null && node?.isPostsPage === true;
    if (node?.__typename !== expectedType || !Number.isSafeInteger(node.databaseId) || node.databaseId <= 0 ||
        (!validatePath(node.uri) && !assignedPostsIndex) || typeof node.slug !== 'string' || !node.slug.trim() ||
        node.status !== 'publish' || typeof node.title !== 'string' || typeof node.modified !== 'string' || !node.modified) {
      throw new Error(`Invalid published ${kind} discovery node ${node?.databaseId ?? 'unknown'} at ${node?.uri ?? 'missing URI'}`);
    }
  }
  return connection;
}

/**
 * Read-only staging inventory. This does not replace the dated exact-route
 * registry: a complete, validated result is required before anyone compares
 * or promotes its URLs. Explicit local opt-in prevents accidental build reads.
 */
export async function discoverPublishedContent({
  endpoint = `${stagingOrigin}/graphql`,
  fetchImpl = fetch,
  onProgress = () => {},
} = {}) {
  if (process.env.MIGRATION_STAGING_DISCOVERY !== '1' && process.env.MIGRATION_STAGING_GENERIC_READ !== '1') {
    throw new Error('Published-content discovery requires an explicit staging read opt-in');
  }
  const url = new URL(endpoint);
  if (url.origin !== stagingOrigin || url.pathname !== '/graphql' || url.search || url.hash || url.username || url.password) {
    throw new Error('Published-content discovery is restricted to EveryTip staging WPGraphQL');
  }
  const paths = new Set();
  const ids = new Set();
  const result = { posts: [], pages: [], nonRoutablePages: [], discoveredAt: null, source: 'staging-wpgraphql-read-only' };
  for (const kind of ['posts', 'pages']) {
    const seenCursors = new Set();
    let after = null;
    let complete = false;
    for (let page = 0; page < maxPagesPerKind; page++) {
      const connection = await fetchConnectionPage(url, kind, after, fetchImpl);
      for (const node of connection.nodes) {
        if (node.uri !== null && paths.has(node.uri)) throw new Error(`Duplicate published WordPress URI: ${node.uri}`);
        if (ids.has(node.databaseId)) throw new Error(`Duplicate published WordPress ID: ${node.databaseId}`);
        if (node.uri !== null) paths.add(node.uri);
        ids.add(node.databaseId);
        if (node.uri === null) result.nonRoutablePages.push(node);
        else result[kind].push(node);
      }
      onProgress({ kind, page: page + 1, count: result[kind].length });
      if (!connection.pageInfo.hasNextPage) { complete = true; break; }
      after = connection.pageInfo.endCursor;
      if (seenCursors.has(after)) throw new Error(`Repeated WPGraphQL ${kind} cursor: ${after}`);
      seenCursors.add(after);
    }
    if (!complete) throw new Error(`WPGraphQL ${kind} discovery exceeded ${maxPagesPerKind} pages`);
  }
  result.discoveredAt = new Date().toISOString();
  return result;
}
