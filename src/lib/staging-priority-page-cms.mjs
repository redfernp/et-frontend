// Explicit, read-only WPGraphQL refresh for the three highest-priority pages.
// This is a preview data source, not a publication/offer approval switch.
const stagingOrigin = 'https://wordpress-159231-2098144.cloudwaysapps.com';
export const priorityPages = Object.freeze({
  '/': 16,
  '/free-betting-tips': 76939,
  '/bookie-free-bets-bonus-offers': 56315,
});

const query = `query EveryTipPriorityPage($id: ID!) {
  page(id: $id, idType: DATABASE_ID) {
    databaseId uri slug status title content date modified
    seo { title metaDesc canonical metaRobotsNoindex metaRobotsNofollow }
  }
}`;

export function validatePriorityPage(payload, expected) {
  if (payload?.errors?.length) throw new Error(`Priority page WPGraphQL error: ${payload.errors.map(({ message }) => message).join('; ')}`);
  const page = payload?.data?.page;
  if (!page || priorityPages[expected?.uri] !== expected.databaseId ||
      page.databaseId !== expected.databaseId || page.uri !== expected.uri ||
      page.slug !== expected.slug || page.status !== 'publish' ||
      !page.title?.trim() || !page.content?.trim() || !page.modified) {
    throw new Error(`Priority page identity, state or body mismatch: ${expected?.uri}`);
  }
  if (!page.seo || typeof page.seo.title !== 'string' || typeof page.seo.metaDesc !== 'string' ||
      typeof page.seo.metaRobotsNoindex !== 'string') {
    throw new Error(`Priority page SEO contract mismatch: ${expected.uri}`);
  }
  return { ...page, sourceMode: 'fresh-staging-wpgraphql-preview', fetchedAt: new Date().toISOString() };
}

export async function readStagingPriorityPage(expected, { fetchImpl = fetch, endpoint = `${stagingOrigin}/graphql` } = {}) {
  const url = new URL(endpoint);
  if (url.origin !== stagingOrigin || url.pathname !== '/graphql' || url.search || url.hash || url.username || url.password) {
    throw new Error('Priority page read is restricted to EveryTip staging WPGraphQL');
  }
  const response = await fetchImpl(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { id: String(expected.databaseId) } }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Priority page WPGraphQL HTTP ${response.status}`);
  return validatePriorityPage(await response.json(), expected);
}

export async function priorityPagePreviewRecord(snapshotRecord, { freshRead = readStagingPriorityPage } = {}) {
  if (priorityPages[snapshotRecord?.uri] !== snapshotRecord?.databaseId || !snapshotRecord?.slug) {
    throw new Error('Priority page snapshot identity mismatch');
  }
  if (process.env.MIGRATION_STAGING_PRIORITY_READ !== '1') {
    return { ...snapshotRecord, sourceMode: 'dated-snapshot-preview' };
  }
  // A fresh-read failure must fail the build; silently using the dated copy
  // would conceal an editorial change immediately before review.
  return validatePriorityPage({ data: { page: await freshRead(snapshotRecord) } }, snapshotRecord);
}
