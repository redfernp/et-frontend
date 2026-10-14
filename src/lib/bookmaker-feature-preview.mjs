import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseDocument } from 'htmlparser2';
import { render } from 'dom-serializer';
import sanitizeHtml from 'sanitize-html';
import { latestContentSnapshot } from './migration-preview.mjs';
import { parseCrawlCsv } from './exact-route-preview.mjs';

const crawlPath = resolve(process.cwd(), 'docs/everytip-template-map-2026-09-30.csv');
export const bookmakerFeaturePaths = [
  '/bet365-best-odds-guaranteed',
  '/betfred-best-odds-guaranteed',
  '/william-hill-best-odds-guaranteed',
  '/bet365-cash-out-feature-explained',
  '/betfred-cash-out-feature-explained',
  '/william-hill-cash-out',
  '/how-does-bet365-bet-builder-work',
  '/bet365-lucky-15-betting-guide',
  '/can-bet365-cancel-a-withdrawal',
  '/does-william-hill-pay-first-past-the-post',
  '/william-hill-maximum-payout',
  '/who-owns-betfred',
  '/who-does-bet365-sponsor',
  '/bet365-maximum-bet-limit.html',
  '/betfred-double-delight',
  '/bet365-how-to-bet',
];

const text = (node) => node.type === 'text' ? node.data : (node.children ?? []).map(text).join('');
const containsCommercialLink = (node) => (node.name === 'a' &&
  (/\/go\/|\/sign-up-offer|[?&](?:aff|affiliate|btag|via)=/i.test(node.attribs?.href || '') ||
    /\bsponsored\b/i.test(node.attribs?.rel || ''))) ||
  (node.children ?? []).some(containsCommercialLink);
const stopHeading = /^(?:Related Reading|More (?:Betfred|News|Bookmaker)|Bet365 Related Reading)/i;
const skipHeading = /^(?:Key Terms (?:and|&) Conditions|Bet365 cash out Terms & Conditions)$/i;

export function extractBookmakerFeature(record) {
  if (!bookmakerFeaturePaths.includes(record?.uri)) throw new Error(`Unsupported bookmaker feature: ${record?.uri}`);
  const nodes = parseDocument(record.content || '', { decodeEntities: true }).children.filter((node) => node.type === 'tag');
  const selected = [];
  let skip = false;
  let withheld = 0;
  for (const node of nodes) {
    if (/^h[2-4]$/.test(node.name)) {
      const heading = text(node).trim();
      if (stopHeading.test(heading)) break;
      skip = skipHeading.test(heading);
    }
    if (skip || !['p', 'h2', 'h3', 'h4', 'ul', 'ol', 'blockquote'].includes(node.name) ||
      !text(node).trim() || containsCommercialLink(node) ||
      /^(?:#ad|sign up|get free bets|claim (?:the )?offer)/i.test(text(node).trim())) {
      withheld++;
      continue;
    }
    selected.push(node);
  }
  const html = sanitizeHtml(selected.map(render).join(''), {
    allowedTags: ['p', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'blockquote', 'br'],
    allowedAttributes: {},
    transformTags: { a: () => ({ tagName: 'span', attribs: {} }), img: () => ({ tagName: 'span', attribs: {} }) },
  }).trim();
  if (!html.includes('<h2>') || html.length < 500) throw new Error(`Bookmaker feature extraction needs review: ${record.uri}`);
  return { html, withheld, sourceNodeCount: nodes.length };
}

export async function bookmakerFeaturePreviewRoutes() {
  if (process.env.MIGRATION_EXACT_PREVIEW !== '1') return [];
  const snapshot = await latestContentSnapshot();
  if (!snapshot) throw new Error('Bookmaker feature previews require a local WordPress snapshot');
  const crawl = parseCrawlCsv(await readFile(crawlPath, 'utf8'));
  const records = new Map([...snapshot.posts, ...snapshot.pages].map((record) => [record.uri, record]));
  return bookmakerFeaturePaths.map((path) => {
    const record = records.get(path);
    const crawlRow = crawl.find((row) => row.status_code === '200' && row.path === path);
    if (!record || !crawlRow) throw new Error(`Missing bookmaker feature source: ${path}`);
    return { params: { featureSlug: path.slice(1) }, props: { record, crawlRow, snapshotDate: snapshot.generatedAt,
      editorial: extractBookmakerFeature(record) } };
  });
}
