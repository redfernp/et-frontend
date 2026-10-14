// Explicit, read-only staging source for the exact Bet365 review preview.
// This does not approve the dated claims, WordPress SEO, or offer placement.
import { bet365ReviewIdentity, validateBet365Review } from './bet365-review-editorial.mjs';

const stagingOrigin = 'https://wordpress-159231-2098144.cloudwaysapps.com';
const query = `query EveryTipBet365Review($id: ID!) {
  page(id: $id, idType: DATABASE_ID) {
    databaseId uri slug status content modified
  }
}`;

export function validateStagingBet365Review(payload) {
  if (payload?.errors?.length) {
    throw new Error(`Bet365 review WPGraphQL error: ${payload.errors.map(({ message }) => message).join('; ')}`);
  }
  const page = payload?.data?.page;
  if (!page || page.status !== 'publish') {
    throw new Error('Bet365 review staging publication state mismatch');
  }
  return { ...validateBet365Review(page), sourceMode: 'fresh-staging-wpgraphql-preview' };
}

export async function readStagingBet365Review({ fetchImpl = fetch, endpoint = `${stagingOrigin}/graphql` } = {}) {
  const url = new URL(endpoint);
  if (url.origin !== stagingOrigin || url.pathname !== '/graphql' || url.search || url.hash || url.username || url.password) {
    throw new Error('Bet365 review read is restricted to staging WPGraphQL');
  }
  const response = await fetchImpl(url, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables: { id: String(bet365ReviewIdentity.databaseId) } }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Bet365 review WPGraphQL HTTP ${response.status}`);
  return validateStagingBet365Review(await response.json());
}

export async function bet365ReviewPreviewRecord(snapshotRecord, { freshRead = readStagingBet365Review } = {}) {
  validateBet365Review(snapshotRecord);
  if (process.env.MIGRATION_STAGING_BET365_REVIEW_READ !== '1') {
    return { ...snapshotRecord, sourceMode: 'dated-snapshot-preview' };
  }
  // Fail closed rather than silently serving stale copy after an opted-in read fails.
  return validateStagingBet365Review({ data: { page: await freshRead() } });
}
