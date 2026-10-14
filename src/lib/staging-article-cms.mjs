import { assessContent, latestContentSnapshot } from './migration-preview.mjs';

const stagingOrigin = 'https://wordpress-159231-2098144.cloudwaysapps.com';

export const representativeArticle = Object.freeze({
  databaseId: 90485,
  uri: '/epl-game-week-5-2026-27-season-premier-league-tips-john-newsome.html',
  slug: 'epl-game-week-5-2026-27-season-premier-league-tips-john-newsome',
});

const query = `query EveryTipArticleById($id: ID!) {
  post(id: $id, idType: DATABASE_ID) {
    databaseId uri slug status title content date modified
    seo { title metaDesc canonical metaRobotsNoindex metaRobotsNofollow }
  }
}`;

export function validateArticleRead(payload, expected = representativeArticle) {
  if (payload?.errors?.length) throw new Error(`Article WPGraphQL error: ${payload.errors.map(({ message }) => message).join('; ')}`);
  const post = payload?.data?.post;
  if (post?.databaseId !== expected.databaseId || post.uri !== expected.uri || post.slug !== expected.slug ||
      post.status !== 'publish' || !post.title?.trim() || !post.content?.trim() || !post.date || !post.modified) {
    throw new Error(`Staging article ${expected.databaseId} identity, publication state or content mismatch`);
  }
  const seo = post.seo;
  if (!seo || typeof seo.title !== 'string' || typeof seo.metaDesc !== 'string' ||
      typeof seo.metaRobotsNoindex !== 'string' || typeof seo.metaRobotsNofollow !== 'string') {
    throw new Error(`Staging article ${expected.databaseId} SEO contract mismatch`);
  }
  return { ...post, sourceMode: 'fresh-staging-wpgraphql-preview', fetchedAt: new Date().toISOString() };
}

/** Read-only public WPGraphQL query to the exact staging host. */
export async function readStagingArticle(expected = representativeArticle, { fetchImpl = fetch, endpoint = `${stagingOrigin}/graphql` } = {}) {
  const url = new URL(endpoint);
  if (url.origin !== stagingOrigin || url.pathname !== '/graphql' || url.search || url.hash || url.username || url.password) {
    throw new Error('Article CMS read is restricted to EveryTip staging WPGraphQL');
  }
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { id: String(expected.databaseId) } }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Staging article WPGraphQL HTTP ${response.status}`);
  return validateArticleRead(await response.json(), expected);
}

/** Explicit pilot switch. A failed fresh read never silently falls back. */
export async function representativeArticlePreview({ freshRead = readStagingArticle, snapshotRead = latestContentSnapshot } = {}) {
  if (process.env.MIGRATION_STAGING_ARTICLE_READ === '1') return freshRead();
  const snapshot = await snapshotRead();
  const record = snapshot?.posts.find(({ uri }) => uri === representativeArticle.uri);
  if (!record || record.databaseId !== representativeArticle.databaseId || record.slug !== representativeArticle.slug) {
    throw new Error('Dated article preview snapshot is missing the representative post');
  }
  return { ...record, sourceMode: 'dated-snapshot-preview', fetchedAt: snapshot.generatedAt };
}

/** Use a fresh record only for the one exact-path pilot; never change route discovery. */
export async function exactArticlePreviewRecord(snapshotRecord, { freshRead = readStagingArticle } = {}) {
  if (snapshotRecord?.databaseId !== representativeArticle.databaseId ||
      snapshotRecord.uri !== representativeArticle.uri || snapshotRecord.slug !== representativeArticle.slug) {
    throw new Error('Exact article preview snapshot identity mismatch');
  }
  if (process.env.MIGRATION_STAGING_ARTICLE_READ !== '1') {
    return { record: snapshotRecord, sourceMode: 'dated-snapshot-preview' };
  }
  const fresh = validateArticleRead({ data: { post: await freshRead() } });
  const unsafe = assessContent(fresh);
  if (unsafe.length) throw new Error(`Fresh exact article requires editorial conversion: ${unsafe.join(', ')}`);
  return { record: fresh, sourceMode: 'fresh-staging-wpgraphql-preview' };
}
