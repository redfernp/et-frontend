import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const endpoint = process.env.WPGRAPHQL_ENDPOINT ?? 'https://wordpress-159231-2098144.cloudwaysapps.com/graphql';
const outputDirectory = fileURLToPath(new URL('../data/raw/', import.meta.url));
const fields = 'databaseId uri slug title content date modified seo { title metaDesc canonical metaRobotsNoindex metaRobotsNofollow }';

async function query(query, variables) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query, variables }),
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (result.errors?.length) throw new Error(result.errors.map((error) => error.message).join('; '));
      if (!result.data) throw new Error('GraphQL returned no data');
      return result.data;
    } catch (error) {
      if (attempt === 3) throw error;
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
    }
  }
}

async function collect(kind) {
  const nodes = [];
  const unroutable = [];
  const seen = new Set();
  let after = null;
  const document = `query Snapshot($after: String) { ${kind}(first: 50, after: $after) { nodes { ${fields} } pageInfo { endCursor hasNextPage } } }`;
  do {
    const data = await query(document, { after });
    const connection = data[kind];
    if (!Array.isArray(connection?.nodes) || !connection.pageInfo) throw new Error(`Invalid ${kind} connection`);
    for (const node of connection.nodes) {
      if (!node.uri?.startsWith('/') || seen.has(node.uri)) {
        unroutable.push({ databaseId: node.databaseId, title: node.title, uri: node.uri, reason: seen.has(node.uri) ? 'duplicate' : 'missing-or-invalid-uri' });
        continue;
      }
      seen.add(node.uri);
      nodes.push(node);
    }
    const next = connection.pageInfo.hasNextPage ? connection.pageInfo.endCursor : null;
    if (connection.pageInfo.hasNextPage && !next) throw new Error(`Pagination cursor missing for ${kind}`);
    if (next && next === after) throw new Error(`Pagination cursor stalled for ${kind}`);
    after = next;
    console.log(`${kind}: ${nodes.length} routable, ${unroutable.length} exceptions`);
  } while (after);
  return { nodes, unroutable };
}

const posts = await collect('posts');
const pages = await collect('pages');
const generatedAt = new Date().toISOString();
const output = {
  source: endpoint,
  generatedAt,
  counts: { posts: posts.nodes.length, pages: pages.nodes.length, unroutable: posts.unroutable.length + pages.unroutable.length },
  posts: posts.nodes,
  pages: pages.nodes,
  unroutable: { posts: posts.unroutable, pages: pages.unroutable },
};
await mkdir(outputDirectory, { recursive: true });
const filename = `staging-wordpress-public-${generatedAt.replace(/[:.]/g, '-')}.json`;
const path = fileURLToPath(new URL(`../data/raw/${filename}`, import.meta.url));
await writeFile(path, JSON.stringify(output));
console.log(`Saved complete public snapshot: ${path}`);
