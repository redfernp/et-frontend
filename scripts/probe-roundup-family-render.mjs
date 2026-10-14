// Authenticated read-only REST/WPGraphQL roundtrip for private staging roundup drafts.
import { mkdir, writeFile } from 'node:fs/promises';
const specs = [
  { id: 90882, slug: 'staging-gutenberg-conversion-online-bookmakers-that-accept-neteller-2026', key: 'neteller', marker: 'History of Neteller', offers: [90846, 90851] },
  { id: 90883, slug: 'staging-gutenberg-conversion-online-bookmakers-that-accept-skrill-2026', key: 'skrill', marker: 'What is Skrill and How Does it Work', offers: [90846, 90851] },
  { id: 90884, slug: 'staging-gutenberg-conversion-best-betting-sites-for-basketball-2026', key: 'basketball', marker: 'How We Evaluate Sites', offers: [90850] },
];
const base = process.env.EVERYTIP_WP_BASE_URL;
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!base || !username || !password) throw new Error('Missing staging credentials');
const site = new URL(base);
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') {
  throw new Error('Roundup render probe is restricted to EveryTip staging');
}
const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
const results = [];
for (const spec of specs) {
  const rest = await fetch(new URL(`/wp-json/wp/v2/posts/${spec.id}?context=edit`, site), {
    headers: { Authorization: authorization }, signal: AbortSignal.timeout(30000),
  });
  if (!rest.ok) throw new Error(`Draft ${spec.id} REST read HTTP ${rest.status}`);
  const post = await rest.json();
  if (post.id !== spec.id || post.status !== 'draft' || post.slug !== spec.slug) throw new Error(`Unexpected draft identity ${spec.id}`);
  const response = await fetch(new URL('/graphql', site), {
    method: 'POST', headers: { Authorization: authorization, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query: 'query RoundupDraft($id: ID!) { post(id: $id, idType: DATABASE_ID) { databaseId status content everyTipRoundupGuide { rankedEntries { bestFor editorialVerdict offer { nodes { databaseId } } } } } }',
      variables: { id: String(spec.id) },
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Draft ${spec.id} WPGraphQL read HTTP ${response.status}`);
  const gql = await response.json();
  const graph = gql.data?.post;
  const entries = graph?.everyTipRoundupGuide?.rankedEntries ?? [];
  const acf = post.acf?.ranked_entries ?? [];
  const verified = graph?.databaseId === spec.id && graph.status === 'draft' &&
    graph.content?.includes(spec.marker) && !gql.errors?.length &&
    entries.length === spec.offers.length && acf.length === spec.offers.length &&
    spec.offers.every((offerId, index) => entries[index].offer?.nodes?.[0]?.databaseId === offerId &&
      acf[index].offer === offerId && acf[index].best_for === entries[index].bestFor &&
      acf[index].editorial_verdict === entries[index].editorialVerdict);
  if (verified) {
    await mkdir(new URL('../data/raw/', import.meta.url), { recursive: true });
    await writeFile(new URL(`../data/raw/staging-${spec.key}-roundup-gutenberg.json`, import.meta.url), JSON.stringify({
      postId: spec.id, status: post.status, content: graph.content, rankedEntries: entries, capturedAt: new Date().toISOString(),
    }, null, 2));
  }
  results.push({ draftId: spec.id, key: spec.key, status: post.status, contentLength: graph?.content?.length ?? 0, rankedEntries: entries.length, verified, graphqlErrors: gql.errors?.map(({ message }) => message) ?? [] });
  if (!verified) break;
}
console.log(JSON.stringify({ environment: 'staging', results }, null, 2));
if (results.length !== specs.length || results.some((result) => !result.verified)) process.exitCode = 1;
