// Create only the two missing title-only bookmaker records on exact staging.
const base = process.env.EVERYTIP_WP_BASE_URL;
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!base || !username || !password) throw new Error('Missing staging REST credentials');
const site = new URL(base);
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') {
  throw new Error('Bookmaker seed is restricted to EveryTip staging');
}
const endpoint = new URL('/wp-json/wp/v2/et_bookmaker', site);
const headers = { Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`, 'Content-Type': 'application/json' };
const targets = ['NetBet', '10Bet'];
async function list() {
  const response = await fetch(new URL(`${endpoint}?status=any&per_page=100&context=edit`), { headers, signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error(`Bookmaker list HTTP ${response.status}`);
  return await response.json();
}
const before = await list();
const names = before.map((post) => post.title?.raw?.toLowerCase());
for (const name of targets) {
  if (names.includes(name.toLowerCase())) continue;
  const response = await fetch(endpoint, {
    method: 'POST', headers, body: JSON.stringify({ title: name, status: 'draft' }), signal: AbortSignal.timeout(45000),
  });
  if (!response.ok) throw new Error(`${name} draft creation HTTP ${response.status}`);
  const created = await response.json();
  if (created.status !== 'draft' || created.title?.raw !== name) throw new Error(`${name} draft read-back failed`);
  console.log(JSON.stringify({ created: name, id: created.id, status: created.status }));
  names.push(name.toLowerCase());
}
const after = await list();
console.log(JSON.stringify({ environment: 'staging', draftBookmakers: after.map((post) => ({ id: post.id, title: post.title?.raw, status: post.status })),
  sevenNamesPresent: ['Betfred', 'QuinnBet', 'Spreadex', 'Betway', 'BetWright', 'NetBet', '10Bet'].every((name) =>
    after.some((post) => post.title?.raw?.toLowerCase() === name.toLowerCase() && post.status === 'draft')) }, null, 2));
