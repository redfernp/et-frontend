// Staging-only ACF reference for the private low-deposit Gutenberg draft.
const base = process.env.EVERYTIP_WP_BASE_URL;
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!base || !username || !password) throw new Error('Missing staging REST credentials');
const site = new URL(base);
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') {
  throw new Error('Low-deposit ACF seed is restricted to EveryTip staging');
}
const draftId = 90880;
const slug = 'staging-gutenberg-conversion-low-deposit-roundup-2026';
const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
const url = new URL(`/wp-json/wp/v2/posts/${draftId}?context=edit`, site);
const headers = { Authorization: authorization, 'Content-Type': 'application/json' };
const read = async () => {
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Staging draft read HTTP ${response.status}`);
  return response.json();
};
const entry = {
  offer: 90846,
  best_for: 'Low-deposit guide readers',
  editorial_verdict: 'Betfred is the only detailed bookmaker profile in the legacy guide. Its deposit limits and welcome-offer eligibility need a current check before publication.',
};
const before = await read();
if (before.id !== draftId || before.status !== 'draft' || before.slug !== slug ||
    (before.acf?.ranked_entries && (before.acf.ranked_entries.length !== 1 ||
      !Object.entries(entry).every(([key, value]) => before.acf.ranked_entries[0][key] === value)))) {
  throw new Error('Unexpected low-deposit draft state; no write made');
}
if (!before.acf?.ranked_entries?.length) {
  const response = await fetch(url, {
    method: 'POST', headers, body: JSON.stringify({ acf: { ranked_entries: [entry] } }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Staging draft ACF update HTTP ${response.status}`);
}
const after = await read();
const sameContent = before.content?.raw === after.content?.raw;
const entriesMatch = after.acf?.ranked_entries?.length === 1 &&
  Object.entries(entry).every(([key, value]) => after.acf.ranked_entries[0][key] === value);
console.log(JSON.stringify({ environment: 'staging', draftId, status: after.status, sameContent, entriesMatch, linkedOfferId: after.acf?.ranked_entries?.[0]?.offer }, null, 2));
if (after.status !== 'draft' || !sameContent || !entriesMatch) process.exitCode = 1;
