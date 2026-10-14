// Read-only public-schema probe. Prints capabilities, never content or affiliate URLs.
const endpoint = process.env.WPGRAPHQL_ENDPOINT || 'https://wordpress-159231-2098144.cloudwaysapps.com/graphql';

async function query(source) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query: source }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`WPGraphQL HTTP ${response.status}`);
  return response.json();
}

const base = await query(`query EveryTipContractBase {
  posts(first: 1) { nodes { id databaseId title slug uri date modified } }
  pages(first: 1) { nodes { id databaseId title slug uri } }
  everytipOffers(first: 1) { nodes { id databaseId title slug everyTipOfferDetails {
    publicHeadline compactTerms fullTerms
  } everyTipOfferPublishing {
    etOfferUid etOfferStatus etOfferCtaLabel etOfferHighlight
    etOfferEligibility etOfferCountriesInclude etOfferCountriesExclude
    etOfferStartsAt etOfferEndsAt etOfferLastChecked etOfferFullTermsUrl
  } } }
  everytipBookmakers(first: 1) { nodes { id databaseId title everyTipBookmakerEditorial {
    etBookmakerUsps { text }
  } } }
}`);

if (base.errors?.length) throw new Error(base.errors.map((error) => error.message).join('; '));
if (!base.data?.posts?.nodes || !base.data?.pages?.nodes || !base.data?.everytipOffers?.nodes || !base.data?.everytipBookmakers?.nodes) {
  throw new Error('Missing posts, pages, offer or bookmaker connection in WPGraphQL response');
}

const seo = await query(`query EveryTipSeoContract {
  posts(first: 1) { nodes { seo { title metaDesc canonical metaRobotsNoindex metaRobotsNofollow } } }
  pages(first: 1) { nodes { seo { title metaDesc canonical metaRobotsNoindex metaRobotsNofollow } } }
}`);

// A failure here is intentional: the private affiliate destination must not
// be queryable through public WPGraphQL, even when an offer is published.
const destinationProbe = await query(`query EveryTipPrivateDestinationProbe {
  everytipOffers(first: 1) { nodes { everyTipOfferDetails { affiliateUrl } } }
}`);

const report = {
  endpoint,
  postsReadable: base.data.posts.nodes.length > 0,
  pagesReadable: base.data.pages.nodes.length > 0,
  offerTypeReadable: true,
  offerPublishingFieldsReadable: true,
  bookmakerEditorialFieldsReadable: true,
  bookmakerRecordsPresent: base.data.everytipBookmakers.nodes.length > 0,
  offerRecordsPresent: base.data.everytipOffers.nodes.length > 0,
  yoastGraphqlReadable: !seo.errors?.length && Boolean(seo.data?.posts?.nodes?.[0]?.seo && seo.data?.pages?.nodes?.[0]?.seo),
  yoastGraphqlErrors: seo.errors?.map((error) => error.message) ?? [],
  affiliateDestinationPublic: !destinationProbe.errors?.length,
};

console.log(JSON.stringify(report, null, 2));
if (process.argv.includes('--strict') && (!report.offerRecordsPresent || !report.yoastGraphqlReadable || report.affiliateDestinationPublic)) {
  process.exitCode = 1;
}
