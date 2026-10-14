import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseDocument } from 'htmlparser2';
import { render } from 'dom-serializer';
import sanitizeHtml from 'sanitize-html';
import { latestContentSnapshot } from './migration-preview.mjs';
import { parseCrawlCsv } from './exact-route-preview.mjs';
import { classicHtmlToBlocks } from './classic-to-gutenberg.mjs';

const crawlPath = resolve(process.cwd(), 'docs/everytip-template-map-2026-09-30.csv');
const stagingHost = 'wordpress-159231-2098144.cloudwaysapps.com';
const liveHost = 'www.everytip.co.uk';
export const builderRoundupConfigs = {
  '/best-odds-guaranteed-bookies.html': {
    skipFrom: /^Editor.s Quick Pick: Recommended Top BOG Betting Sites$/i,
    resumeAt: /^What is Best Odds Guaranteed\?$/i,
    skipSections: [/^BOG Offers on Multiples$/i, /^BOG on Lucky15 Bets$/i, /^Top BOG Bookmakers Conclusion$/i],
    topic: 'Best Odds Guaranteed',
  },
  '/best-cash-out-betting-sites-uk-ire': {
    skipFrom: /^Our Best Overall Betting Sites For 2026$/i,
    resumeAt: /^Cash out Betting Options Explained$/i,
    skipSections: [/^Related Articles$/i, /^Best Betting Websites With Cash Out Betting Functionality Conclusion$/i],
    topic: 'cash out',
  },
  '/best-rugby-betting-sites': {
    skipFrom: /^Overall Best Rugby Betting Sites$/i,
    resumeAt: /^Tournaments$/i,
    skipSections: [/^Editor.s Pick . Best Rugby Betting Sites$/i],
    topic: 'rugby betting',
  },
  '/best-telephone-betting-bookmakers-uk': {
    skipFrom: /^Editor.s Quick Pick . Top Smartphone Betting Bookmakers in the UK 2026$/i,
    resumeAt: /^What is Telephone Betting\?$/i,
    skipSections: [/^Top 4 Bookies$/i],
    topic: 'telephone betting',
  },
  '/best-darts-betting-sites': {
    skipFrom: /^Best Sites for Darts in 2026$/i,
    resumeAt: /^A brief history of darts$/i,
    skipSections: [/^Editor.s pick. 5 best darts betting sites reviews$/i],
    topic: 'darts betting',
  },
  '/best-snooker-betting-sites': {
    skipFrom: /^Editors Pick . Top Snooker Betting Sites$/i,
    resumeAt: /^A brief history of snooker$/i,
    skipSections: [/^Best online snooker sites \(review roundup\)$/i],
    topic: 'snooker betting',
  },
  '/best-mobile-betting-sites-in-uk': {
    skipFrom: /^The top-rated UK betting sites for mobile$/i,
    resumeAt: /^How to Judge the Quality of a Mobile Sports Betting App$/i,
    skipSections: [/^Best Mobile Betting Apps$/i, /^Bonus Offers for Smartphone and Tablet Users$/i],
    topic: 'mobile betting',
  },
  '/best-betting-sites-for-live-sports-streaming': {
    skipFrom: /^Our Top Picks For Best Sports Streaming Bookmakers . View Welcome Offers$/i,
    resumeAt: /^What Makes the Best Live Betting Sites\?$/i,
    skipSections: [/^Best Live Streaming Betting Sites$/i],
    topic: 'live sports streaming',
  },
  '/top-cricket-betting-sites': {
    skipFrom: /^Our Best Cricket Betting Sites in the UK$/i,
    resumeAt: /^How We Selected These Best Betting Sites For Cricket\?$/i,
    skipSections: [/^Our Top Cricket Betting Sites$/i],
    topic: 'cricket betting',
  },
  '/best-horse-racing-betting-sites': {
    skipFrom: /^Top 7 Best Horse Racing Betting Sites In The UK$/i,
    resumeAt: /^How to Choose the Best Betting Site$/i,
    skipSections: [/^Types Of Best Betting Promotions For Existing Customers$/i, /^Final Verdict$/i],
    topic: 'horse racing betting',
  },
  '/best-betting-sites-for-accumulators.html': {
    skipFrom: /^List of Best Accumulator Betting Sites in 2026$/i,
    resumeAt: /^Football Accumulator Bookies: What To Look For\?$/i,
    skipSections: [/^Our Top-Ranked Accumulator Bonuses$/i, /^Our Top-Ranked Accumulator Insurance$/i, /^Best Loyalty Programs$/i, /^Final Verdict On Best Accumulator Betting Sites$/i],
    topic: 'accumulator betting',
  },
  '/best-golf-betting-sites': {
    skipFrom: /^Top Online Bookmakers For Sports Betting$/i,
    resumeAt: /^How to Bet on Golf$/i,
    skipSections: [],
    topic: 'golf betting',
  },
  '/best-bookie-for-lucky-15-bets-uk-ireland': {
    skipFrom: /^Best Lucky 15 Online Bookmakers List$/i,
    resumeAt: /^What is a Lucky 15\?$/i,
    skipSections: [/^Which is the best Bookmaker for Lucky 15 Bets\?$/i, /^Wrapping Up . Maximise Your Lucky 15 Bets/i],
    topic: 'Lucky 15 betting',
  },
  '/what-is-best-way-to-bet-on-greyhounds': {
    skipFrom: /^Best Overall Greyhound Betting Sites 2026$/i,
    resumeAt: /^What is the Best Way to Bet On Greyhound Racing\?/i,
    skipSections: [],
    topic: 'greyhound betting',
  },
  '/high-stakes-betting-sites-for-high-rollers-vips': {
    skipFrom: /^Best Betting Sites For High Stakes Punters$/i,
    resumeAt: /^What to Look For in VIP Bookies$/i,
    skipSections: [/^Our Recommended High Stake Betting Sites$/i],
    topic: 'high-stakes betting',
  },
};

const plainText = (node) => node.type === 'text' ? node.data : (node.children ?? []).map(plainText).join('');
function firstImage(node) {
  if (node.name === 'img') return node;
  for (const child of node.children ?? []) {
    const image = firstImage(child);
    if (image) return image;
  }
  return null;
}
function approvedHero(nodes) {
  const image = nodes.map(firstImage).find(Boolean);
  if (!image?.attribs?.src) return null;
  try {
    const url = new URL(image.attribs.src);
    if (!['http:', 'https:'].includes(url.protocol) || ![stagingHost, liveHost].includes(url.hostname)
      || !url.pathname.startsWith('/wp-content/uploads/')) return null;
    url.protocol = 'https:';
    url.hostname = liveHost;
    url.search = '';
    url.hash = '';
    return { src: url.toString(), alt: image.attribs.alt || '' };
  } catch { return null; }
}
function hasCommercialLink(node) {
  if (node.name === 'a' && (/\/go\/|\/sign-up-offer|[?&](?:aff|affiliate|btag|via)=/i.test(node.attribs?.href || '')
    || /\bsponsored\b/i.test(node.attribs?.rel || ''))) return true;
  return (node.children ?? []).some(hasCommercialLink);
}
function editorialHtml(nodes) {
  const clean = nodes.filter((node) => ['p', 'h2', 'h3', 'h4', 'ul', 'ol', 'blockquote'].includes(node.name)
    && plainText(node).trim() && !hasCommercialLink(node)
    && !/\b(?:sign up|get £\d+|#ad|editors? quick picks?)\b/i.test(plainText(node)));
  return sanitizeHtml(clean.map(render).join(''), {
    allowedTags: ['p', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'blockquote', 'br'],
    allowedAttributes: {},
    transformTags: { a: () => ({ tagName: 'span', attribs: {} }), img: () => ({ tagName: 'span', attribs: {} }) },
  }).trim();
}

export function extractBuilderRoundup(record) {
  const config = builderRoundupConfigs[record?.uri];
  if (!config) throw new Error(`Unsupported builder roundup URI: ${record?.uri}`);
  const nodes = parseDocument(record.content || '', { decodeEntities: true }).children.filter((node) => node.type === 'tag');
  const start = nodes.findIndex((node) => node.name === 'h2' && config.skipFrom.test(plainText(node).trim()));
  const end = nodes.findIndex((node, index) => index > start && node.name === 'h2' && config.resumeAt.test(plainText(node).trim()));
  if (start < 0 || end <= start) throw new Error(`Builder roundup boundaries changed: ${record.uri}`);
  const hero = approvedHero(nodes.slice(0, start));
  const intro = editorialHtml(nodes.slice(0, start));
  let skipSection = false;
  const after = [];
  for (const node of nodes.slice(end)) {
    if (node.name === 'h2') skipSection = config.skipSections.some((pattern) => pattern.test(plainText(node).trim()));
    if (!skipSection) after.push(node);
  }
  const body = editorialHtml(after);
  if (!intro || !body || !body.includes('<h2>')) throw new Error(`Roundup editorial extraction needs review: ${record.uri}`);
  return { hero, intro, body, topic: config.topic, withheldNodes: end - start, sourceNodeCount: nodes.length };
}

export async function builderRoundupPreviewPaths() {
  if (process.env.MIGRATION_EXACT_PREVIEW !== '1') return [];
  const snapshot = await latestContentSnapshot();
  if (!snapshot) throw new Error('Builder roundup previews require a local WordPress snapshot');
  const crawl = parseCrawlCsv(await readFile(crawlPath, 'utf8'));
  let draftFixtures = new Map();
  try {
    const captured = JSON.parse(await readFile(resolve(process.cwd(), 'data/raw/staging-builder-editorial-drafts.json'), 'utf8'));
    if (!Array.isArray(captured.pages)) throw new Error('Invalid builder draft capture');
    draftFixtures = new Map(captured.pages.map((page) => [page.uri, page]));
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const records = new Map([...snapshot.posts, ...snapshot.pages].map((record) => [record.uri, record]));
  return Object.keys(builderRoundupConfigs).map((path) => {
    const crawlRow = crawl.find((row) => row.path === path && row.status_code === '200');
    const record = records.get(path);
    if (!crawlRow || !record) throw new Error(`Missing exact builder roundup source: ${path}`);
    const editorial = extractBuilderRoundup(record);
    const draft = draftFixtures.get(path);
    if (draft) {
      const expected = classicHtmlToBlocks(`${editorial.intro}\n${editorial.body}`);
      const expectedIds = {
        '/best-bookie-for-lucky-15-bets-uk-ireland': 90892,
        '/what-is-best-way-to-bet-on-greyhounds': 90893,
        '/high-stakes-betting-sites-for-high-rollers-vips': 90894,
      };
      if (draft.draftId !== expectedIds[path] || draft.sourceId !== record.databaseId ||
          draft.status !== 'draft' || draft.content !== expected) {
        throw new Error(`Staging Gutenberg draft capture does not match reviewed editorial: ${path}`);
      }
    }
    return { params: { roundupSlug: path.slice(1) }, props: { record, editorial, draft, crawlRow, snapshotDate: snapshot.generatedAt } };
  });
}
