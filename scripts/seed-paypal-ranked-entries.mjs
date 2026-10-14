// Staging-only fixture: four editor-controlled roundup verdicts, each linked
// to an unpublished central offer. This does not publish any offer or article.
const base = process.env.EVERYTIP_WP_BASE_URL;
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!base || !username || !password) throw new Error('Missing staging REST credentials');
const site = new URL(base);
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') {
  throw new Error('Ranked-entry seed is restricted to EveryTip staging');
}
const id = 90868;
const url = new URL(`/wp-json/wp/v2/posts/${id}?context=edit`, site);
const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
const headers = { Authorization: authorization, 'Content-Type': 'application/json' };
const read = async () => {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error(`Staging draft read HTTP ${response.status}`);
  return response.json();
};
const before = await read();
if (before.id !== id || before.status !== 'draft' || before.slug !== 'staging-gutenberg-conversion-paypal-roundup-2026' ||
    before.acf?.ranked_entries?.length !== 1 || before.acf.ranked_entries[0].offer !== 90846) {
  throw new Error('Unexpected staging PayPal draft state; no write made');
}
const entries = [
  { offer: 90846, best_for: 'Racing and mobile betting', editorial_verdict: 'The current guide gives Betfred a racing-led position. PayPal payment facts and offer eligibility still need verification.' },
  { offer: 90850, best_for: 'Mobile markets', editorial_verdict: 'The current guide highlights Betway’s mobile experience. Payment support and offer eligibility need a fresh check.' },
  { offer: 90849, best_for: 'Fixed odds and spreads', editorial_verdict: 'The guide gives Spreadex a distinctive position. Payment methods and any spread-betting warning need verification.' },
  { offer: 90852, best_for: 'Site experience', editorial_verdict: 'The current guide has conflicting 10Bet payment figures. Do not publish a payment claim until they are checked.' },
];
const update = await fetch(url, {
  method: 'POST', headers, body: JSON.stringify({ acf: { ranked_entries: entries } }), signal: AbortSignal.timeout(45000),
});
if (!update.ok) throw new Error(`Staging draft ACF update HTTP ${update.status}`);
const after = await read();
const sameContent = before.content?.raw === after.content?.raw;
const sameStatus = after.status === 'draft';
const actual = after.acf?.ranked_entries ?? [];
const entriesMatch = actual.length === entries.length && entries.every((entry, index) =>
  actual[index].offer === entry.offer && actual[index].best_for === entry.best_for && actual[index].editorial_verdict === entry.editorial_verdict);
console.log(JSON.stringify({ environment: 'staging', draftId: id, sameStatus, sameContent, entriesMatch, linkedOfferIds: actual.map((entry) => entry.offer) }, null, 2));
if (!sameStatus || !sameContent || !entriesMatch) process.exitCode = 1;
