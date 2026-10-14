import { parseDocument, DomUtils } from 'htmlparser2';

const routes = [
  [16, '/'], [76939, '/free-betting-tips'], [56315, '/bookie-free-bets-bonus-offers'],
  [87553, '/bet365-review'], [58743, '/best-paypal-betting-sites.html'],
  [33470, '/low-or-no-minimum-deposit-betting-sites.html'], [72421, '/value-bet-tips-dark-horses.html'],
  [45270, '/racecourses/kempton-racing-tips'], [41881, '/free-horse-racing-tips'],
  [70281, '/safer-gambling'], [61, '/terms-conditions'], [6376, '/privacy-policy'],
  [23888, '/saturday-horse-racing-tips'], [24016, '/english-premier-league-predictions-for-saturday'],
  [12835, '/professional-winning-tipsters-comparison-table'],
];
const findAll = (node, name) => DomUtils.findAll((child) => child.name === name, node.children ?? [], true);
const decode = (value) => DomUtils.textContent(parseDocument(value ?? '', { decodeEntities: true })).trim();
const asset = (path) => path === '/' ? 'index.html' : path.endsWith('.html') ? path.slice(1)
  : `${path.slice(1)}/index.html`;
const sourceRobots = (seo) => `${seo?.metaRobotsNoindex ?? ''},${seo?.metaRobotsNofollow ?? ''}`;
const sourceCanonical = (seo, path) => seo?.canonical ? `https://www.everytip.co.uk${path}` : '';

export function parseDatedLiveOnlyInventory(markdown) {
  if (typeof markdown !== 'string') throw new Error('Missing dated live-only inventory');
  const sections = markdown.split(/^## /m);
  const category = (heading) => {
    const section = sections.find((part) => part.startsWith(heading));
    if (!section) throw new Error(`Missing inventory section: ${heading}`);
    return [...section.matchAll(/^\|\s*(\d+)\s*\|\s*`(\/[^`]+)`\s*\|/gm)]
      .map((match) => ({ id: Number(match[1]), path: match[2] }));
  };
  const columnist = category('Columnist articles');
  const ordinary = category('Ordinary racing-tip');
  const offerNews = category('Offer-led news');
  const all = [...columnist, ...ordinary, ...offerNews];
  if (columnist.length !== 4 || ordinary.length !== 14 || offerNews.length !== 18 || all.length !== 36 ||
      new Set(all.map((item) => item.id)).size !== 36 || new Set(all.map((item) => item.path)).size !== 36 ||
      all.some((item) => !/^\/[a-z0-9-]+\.html$/.test(item.path))) {
    throw new Error('Dated live-only inventory must contain 36 unique exact .html paths');
  }
  return { all, ordinary, offerNews };
}

export async function buildDatedPriorityAcceptanceInputs({ snapshot, inventory, assetRead }) {
  if (!snapshot?.generatedAt || !Array.isArray(snapshot.posts) || !Array.isArray(snapshot.pages) ||
      typeof assetRead !== 'function') throw new Error('Missing dated local acceptance inputs');
  const records = [];
  for (const [id, path] of routes) {
    const source = [...snapshot.posts, ...snapshot.pages].find((item) => item.databaseId === id);
    if (!source || source.uri !== path || !source.seo) throw new Error(`Priority snapshot identity missing: ${path}`);
    const html = await assetRead(asset(path));
    const document = html ? parseDocument(html, { decodeEntities: true }) : null;
    const titles = document ? findAll(document, 'title') : [];
    const metas = document ? findAll(document, 'meta') : [];
    const links = document ? findAll(document, 'link') : [];
    const meta = (name) => metas.find((node) => node.attribs?.name?.toLowerCase() === name)?.attribs?.content ?? '';
    const built = html ? {
      title: DomUtils.textContent(titles[0] ?? { children: [] }).trim(),
      description: meta('description'), robots: meta('robots'),
      canonical: links.find((node) => node.attribs?.rel?.toLowerCase() === 'canonical')?.attribs?.href ?? '',
      previewMarker: meta('everytip-preview') === 'not-for-publication',
      stagingHostLeak: html.includes('wordpress-159231-2098144.cloudwaysapps.com'),
    } : { missingAsset: true };
    const live = { title: decode(source.seo.title), description: decode(source.seo.metaDesc),
      robots: sourceRobots(source.seo), canonical: sourceCanonical(source.seo, path) };
    records.push({ id, path, live, built, liveLinkPathMatches: source.uri === path,
      parity: html ? { title: live.title === built.title, description: live.description === built.description,
        robots: live.robots === built.robots, canonical: live.canonical === built.canonical } : null });
  }
  const dated = parseDatedLiveOnlyInventory(inventory);
  const newSinceCopy = await Promise.all(dated.all.map(async ({ id, path }) =>
    ({ id, path, exactLocalAsset: Boolean(await assetRead(asset(path))) })));
  const riskRecords = [
    ...dated.ordinary.filter(({ id }) => id !== 91113).map((item) => ({ ...item, family: 'ordinary-tip-hybrid' })),
    ...dated.offerNews.map((item) => ({ ...item, family: 'offer-news' })),
  ];
  if (riskRecords.length !== 31) throw new Error('Expected 31 dated at-risk route identities');
  const delta = { posts: { absentFromStagingSnapshot: newSinceCopy.length,
    newWithoutExactLocalAsset: newSinceCopy.filter((item) => !item.exactLocalAsset).length, newSinceCopy },
    pages: { absentFromStagingSnapshot: 0, newWithoutExactLocalAsset: 0, newSinceCopy: [] } };
  return { seo: { records }, delta,
    risk: { records: riskRecords, ordinary: { count: 13 }, offerNews: { count: 18 } } };
}
