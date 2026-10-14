import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const raw = new URL('data/raw/', root);
const endpoint = process.env.WPGRAPHQL_ENDPOINT ?? 'https://wordpress-159231-2098144.cloudwaysapps.com/graphql';
const slugs = {
  category: ['betfair-profits', 'betting-guides', 'sports-tips', 'bookmaker-reviews', 'news'],
  tag: ['bet365', 'uk-racing', 'football-betting', 'sub-on-play-on', 'world-cup-2026'],
  user: ['erick', 'jnewsome', 'everyt', 'seymourb'],
};

async function query(document) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ query: document }),
        signal: AbortSignal.timeout(30000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (result.errors?.length) throw new Error(result.errors.map((item) => item.message).join('; '));
      return result.data?.archive ?? null;
    } catch (error) {
      if (attempt === 2) throw error;
      await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 1000));
    }
  }
}

const files = (await readdir(raw)).filter((name) => /^staging-wordpress-public-.*\.json$/.test(name)).sort();
if (!files.length) throw new Error('No staging WordPress public snapshot');
const source = JSON.parse(await readFile(new URL(files.at(-1), raw), 'utf8'));
const archives = {};
for (const [type, names] of Object.entries(slugs)) {
  for (const slug of names) {
    const field = type === 'user' ? 'user' : type;
    const posts = [];
    let after = null;
    let archive = null;
    const requiredPages = type === 'user' && slug === 'everyt' ? 5 : 1;
    for (let page = 0; page < requiredPages; page++) {
      const document = `{ archive: ${field}(id: ${JSON.stringify(slug)}, idType: SLUG) { name slug uri posts(first: 100${after ? `, after: ${JSON.stringify(after)}` : ''}) { nodes { databaseId uri title date } pageInfo { endCursor hasNextPage } } } }`;
      archive = await query(document);
      if (!archive) break;
      posts.push(...(archive.posts?.nodes ?? []).filter((post) => post.uri?.startsWith('/')));
      if (!archive.posts?.pageInfo?.hasNextPage) break;
      if (!archive.posts.pageInfo.endCursor || archive.posts.pageInfo.endCursor === after) throw new Error(`Stalled ${type}/${slug} cursor`);
      after = archive.posts.pageInfo.endCursor;
    }
    archives[`${type}/${slug}`] = archive ? { name: archive.name, slug: archive.slug, uri: archive.uri, posts } : null;
    console.log(`${type}/${slug}: ${archives[`${type}/${slug}`]?.posts.length ?? 'not found'} posts`);
  }
}
await mkdir(raw, { recursive: true });
const generatedAt = new Date().toISOString();
const file = `staging-wordpress-archives-${generatedAt.replace(/[:.]/g, '-')}.json`;
await writeFile(new URL(file, raw), JSON.stringify({ source: endpoint, generatedAt, postSnapshot: files.at(-1), archives, blogPosts: source.posts.map(({ databaseId, uri, title, date }) => ({ databaseId, uri, title, date })).sort((a, b) => b.date.localeCompare(a.date)) }));
console.log(`Saved ${file}`);
