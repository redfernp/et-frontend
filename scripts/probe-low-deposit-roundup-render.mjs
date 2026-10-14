// Read-only staging REST/WPGraphQL roundtrip for one unpublished roundup draft.
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.EVERYTIP_WP_BASE_URL;
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!base || !username || !password) throw new Error('Missing staging REST credentials');
const site = new URL(base);
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') {
  throw new Error('Low-deposit probe is restricted to EveryTip staging');
}
const id = 90880;
const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
const rest = await fetch(new URL(`/wp-json/wp/v2/posts/${id}?context=edit`, site), {
  headers: { Authorization: authorization }, signal: AbortSignal.timeout(30000),
});
if (!rest.ok) throw new Error(`Draft REST read HTTP ${rest.status}`);
const post = await rest.json();
if (post.id !== id || post.status !== 'draft' || post.slug !== 'staging-gutenberg-conversion-low-deposit-roundup-2026') {
  throw new Error('Unexpected staging roundup draft identity');
}
const response = await fetch(new URL('/graphql', site), {
  method: 'POST', headers: { Authorization: authorization, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query: 'query LowDepositDraft($id: ID!) { post(id: $id, idType: DATABASE_ID) { databaseId status content everyTipRoundupGuide { rankedEntries { bestFor editorialVerdict offer { nodes { databaseId } } } } } }',
    variables: { id: String(id) },
  }),
  signal: AbortSignal.timeout(30000),
});
if (!response.ok) throw new Error(`Draft WPGraphQL read HTTP ${response.status}`);
const gql = await response.json();
const graph = gql.data?.post;
const rankedEntries = graph?.everyTipRoundupGuide?.rankedEntries ?? [];
const restEntry = post.acf?.ranked_entries?.[0];
const graphEntry = rankedEntries[0];
const verified = graph?.databaseId === id && graph.status === 'draft' &&
  typeof graph.content === 'string' && graph.content.includes('Betting Bonuses') &&
  rankedEntries.length === 1 && restEntry?.offer === 90846 &&
  restEntry.best_for === graphEntry.bestFor && restEntry.editorial_verdict === graphEntry.editorialVerdict &&
  graphEntry.offer?.nodes?.[0]?.databaseId === 90846;
if (verified) {
  await mkdir(new URL('../data/raw/', import.meta.url), { recursive: true });
  await writeFile(new URL('../data/raw/staging-low-deposit-roundup-gutenberg.json', import.meta.url), JSON.stringify({
    postId: id, status: post.status, content: graph.content, rankedEntries, capturedAt: new Date().toISOString(),
  }, null, 2));
}
console.log(JSON.stringify({ environment: 'staging', draftId: id, status: post.status, contentLength: graph?.content?.length ?? 0, rankedEntries: rankedEntries.length, linkedOfferId: graphEntry?.offer?.nodes?.[0]?.databaseId, verified, graphqlErrors: gql.errors?.map(({ message }) => message) ?? [] }, null, 2));
if (!verified) process.exitCode = 1;
