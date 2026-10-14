import { parseDocument } from 'htmlparser2';
import { latestContentSnapshot } from './migration-preview.mjs';
import { assessFeedFreshness } from './feed-freshness.mjs';

const stagingOrigin = 'https://wordpress-159231-2098144.cloudwaysapps.com';
const featureQuery = `query EveryTipHomepageColumns {
  posts(first: 50, where: { orderby: { field: DATE, order: DESC } }) {
    nodes { databaseId uri slug status title date modified }
    pageInfo { hasNextPage }
  }
}`;
export const stagingHomeFeatureFeedEnabled = () => process.env.MIGRATION_STAGING_HOME_FEATURE_READ === '1';

const featureType = (uri) => uri.endsWith('-seymour-biz.html') ? 'Horse racing'
  : uri.endsWith('-john-newsome.html') ? 'Football' : null;

function plainTitle(value) {
  const document = parseDocument(value, { decodeEntities: true });
  const text = (node) => node.type === 'text' ? node.data : (node.children ?? []).map(text).join('');
  return document.children.map(text).join('').replace(/\s+/g, ' ').trim();
}

export function selectHomepageFeatureCards(posts, { minimum = 4 } = {}) {
  if (!Array.isArray(posts) || !Number.isInteger(minimum) || minimum < 1) throw new Error('Invalid homepage feature feed');
  const seenIds = new Set();
  const seenPaths = new Set();
  let previousDate = Infinity;
  const cards = [];
  for (const post of posts) {
    const date = Date.parse(post?.date ?? '');
    const type = featureType(post?.uri ?? '');
    const slug = post?.uri?.slice(1, -'.html'.length);
    if (!Number.isSafeInteger(post?.databaseId) || post.databaseId <= 0 ||
        typeof post?.uri !== 'string' || !/^\/[a-z0-9-]+\.html$/.test(post.uri) ||
        typeof post?.slug !== 'string' || post.slug !== slug ||
        post.status !== 'publish' || typeof post.title !== 'string' || !plainTitle(post.title) ||
        !Number.isFinite(date) || date > previousDate ||
        seenIds.has(post.databaseId) || seenPaths.has(post.uri)) {
      throw new Error(`Invalid or unsorted homepage WordPress post ${post?.databaseId ?? 'unknown'}`);
    }
    previousDate = date;
    seenIds.add(post.databaseId);
    seenPaths.add(post.uri);
    if (!type) continue;
    cards.push({ id: post.databaseId, uri: post.uri, title: plainTitle(post.title), type,
      date: post.date.slice(0, 10), description: `Published ${post.date.slice(0, 10)} · Historical column preview` });
    if (cards.length === 4) break;
  }
  if (cards.length < minimum) throw new Error(`Homepage feature feed has only ${cards.length} validated columnist posts`);
  return cards;
}

/** Explicit read-only staging WPGraphQL refresh; it never enables article or offer links. */
export async function readStagingHomepageFeatures({
  endpoint = `${stagingOrigin}/graphql`, fetchImpl = fetch,
} = {}) {
  const url = new URL(endpoint);
  if (url.origin !== stagingOrigin || url.pathname !== '/graphql' || url.search || url.hash || url.username || url.password) {
    throw new Error('Homepage feature feed is restricted to EveryTip staging WPGraphQL');
  }
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: featureQuery }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Homepage feature WPGraphQL HTTP ${response.status}`);
  const payload = await response.json();
  if (payload?.errors?.length) throw new Error(`Homepage feature WPGraphQL error: ${payload.errors.map(({ message }) => message).join('; ')}`);
  const connection = payload?.data?.posts;
  if (!Array.isArray(connection?.nodes) || connection.nodes.length > 50 ||
      typeof connection.pageInfo?.hasNextPage !== 'boolean') throw new Error('Incomplete homepage feature connection');
  const cards = selectHomepageFeatureCards(connection.nodes);
  return { cards, freshness: assessFeedFreshness(cards[0].date, { maxAgeDays: 7 }),
    sourceMode: 'fresh-staging-wpgraphql-preview', capturedAt: new Date().toISOString() };
}

/** Dated snapshot by default. Opt-in errors fail closed rather than showing stale cards. */
export async function homepageFeaturePreview({
  snapshotRead = latestContentSnapshot, freshRead = readStagingHomepageFeatures,
} = {}) {
  if (process.env.MIGRATION_STAGING_HOME_FEATURE_READ === '1') return freshRead();
  const snapshot = await snapshotRead();
  if (!snapshot?.generatedAt) throw new Error('Missing dated homepage feature snapshot');
  if (!Array.isArray(snapshot.posts)) throw new Error('Missing dated homepage feature posts');
  // The public GraphQL snapshot contains published posts only and omits the status field.
  const posts = snapshot.posts.map((post) => ({ ...post, status: 'publish' }))
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const cards = selectHomepageFeatureCards(posts);
  return { cards, freshness: assessFeedFreshness(cards[0].date, { maxAgeDays: 7 }),
    sourceMode: 'dated-snapshot-preview', capturedAt: snapshot.generatedAt };
}
