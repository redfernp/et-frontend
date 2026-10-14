// Idempotently create the distinct BetWright rewards offer on staging only.
const base = process.env.EVERYTIP_WP_BASE_URL;
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!base || !username || !password) throw new Error('Missing staging REST credentials');
const site = new URL(base);
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') {
  throw new Error('Offer seed is restricted to EveryTip staging');
}
const endpoint = new URL('/wp-json/wp/v2/et_offer', site);
const headers = {
  Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`,
  'Content-Type': 'application/json',
};
const response = await fetch(new URL(`${endpoint}?status=any&per_page=100&context=edit`), {
  headers, signal: AbortSignal.timeout(45000),
});
if (!response.ok) throw new Error(`Offer list HTTP ${response.status}`);
const offers = await response.json();
const existing = offers.find((offer) => offer.title?.raw?.trim() === "Bangers N' Cash Rewards");
if (existing) {
  if (existing.status !== 'draft') throw new Error('Matching offer is not a draft');
  console.log(JSON.stringify({ environment: 'staging', id: existing.id, status: existing.status, existing: true }));
  process.exit(0);
}
const createdResponse = await fetch(endpoint, {
  method: 'POST', headers,
  body: JSON.stringify({ title: "Bangers N' Cash Rewards", status: 'draft' }),
  signal: AbortSignal.timeout(45000),
});
if (!createdResponse.ok) throw new Error(`Offer creation HTTP ${createdResponse.status}`);
const created = await createdResponse.json();
if (created.status !== 'draft' || created.title?.raw !== "Bangers N' Cash Rewards") {
  throw new Error('Created offer identity/status mismatch');
}
console.log(JSON.stringify({ environment: 'staging', id: created.id, status: created.status, existing: false }));
