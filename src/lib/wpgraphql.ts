export const GRAPHQL_ENDPOINT = import.meta.env?.WPGRAPHQL_ENDPOINT ??
  'https://wordpress-159231-2098144.cloudwaysapps.com/graphql';
import { offlineSnapshotNode } from './offline-snapshot.mjs';

export async function graphql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const body = JSON.stringify({ query, variables });
  let response: Response | undefined;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      response = await fetch(GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        signal: AbortSignal.timeout(30000),
      });
      if ((response.status === 429 || response.status >= 500) && attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 750));
        continue;
      }
      break;
    } catch (error) {
      if (attempt === 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, 750));
    }
  }
  if (!response) throw new Error('WPGraphQL did not return a response');
  if (!response.ok) throw new Error(`WPGraphQL HTTP ${response.status}`);
  const result = await response.json() as { data?: T; errors?: { message: string }[] };
  if (result.errors?.length) throw new Error(result.errors.map((error) => error.message).join('; '));
  if (!result.data) throw new Error('WPGraphQL returned no data');
  return result.data;
}

// The public schema and ACF field group have been smoke-tested on staging.
// The pilot renders fixtures until approved offer records and a content import exist.
export const OFFER_QUERY = `query EveryTipOffers {
  everytipOffers(first: 50) {
    nodes {
      id databaseId title slug status
      everyTipOfferDetails {
        publicHeadline compactTerms fullTerms
      }
      everyTipOfferPublishing {
        etOfferUid etOfferStatus etOfferCtaLabel etOfferHighlight
        etOfferEligibility etOfferCountriesInclude etOfferCountriesExclude
        etOfferStartsAt etOfferEndsAt etOfferLastChecked etOfferFullTermsUrl
      }
    }
  }
}`;

export type WordPressOfferRecord = {
  id: string;
  databaseId: number;
  title: string;
  slug: string;
  status: string;
  everyTipOfferDetails: {
    publicHeadline: string | null;
    compactTerms: string | null;
    fullTerms: string | null;
  } | null;
  everyTipOfferPublishing: {
    etOfferUid: string | null;
    etOfferStatus: string | null;
    etOfferCtaLabel: string | null;
    etOfferHighlight: string | null;
    etOfferEligibility: string | null;
    etOfferCountriesInclude: string | null;
    etOfferCountriesExclude: string | null;
    etOfferStartsAt: string | null;
    etOfferEndsAt: string | null;
    etOfferLastChecked: string | null;
    etOfferFullTermsUrl: string | null;
  } | null;
};

export async function getOfferRecords(): Promise<WordPressOfferRecord[]> {
  const result = await graphql<{ everytipOffers: { nodes: WordPressOfferRecord[] } }>(OFFER_QUERY);
  if (!Array.isArray(result.everytipOffers?.nodes)) throw new Error('Invalid offer response from WPGraphQL');
  return result.everytipOffers.nodes;
}

// ACF presence is not approval: never render a commercial offer from this data
// until status, dates, eligibility, terms and destination have been verified.
export function hasRequiredOfferCopy(offer: WordPressOfferRecord): boolean {
  const fields = offer.everyTipOfferDetails;
  const publishing = offer.everyTipOfferPublishing;
  return Boolean(publishing && fields?.publicHeadline?.trim() && fields.compactTerms?.trim());
}

export type WordPressSeo = {
  title: string | null;
  metaDesc: string | null;
  canonical: string | null;
  metaRobotsNoindex: string | null;
  metaRobotsNofollow: string | null;
};

type SeoNode = {
  __typename: 'Post' | 'Page';
  id: string;
  uri: string;
  seo: WordPressSeo | null;
};

const SEO_BY_URI_QUERY = `query EveryTipSeoByUri($uri: String!) {
  nodeByUri(uri: $uri) {
    __typename
    ... on Post { id uri seo { title metaDesc canonical metaRobotsNoindex metaRobotsNofollow } }
    ... on Page { id uri seo { title metaDesc canonical metaRobotsNoindex metaRobotsNofollow } }
  }
}`;

export async function getSeoByUri(uri: string): Promise<SeoNode | null> {
  if (!uri.startsWith('/') || uri.includes('?') || uri.includes('#')) {
    throw new Error('Expected an exact WordPress path without query or fragment');
  }
  const result = await graphql<{ nodeByUri: SeoNode | null }>(SEO_BY_URI_QUERY, { uri });
  const node = result.nodeByUri;
  if (!node) return null;
  if (node.__typename !== 'Post' && node.__typename !== 'Page') return null;
  return node;
}

const LEGAL_PAGE_QUERY = `query EveryTipLegalPage($uri: String!) {
  nodeByUri(uri: $uri) {
    __typename
    ... on Page { databaseId uri title content modified }
  }
}`;

export async function getLegalPageByUri(uri: string): Promise<{ databaseId: number; uri: string; title: string; content: string; modified: string }> {
  if (!['/safer-gambling', '/terms-conditions', '/privacy-policy'].includes(uri)) {
    throw new Error(`Not an approved legal-page URI: ${uri}`);
  }
  const offline = await offlineSnapshotNode(uri, 'pages');
  const result = offline ? null : await graphql<{ nodeByUri: { __typename: string; databaseId: number; uri: string; title: string; content: string; modified: string } | null }>(LEGAL_PAGE_QUERY, { uri });
  const page = offline ?? result?.nodeByUri;
  if ((!offline && result?.nodeByUri?.__typename !== 'Page') || page?.uri !== uri || !page.content?.trim()) {
    throw new Error(`Missing or invalid WordPress legal-page content: ${uri}`);
  }
  if (/<\s*(script|iframe|form)\b/i.test(page.content)) {
    throw new Error(`Active embedded content requires review before rendering: ${uri}`);
  }
  return page;
}

const POST_CONTENT_QUERY = `query EveryTipPostContent($uri: String!) {
  nodeByUri(uri: $uri) {
    __typename
    ... on Post { databaseId uri title content modified }
  }
}`;

export async function getPostContentByUri(uri: string): Promise<{ databaseId: number; uri: string; title: string; content: string; modified: string }> {
  if (!uri.startsWith('/') || !uri.endsWith('.html')) throw new Error(`Expected exact legacy post URI: ${uri}`);
  const offline = await offlineSnapshotNode(uri, 'posts');
  const result = offline ? null : await graphql<{ nodeByUri: { __typename: string; databaseId: number; uri: string; title: string; content: string; modified: string } | null }>(POST_CONTENT_QUERY, { uri });
  const post = offline ?? result?.nodeByUri;
  if ((!offline && result?.nodeByUri?.__typename !== 'Post') || post?.uri !== uri || !post.content?.trim()) {
    throw new Error(`Missing or invalid WordPress post content: ${uri}`);
  }
  return post;
}
