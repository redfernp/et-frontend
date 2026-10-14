// Authenticated, read-only staging WPGraphQL check for seven draft offer relations.
const base = process.env.EVERYTIP_WP_BASE_URL;
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!base || !username || !password) throw new Error('Missing staging REST credentials');
const site = new URL(base);
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') {
  throw new Error('Relation probe is restricted to EveryTip staging');
}
const expected = new Map([[90846, 90840], [90848, 90842], [90849, 90844], [90850, 90853], [90851, 90872], [90852, 90873], [90889, 90855]]);
const fields = [...expected.keys()].map((id) => `o${id}: everytipOffer(id: "${id}", idType: DATABASE_ID) { databaseId status everyTipOfferDetails { bookmaker { nodes { databaseId } } } everyTipOfferPublishing { etOfferFullTermsUrl } }`).join('\n');
const response = await fetch(new URL('/graphql', site), {
  method: 'POST', headers: {
    Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
    'Content-Type': 'application/json',
  }, body: JSON.stringify({ query: `query StagingOfferBookmakers { ${fields} }` }),
  signal: AbortSignal.timeout(45000),
});
if (!response.ok) throw new Error(`GraphQL HTTP ${response.status}`);
const graph = await response.json();
const results = [...expected].map(([offerId, expectedBookmakerId]) => {
  const offer = graph.data?.[`o${offerId}`];
  const actualBookmakerId = offer?.everyTipOfferDetails?.bookmaker?.nodes?.[0]?.databaseId ?? null;
  return { offerId, expectedBookmakerId, actualBookmakerId, status: offer?.status ?? null,
    officialTermsUrlFieldExposed: offer?.everyTipOfferPublishing?.etOfferFullTermsUrl !== undefined,
    matches: actualBookmakerId === expectedBookmakerId };
});
console.log(JSON.stringify({ environment: 'staging', results, graphqlErrors: graph.errors?.map(({ message }) => message) ?? [], verified: results.every((item) => item.matches && item.status === 'draft' && item.officialTermsUrlFieldExposed) }, null, 2));
if (graph.errors?.length || results.some((item) => !item.matches || item.status !== 'draft' || !item.officialTermsUrlFieldExposed)) process.exitCode = 1;
