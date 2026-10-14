const stagingHost = 'wordpress-159231-2098144.cloudwaysapps.com';

export const stagingRoundupDrafts = Object.freeze({
  paypal: { postId: 90868, slug: 'staging-gutenberg-conversion-paypal-roundup-2026', offerIds: [90846, 90850, 90849, 90852] },
  lowDeposit: { postId: 90880, slug: 'staging-gutenberg-conversion-low-deposit-roundup-2026', offerIds: [90846] },
  neteller: { postId: 90882, slug: 'staging-gutenberg-conversion-online-bookmakers-that-accept-neteller-2026', offerIds: [90846, 90851] },
  skrill: { postId: 90883, slug: 'staging-gutenberg-conversion-online-bookmakers-that-accept-skrill-2026', offerIds: [90846, 90851] },
  basketball: { postId: 90884, slug: 'staging-gutenberg-conversion-best-betting-sites-for-basketball-2026', offerIds: [90850] },
});

const draftQuery = `query EveryTipRoundupDraft($id: ID!) {
  post(id: $id, idType: DATABASE_ID) {
    databaseId slug status content
    everyTipRoundupGuide {
      rankedEntries { bestFor editorialVerdict offer { nodes { databaseId } } }
    }
  }
}`;

export function validateRoundupDraft(payload, spec) {
  const post = payload?.data?.post;
  if (payload?.errors?.length) throw new Error(`WPGraphQL roundup error: ${payload.errors.map(({ message }) => message).join('; ')}`);
  if (post?.databaseId !== spec.postId || post.slug !== spec.slug || post.status !== 'draft' || !post.content?.trim()) {
    throw new Error(`Staging roundup ${spec.postId} identity, draft status or content mismatch`);
  }
  const entries = post.everyTipRoundupGuide?.rankedEntries;
  if (!Array.isArray(entries) || entries.length !== spec.offerIds.length ||
      !entries.every((entry, index) => entry.bestFor?.trim() && entry.editorialVerdict?.trim() &&
        entry.offer?.nodes?.length === 1 && entry.offer.nodes[0].databaseId === spec.offerIds[index])) {
    throw new Error(`Staging roundup ${spec.postId} ACF ranked entries mismatch`);
  }
  return {
    postId: post.databaseId,
    status: post.status,
    content: post.content,
    rankedEntries: entries,
    capturedAt: new Date().toISOString(),
    sourceMode: 'fresh-staging-wpgraphql-preview',
  };
}

/** Authenticated read-only staging query. No REST write or public-offer activation. */
export async function readStagingRoundupDraft(spec, {
  baseUrl = process.env.EVERYTIP_WP_BASE_URL,
  username = process.env.EVERYTIP_WP_USERNAME,
  password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD,
  fetchImpl = fetch,
} = {}) {
  if (!baseUrl || !username || !password) throw new Error('Missing staging WordPress read credentials');
  const site = new URL(baseUrl);
  if (site.protocol !== 'https:' || site.hostname !== stagingHost || site.username || site.password || site.search || site.hash || site.pathname !== '/') {
    throw new Error('Roundup CMS read is restricted to the exact EveryTip staging host');
  }
  const response = await fetchImpl(new URL('/graphql', site), {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: draftQuery, variables: { id: String(spec.postId) } }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Staging WPGraphQL roundup read HTTP ${response.status}`);
  return validateRoundupDraft(await response.json(), spec);
}

/**
 * Pilot-only source switch. Captures remain allowed only as explicitly labelled
 * offline previews. Opting into a fresh CMS read never falls back on failure.
 */
export async function roundupDraftPreview(key, capturedFixture) {
  const spec = stagingRoundupDrafts[key];
  if (!spec) throw new Error(`Unknown roundup draft key: ${key}`);
  if (process.env.MIGRATION_STAGING_ROUNDUP_READ === '1') return readStagingRoundupDraft(spec);
  const fixture = await capturedFixture();
  return fixture ? { ...fixture, sourceMode: 'dated-capture-preview' } : null;
}
