// Weekly offer ladder re-rank. Reads the last 7 days of /go/ clicks that the worker logs to the
// everytip_offer_clicks Analytics Engine dataset (src/worker/index.mjs recordClick), reorders the
// ladder positions in src/data/offers.json by clicks, and writes a short report.
//
// Rules:
// - Ladder offers are the active ones with lineup !== false. Others keep their position untouched.
// - A new partner carries "newUntil": "YYYY-MM-DD" in offers.json. Until that date (inclusive) it is
//   held at #3, so it gets a fair first week before clicks decide. Two new partners: #3 and #4.
// - Everyone else is ordered by clicks, most first; ties keep the previous order.
//
// Usage (needs CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_ANALYTICS_TOKEN, Account Analytics Read):
//   node scripts/rerank-offers.mjs            write offers.json and docs/ladder-reports/<date>.md
//   node scripts/rerank-offers.mjs --dry-run  print the report only
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const NEW_PARTNER_SLOT = 3;
const MIN_WEEKLY_CLICKS = 30;
const slugOf = offer => offer.link.replace(/^\/go\//, '').toLowerCase();

// Pure ranking step: offers as in offers.json, clicks as { slug: count }, today as YYYY-MM-DD.
export function rankOffers(offers, clicks, today) {
  const ladder = offers.filter(o => o.active !== false && o.lineup !== false).sort((a, b) => a.position - b.position);
  const isNew = o => typeof o.newUntil === 'string' && today <= o.newUntil;
  const held = ladder.filter(isNew);
  const ranked = ladder.filter(o => !isNew(o))
    .map((offer, index) => ({ offer, index, clicks: clicks[slugOf(offer)] ?? 0 }))
    .sort((a, b) => b.clicks - a.clicks || a.index - b.index)
    .map(entry => entry.offer);
  ranked.splice(Math.min(NEW_PARTNER_SLOT - 1, ranked.length), 0, ...held);
  const before = new Map(ladder.map(o => [o.id, o.position]));
  const positions = new Map(ranked.map((offer, index) => [offer.id, index + 1]));
  return {
    offers: offers.map(o => positions.has(o.id) ? { ...o, position: positions.get(o.id) } : o),
    rows: ranked.map(o => ({ bookmaker: o.bookmaker, slug: slugOf(o), clicks: clicks[slugOf(o)] ?? 0,
      from: before.get(o.id), to: positions.get(o.id), held: isNew(o) })),
  };
}

async function sql(query) {
  const { CLOUDFLARE_ACCOUNT_ID: account, CLOUDFLARE_ANALYTICS_TOKEN: token } = process.env;
  if (!account || !token) throw new Error('Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_ANALYTICS_TOKEN');
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/analytics_engine/sql`,
    { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: query });
  if (!response.ok) throw new Error(`Analytics Engine ${response.status}: ${await response.text()}`);
  return (await response.json()).data;
}

export async function fetchWeek(days = 7) {
  const since = `timestamp > NOW() - INTERVAL '${Number(days)}' DAY`;
  const bySlug = await sql(`SELECT blob1 AS slug, SUM(_sample_interval) AS clicks FROM everytip_offer_clicks WHERE ${since} GROUP BY slug`);
  const byPlacement = await sql(`SELECT blob2 AS placement, SUM(_sample_interval) AS clicks FROM everytip_offer_clicks WHERE ${since} GROUP BY placement ORDER BY clicks DESC`);
  // Article report: clicks per page, split by bookmaker, so the best-earning articles stand out.
  const pageRows = await sql(`SELECT blob3 AS page, blob1 AS slug, SUM(_sample_interval) AS clicks FROM everytip_offer_clicks WHERE ${since} GROUP BY page, slug`);
  const pages = new Map();
  for (const r of pageRows) {
    const entry = pages.get(r.page) ?? { page: r.page, clicks: 0, bySlug: {} };
    entry.clicks += Number(r.clicks); entry.bySlug[r.slug] = Number(r.clicks); pages.set(r.page, entry);
  }
  const byPage = [...pages.values()].sort((a, b) => b.clicks - a.clicks).slice(0, 50);
  return { clicks: Object.fromEntries(bySlug.map(r => [r.slug, Number(r.clicks)])), byPlacement, byPage };
}

const pageName = page => !page ? '(no referrer: newsletter, apps, direct)' : page.startsWith('ext:') ? `other site: ${page.slice(4)}` : page;
const split = bySlug => Object.entries(bySlug).sort((a, b) => b[1] - a[1]).map(([slug, n]) => `${slug} ${n}`).join(', ');
export function report(rows, byPlacement, byPage, today, title = `EveryTip offer ladder, week to ${today}`) {
  const move = r => r.held ? 'held at #3 (new partner)' : r.from === r.to ? 'no change' : r.to < r.from ? `up ${r.from - r.to}` : `down ${r.to - r.from}`;
  const placementName = { top: 'Top offers, first rows', more: 'Top offers, "View all" list', '': 'Other placements (homepage, sidebar, free bets, offer blocks)' };
  return [`# ${title}`, '',
    '| New | Bookmaker | Clicks (7 days) | Was | Move |', '|---|---|---|---|---|',
    ...rows.map(r => `| ${r.to} | ${r.bookmaker} | ${r.clicks} | ${r.from} | ${move(r)} |`), '',
    '## Where clicks came from', '', ...byPlacement.map(r => `- ${placementName[r.placement] ?? r.placement}: ${r.clicks}`), '',
    '## Articles that generate the most clicks', '', '| # | Page | Clicks | By bookmaker |', '|---|---|---|---|',
    ...byPage.map((r, i) => `| ${i + 1} | ${pageName(r.page)} | ${r.clicks} | ${split(r.bySlug)} |`), ''].join('\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = new URL('../src/data/offers.json', import.meta.url);
  const data = JSON.parse(await readFile(file, 'utf8'));
  const today = new Date().toISOString().slice(0, 10);
  // --report [--days N]: an on-demand click report for any period; never touches the ladder.
  if (process.argv.includes('--report')) {
    const days = Number(process.argv[process.argv.indexOf('--days') + 1]) || 7;
    const { clicks, byPlacement, byPage } = await fetchWeek(days);
    console.log(report(rankOffers(data.offers, clicks, '0000-00-00').rows.map(r => ({ ...r, to: r.from })), byPlacement, byPage, today, `EveryTip offer clicks, last ${days} days to ${today}`));
    process.exit(0);
  }
  const { clicks, byPlacement, byPage } = await fetchWeek();
  const { offers, rows } = rankOffers(data.offers, clicks, today);
  const total = Object.values(clicks).reduce((sum, n) => sum + n, 0);
  // Too few clicks (first week, or counting broken) would reshuffle on noise: keep the ladder as it is.
  const enough = total >= MIN_WEEKLY_CLICKS;
  const text = report(rows, byPlacement, byPage, today) + (enough ? '' : `\nOnly ${total} clicks this week (minimum ${MIN_WEEKLY_CLICKS}), so the ladder was NOT changed.\n`);
  console.log(text);
  if (!process.argv.includes('--dry-run')) {
    if (enough) await writeFile(file, JSON.stringify({ ...data, offers }, null, 2) + '\n');
    await mkdir(new URL('../docs/ladder-reports/', import.meta.url), { recursive: true });
    await writeFile(new URL(`../docs/ladder-reports/${today}.md`, import.meta.url), text);
  }
}
