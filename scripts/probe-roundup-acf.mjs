// Read-only staging probe for the roundup ACF contract; prints keys/types, not credentials.
const base = process.env.EVERYTIP_WP_BASE_URL;
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!base || !username || !password) throw new Error('Missing staging REST credentials');
const site = new URL(base);
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') {
  throw new Error('Roundup ACF probe is restricted to EveryTip staging');
}
const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
const rest = await fetch(new URL('/wp-json/wp/v2/posts/90868?context=edit', site), {
  headers: { Authorization: authorization }, signal: AbortSignal.timeout(45000),
});
if (!rest.ok) throw new Error(`REST read HTTP ${rest.status}`);
const post = await rest.json();
if (post.status !== 'draft' || post.slug !== 'staging-gutenberg-conversion-paypal-roundup-2026') throw new Error('Unexpected draft identity');
const offerResponse = await fetch(new URL('/wp-json/wp/v2/et_offer/90846?context=edit', site), {
  headers: { Authorization: authorization }, signal: AbortSignal.timeout(45000),
});
const offer = offerResponse.ok ? await offerResponse.json() : null;
const query = 'query RoundupAcfContract { postType: __type(name: "Post") { fields { name type { name kind ofType { name kind } } } } guideType: __type(name: "EveryTipRoundupGuide") { fields { name type { name kind ofType { name kind ofType { name kind } } } } } entryType: __type(name: "EveryTipRoundupGuideRankedEntries") { fields { name type { name kind ofType { name kind } } } } connectionType: __type(name: "AcfContentNodeConnection") { fields { name type { name kind ofType { name kind } } } } }';
const response = await fetch(new URL('/graphql', site), {
  method: 'POST', headers: { Authorization: authorization, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query }), signal: AbortSignal.timeout(45000),
});
if (!response.ok) throw new Error(`GraphQL HTTP ${response.status}`);
const graph = await response.json();
const dataResponse = await fetch(new URL('/graphql', site), {
  method: 'POST', headers: { Authorization: authorization, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: 'query RoundupAcfData { post(id: "90868", idType: DATABASE_ID) { databaseId everyTipRoundupGuide { guideIntro rankedEntries { bestFor editorialVerdict offer { nodes { __typename databaseId } } } } } }' }),
  signal: AbortSignal.timeout(45000),
});
if (!dataResponse.ok) throw new Error(`GraphQL data HTTP ${dataResponse.status}`);
const graphData = await dataResponse.json();
console.log(JSON.stringify({
  draftId: post.id, status: post.status,
  offer: offer ? { id: offer.id, status: offer.status, title: offer.title?.raw ?? offer.title?.rendered } : { httpStatus: offerResponse.status },
  acf: post.acf && {
    keys: Object.keys(post.acf), rankedEntries: post.acf.ranked_entries,
    guideIntro: post.acf.guide_intro,
  },
  graphqlPostFields: graph.data?.postType?.fields?.filter((field) => /roundup|guide|ranked|acf/i.test(field.name)),
  graphqlGuideFields: graph.data?.guideType?.fields,
  graphqlEntryFields: graph.data?.entryType?.fields,
  graphqlConnectionFields: graph.data?.connectionType?.fields,
  graphqlData: graphData.data?.post,
  graphqlErrors: [...(graph.errors ?? []), ...(graphData.errors ?? [])].map(({ message }) => message),
}, null, 2));
