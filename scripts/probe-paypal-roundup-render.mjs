// Read-only check of the unpublished PayPal Gutenberg draft through REST and WPGraphQL.
import { mkdir, writeFile } from 'node:fs/promises';
import { parseDocument, DomUtils } from 'htmlparser2';
const base = process.env.EVERYTIP_WP_BASE_URL;
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!base || !username || !password) throw new Error('Missing staging REST credentials');
const site = new URL(base);
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') {
  throw new Error('PayPal render probe is restricted to EveryTip staging');
}
const id = 90868;
const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
const rest = await fetch(new URL(`/wp-json/wp/v2/posts/${id}?context=edit`, site), {
  headers: { Authorization: authorization }, signal: AbortSignal.timeout(30000),
});
if (!rest.ok) throw new Error(`Draft REST read HTTP ${rest.status}`);
const post = await rest.json();
if (post.id !== id || post.status !== 'draft' || post.slug !== 'staging-gutenberg-conversion-paypal-roundup-2026') {
  throw new Error('Unexpected staging roundup draft identity');
}
const gqlResponse = await fetch(new URL('/graphql', site), {
  method: 'POST', headers: { Authorization: authorization, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: 'query RoundupDraft($id: ID!) { post(id: $id, idType: DATABASE_ID) { databaseId status content everyTipRoundupGuide { guideIntro rankedEntries { bestFor editorialVerdict offer { nodes { databaseId } } } } } }', variables: { id: String(id) } }),
  signal: AbortSignal.timeout(30000),
});
if (!gqlResponse.ok) throw new Error(`Draft WPGraphQL read HTTP ${gqlResponse.status}`);
const gql = await gqlResponse.json();
const graph = gql.data?.post;
const assess = (html) => {
  const document = parseDocument(html ?? '');
  const links = DomUtils.findAll((node) => node.name === 'a' && node.attribs?.href, document.children)
    .map((node) => node.attribs.href);
  return {
    offerMarkers: (html?.match(/data-everytip-offer-slot="\d+"/g) ?? []).length,
    paymentTables: (html?.match(/<table\b/g) ?? []).length,
    images: (html?.match(/<img\b/g) ?? []).length,
    editorialLinks: links,
    builderMarkup: /\bfl-builder\b|ninja_table/i.test(html ?? ''),
  };
};
const allowedLinks = [
  '/bet365-review', '/bet365-review', '/betfred-review', '/betfred-review',
  '/how-to-lay-a-horse-to-lose-on-betfair.html', '/betfair-sportsbook-review', 'https://www.paypal.com/',
];
const safeLinks = (result) => JSON.stringify([...result.editorialLinks].sort()) ===
  JSON.stringify([...allowedLinks].sort());
const restResult = assess(post.content?.rendered);
const graphqlResult = assess(graph?.content);
const rankedEntries = graph?.everyTipRoundupGuide?.rankedEntries ?? [];
const acfRoundtrip = post.acf?.ranked_entries?.length === 4 && rankedEntries.length === 4 &&
  post.acf.ranked_entries.every((entry, index) =>
    entry.offer === rankedEntries[index].offer?.nodes?.[0]?.databaseId &&
    entry.best_for === rankedEntries[index].bestFor &&
    entry.editorial_verdict === rankedEntries[index].editorialVerdict);
const verified = graph?.databaseId === id && restResult.offerMarkers === 4 && graphqlResult.offerMarkers === 4 &&
  restResult.paymentTables === 1 && graphqlResult.paymentTables === 1 &&
  restResult.images === 5 && graphqlResult.images === 5 &&
  safeLinks(restResult) && safeLinks(graphqlResult) &&
  !restResult.builderMarkup && !graphqlResult.builderMarkup && acfRoundtrip;
if (verified) {
  await mkdir(new URL('../data/raw/', import.meta.url), { recursive: true });
  await writeFile(new URL('../data/raw/staging-paypal-roundup-gutenberg.json', import.meta.url), JSON.stringify({ postId: id, status: post.status, content: graph.content, rankedEntries, capturedAt: new Date().toISOString() }, null, 2));
}
console.log(JSON.stringify({ environment: 'staging', draftId: id, status: post.status, acfExposed: Object.hasOwn(post, 'acf'), acfKeys: Object.keys(post.acf ?? {}), acfRoundtrip, rest: restResult, graphql: graphqlResult, verified, graphqlErrors: gql.errors?.map(({ message }) => message) ?? [] }, null, 2));
if (!verified) process.exitCode = 1;
