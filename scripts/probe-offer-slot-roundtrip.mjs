// Staging-only write/read probe for the ACF Gutenberg offer-slot block.
// Run with: node --env-file=.env.local scripts/probe-offer-slot-roundtrip.mjs
// Creates or updates only the named unpublished fixture. Never prints credentials or offer copy.
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.EVERYTIP_WP_BASE_URL;
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!base || !username || !password) throw new Error('Missing staging REST credentials');
const site = new URL(base);
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') {
  throw new Error('Offer-slot probe is restricted to EveryTip staging');
}

const slug = 'staging-only-offer-slot-roundtrip';
const title = 'STAGING ONLY — offer-slot roundtrip test';
const offerId = 90846;
const blockName = 'acf/everytip-offer-slot';
const marker = `data-everytip-offer-slot="${offerId}"`;
const content = `<!-- wp:paragraph -->\n<p>Unpublished staging fixture. No offer is approved for publication from this test.</p>\n<!-- /wp:paragraph -->\n\n<!-- wp:${blockName} {"name":"${blockName}","data":{"et_slot_offer":"${offerId}","_et_slot_offer":"field_et_slot_offer_v1","et_slot_layout":"compact","_et_slot_layout":"field_et_slot_layout_v1","et_slot_heading":"Staging preview only","_et_slot_heading":"field_et_slot_heading_v1"},"mode":"preview"} /-->`;
const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
const json = async (path, options = {}) => {
  const response = await fetch(new URL(path, site), {
    ...options,
    headers: { Authorization: authorization, ...options.headers },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Staging ${options.method ?? 'GET'} ${path} returned HTTP ${response.status}`);
  return response.json();
};

const matches = await json(`/wp-json/wp/v2/posts?slug=${slug}&status=draft&context=edit&per_page=10`);
if (matches.length > 1 || matches.some((post) => post.title?.raw !== title)) {
  throw new Error('Unexpected existing fixture; refusing write');
}
let post = matches[0];
if (!post) {
  post = await json('/wp-json/wp/v2/posts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, slug, status: 'draft', content, excerpt: 'Unpublished offer-slot integration test.' }),
  });
} else if (post.content?.raw !== content) {
  post = await json(`/wp-json/wp/v2/posts/${post.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  });
}

const readBack = await json(`/wp-json/wp/v2/posts/${post.id}?context=edit`);
if (readBack.status !== 'draft' || readBack.slug !== slug || readBack.content?.raw !== content) {
  throw new Error('Saved block source failed REST read-back');
}
const restRenderedMarker = readBack.content?.rendered?.includes(marker) ?? false;
const graphqlResponse = await fetch(new URL('/graphql', site), {
  method: 'POST',
  headers: { Authorization: authorization, 'Content-Type': 'application/json' },
  body: JSON.stringify({ query: 'query OfferSlotDraft($id: ID!) { post(id: $id, idType: DATABASE_ID) { databaseId status content } }', variables: { id: String(post.id) } }),
  signal: AbortSignal.timeout(30000),
});
if (!graphqlResponse.ok) throw new Error(`Staging WPGraphQL returned HTTP ${graphqlResponse.status}`);
const graphql = await graphqlResponse.json();
const graphNode = graphql.data?.post;
const graphqlRenderedMarker = graphNode?.databaseId === post.id && graphNode.content?.includes(marker);
if (restRenderedMarker && graphqlRenderedMarker) {
  const target = new URL('../data/raw/staging-offer-slot-roundtrip.json', import.meta.url);
  await mkdir(new URL('../data/raw/', import.meta.url), { recursive: true });
  await writeFile(target, JSON.stringify({ postId: post.id, offerId, status: readBack.status, content: graphNode.content, capturedAt: new Date().toISOString() }, null, 2));
}
console.log(JSON.stringify({ environment: 'staging', postId: post.id, status: readBack.status, blockSourceSaved: true, restRenderedMarker, graphqlRenderedMarker: Boolean(graphqlRenderedMarker), graphqlErrors: graphql.errors?.map(({ message }) => message) ?? [] }, null, 2));
if (!restRenderedMarker || !graphqlRenderedMarker) process.exitCode = 1;
