import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const offerIds = {
  betfred: 90846, quinnbet: 90848, spreadex: 90849,
  betway: 90850, netbet: 90851, '10bet': 90852, betwright: 90889,
};
const stagingHost = 'wordpress-159231-2098144.cloudwaysapps.com';
const offerQuery = `query EveryTipDraftOfferPreview {
  everytipOffers(first: 100, where: { stati: [DRAFT] }) {
    nodes {
      databaseId status
      everyTipOfferDetails { publicHeadline compactTerms }
      everyTipOfferPublishing { etOfferStatus }
    }
  }
}`;

export function parseCapturedOfferPreview(capture) {
  if (!capture.capturedAt || capture.offers?.length !== 7) throw new Error('Invalid seven-offer preview capture');
  const offers = new Map(capture.offers.map((offer) => [offer.id, offer]));
  if (offers.size !== 7) throw new Error('Duplicate offer in preview capture');
  const result = {};
  for (const [key, id] of Object.entries(offerIds)) {
    const offer = offers.get(id);
    if (offer?.status !== 'draft' || !offer.headline?.trim() || !offer.compactTerms?.trim() ||
        offer.editorialStatus === 'active' || /<\/?[a-z][^>]*>/i.test(offer.headline + offer.compactTerms)) {
      throw new Error(`Unsafe draft offer copy capture: ${id}`);
    }
    result[key] = { id, headline: offer.headline.trim(), compactTerms: offer.compactTerms.trim() };
  }
  return { capturedAt: capture.capturedAt, sourceMode: capture.sourceMode ?? 'dated-capture-preview', offers: result };
}

/** Authenticated, read-only staging WPGraphQL offer preview; never enables CTAs. */
export async function readStagingOfferPreview({
  baseUrl = process.env.EVERYTIP_WP_BASE_URL,
  username = process.env.EVERYTIP_WP_USERNAME,
  password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD,
  fetchImpl = fetch,
} = {}) {
  if (!baseUrl || !username || !password) throw new Error('Missing staging offer-read credentials');
  const site = new URL(baseUrl);
  if (site.protocol !== 'https:' || site.hostname !== stagingHost || site.pathname !== '/' ||
      site.username || site.password || site.search || site.hash) {
    throw new Error('Offer GraphQL read is restricted to the exact EveryTip staging host');
  }
  const response = await fetchImpl(new URL('/graphql', site), {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: offerQuery }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Staging offer WPGraphQL HTTP ${response.status}`);
  const payload = await response.json();
  if (payload.errors?.length) throw new Error(`Staging offer WPGraphQL error: ${payload.errors.map(({ message }) => message).join('; ')}`);
  const nodes = payload.data?.everytipOffers?.nodes;
  if (!Array.isArray(nodes)) throw new Error('Staging offer WPGraphQL connection missing');
  return parseCapturedOfferPreview({
    capturedAt: new Date().toISOString(),
    sourceMode: 'fresh-staging-wpgraphql-preview',
    offers: nodes.filter((node) => Object.values(offerIds).includes(node.databaseId)).map((node) => ({
      id: node.databaseId,
      status: node.status,
      headline: node.everyTipOfferDetails?.publicHeadline,
      compactTerms: node.everyTipOfferDetails?.compactTerms,
      editorialStatus: node.everyTipOfferPublishing?.etOfferStatus,
    })),
  });
}

let freshOfferPromise;
export async function capturedOfferPreview() {
  if (process.env.MIGRATION_STAGING_OFFER_READ === '1') {
    freshOfferPromise ??= readStagingOfferPreview();
    return freshOfferPromise;
  }
  try {
    return parseCapturedOfferPreview(JSON.parse(await readFile(resolve(process.cwd(), 'data/raw/staging-seven-offer-copy.json'), 'utf8')));
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}
