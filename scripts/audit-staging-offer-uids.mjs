// Read-only UID and REST capability audit. Never prints credentials or offer copy.
const site = new URL(process.env.EVERYTIP_WP_BASE_URL ?? '');
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com' || !username || !password) {
  throw new Error('Staging credentials required');
}
const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
const ids = [90846, 90848, 90849, 90850, 90851, 90852, 90889];
const partners = ['betfred', 'quinnbet', 'spreadex', 'betway', 'netbet', '10bet', 'betwright'];
const headers = { Authorization: authorization };
async function get(path, method = 'GET') {
  const response = await fetch(new URL(path, site), { method, headers, signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error(`${method} ${path} HTTP ${response.status}`);
  return response.json();
}
const records = [];
for (let index = 0; index < ids.length; index++) {
  const id = ids[index];
  const [offer, post] = await Promise.all([
    get(`/wp-json/everytip/v1/offer/${id}`),
    get(`/wp-json/wp/v2/et_offer/${id}?context=edit`),
  ]);
  if (offer.id !== id || post.id !== id) throw new Error(`Identity mismatch for ${id}`);
  records.push({
    id, partner: partners[index], slug: post.slug, status: post.status,
    uid: String(offer.fields?.et_offer_uid ?? ''),
    editorialOfferStatus: String(offer.fields?.et_offer_status ?? ''),
    uidExposedInNativeRest: Object.hasOwn(post.acf ?? {}, 'et_offer_uid'),
    nativeRestAcfKeys: Object.keys(post.acf ?? {}).length,
    modifiedGmt: offer.modified_gmt,
  });
}
const [editorialOptions, nativeOptions] = await Promise.all([
  get('/wp-json/everytip/v1/offer/90848', 'OPTIONS'),
  get('/wp-json/wp/v2/et_offer/90848', 'OPTIONS'),
]);
console.log(JSON.stringify({
  environment: 'staging', records,
  editorialRouteMethods: editorialOptions.endpoints?.[0]?.methods ?? [],
  nativeRouteMethods: [...new Set((nativeOptions.endpoints ?? []).flatMap((endpoint) => endpoint.methods ?? []))],
  nativeUidSchema: Boolean(nativeOptions.schema?.properties?.acf?.properties?.et_offer_uid),
}, null, 2));
