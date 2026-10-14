// Read-only schema/identity probe; prints no credentials or offer copy.
const base = process.env.EVERYTIP_WP_BASE_URL;
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!base || !username || !password) throw new Error('Missing staging credentials');
const site = new URL(base);
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com' ||
    site.pathname !== '/' || site.search || site.hash || site.username || site.password) throw new Error('Staging host required');
const query = `query OfferSchemaProbe {
  __type(name: "RootQueryToEverytipOfferConnectionWhereArgs") {
    inputFields { name type { kind name ofType { kind name ofType { kind name } } } }
  }
  everytipOffers(first: 100, where: { stati: [DRAFT] }) { nodes { databaseId status } }
}`;
const response = await fetch(new URL('/graphql', site), {
  method: 'POST',
  headers: { Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query }), signal: AbortSignal.timeout(30000),
});
if (!response.ok) throw new Error(`Staging WPGraphQL HTTP ${response.status}`);
const payload = await response.json();
if (payload.errors?.length) throw new Error(payload.errors.map(({ message }) => message).join('; '));
console.log(JSON.stringify({
  offerConnectionWhereFields: payload.data.__type?.inputFields,
  draftOfferIds: payload.data.everytipOffers.nodes.map(({ databaseId, status }) => ({ databaseId, status })),
}, null, 2));
