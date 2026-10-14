// Staging-only ranked ACF entries for three private roundup conversion drafts.
const specs = [
  { id: 90882, slug: 'staging-gutenberg-conversion-online-bookmakers-that-accept-neteller-2026', entries: [
    { offer: 90846, best_for: 'Neteller guide', editorial_verdict: 'Betfred appears in the legacy Neteller guide. Current Neteller support and offer payment eligibility need checking before publication.' },
    { offer: 90851, best_for: 'Neteller guide', editorial_verdict: 'NetBet appears in the legacy Neteller guide. Its payment support and any linked promotion require a current editorial and compliance review.' },
  ] },
  { id: 90883, slug: 'staging-gutenberg-conversion-online-bookmakers-that-accept-skrill-2026', entries: [
    { offer: 90846, best_for: 'Skrill guide', editorial_verdict: 'Betfred appears in the legacy Skrill guide. Current Skrill support and offer payment eligibility need checking before publication.' },
    { offer: 90851, best_for: 'Skrill guide', editorial_verdict: 'NetBet appears in the legacy Skrill guide. Its payment support and any linked promotion require a current editorial and compliance review.' },
  ] },
  { id: 90884, slug: 'staging-gutenberg-conversion-best-betting-sites-for-basketball-2026', entries: [
    { offer: 90850, best_for: 'Basketball guide', editorial_verdict: 'Betway is the only bookmaker in the legacy basketball shortlist that is currently mapped to an EveryTip partner record. Its basketball markets and offer eligibility require a fresh check.' },
  ] },
];
const base = process.env.EVERYTIP_WP_BASE_URL;
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!base || !username || !password) throw new Error('Missing staging REST credentials');
const site = new URL(base);
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') {
  throw new Error('Ranked-entry seed is restricted to EveryTip staging');
}
const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
const headers = { Authorization: authorization, 'Content-Type': 'application/json' };
const read = async (id) => {
  const response = await fetch(new URL(`/wp-json/wp/v2/posts/${id}?context=edit`, site), { headers, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Staging draft ${id} read HTTP ${response.status}`);
  return response.json();
};
const rowsMatch = (actual, expected) => actual?.length === expected.length && expected.every((row, index) =>
  Object.entries(row).every(([key, value]) => actual[index][key] === value));
const results = [];
for (const spec of specs) {
  const before = await read(spec.id);
  const current = before.acf?.ranked_entries;
  if (before.id !== spec.id || before.status !== 'draft' || before.slug !== spec.slug ||
      (current && !rowsMatch(current, spec.entries))) {
    throw new Error(`Unexpected draft ACF state for ${spec.id}; no write made`);
  }
  if (!current?.length) {
    const response = await fetch(new URL(`/wp-json/wp/v2/posts/${spec.id}`, site), {
      method: 'POST', headers, body: JSON.stringify({ acf: { ranked_entries: spec.entries } }),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`Staging draft ${spec.id} ACF update HTTP ${response.status}`);
  }
  const after = await read(spec.id);
  const verified = after.status === 'draft' && before.content?.raw === after.content?.raw &&
    rowsMatch(after.acf?.ranked_entries, spec.entries);
  results.push({ draftId: spec.id, status: after.status, rankedEntries: after.acf?.ranked_entries?.length ?? 0, bodyUnchanged: before.content?.raw === after.content?.raw, verified });
  if (!verified) break;
}
console.log(JSON.stringify({ environment: 'staging', results }, null, 2));
if (results.length !== specs.length || results.some((result) => !result.verified)) process.exitCode = 1;
