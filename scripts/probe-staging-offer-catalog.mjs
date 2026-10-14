// Read-only inventory of staging bookmaker/offer identities and editorial relationships.
const base = process.env.EVERYTIP_WP_BASE_URL;
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!base || !username || !password) throw new Error('Missing staging REST credentials');
const site = new URL(base);
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') {
  throw new Error('Catalog probe is restricted to EveryTip staging');
}
const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
async function list(type) {
  const url = new URL(`/wp-json/wp/v2/${type}?status=any&per_page=100&context=edit`, site);
  const response = await fetch(url, { headers: { Authorization: authorization }, signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error(`${type} REST HTTP ${response.status}`);
  return (await response.json()).map((post) => ({
    id: post.id, title: post.title?.raw ?? post.title?.rendered, slug: post.slug, status: post.status,
    acfKeys: Object.keys(post.acf ?? {}),
    bookmaker: post.acf?.bookmaker ?? post.acf?.et_offer_bookmaker ?? null,
  }));
}
console.log(JSON.stringify({ environment: 'staging', bookmakers: await list('et_bookmaker'), offers: await list('et_offer') }, null, 2));
