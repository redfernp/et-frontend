import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseDocument } from 'htmlparser2';
import { render } from 'dom-serializer';
import sanitizeHtml from 'sanitize-html';
import { latestContentSnapshot } from './migration-preview.mjs';
import { parseCrawlCsv } from './exact-route-preview.mjs';

const crawlPath = resolve(process.cwd(), 'docs/everytip-template-map-2026-09-30.csv');
const stagingHost = 'wordpress-159231-2098144.cloudwaysapps.com';
const liveHost = 'www.everytip.co.uk';
const excludedHeading = /\b(?:today|latest|fixtures?|where to bet|bookmakers?|bookies|free bets?|offers?|racecourse tips and guides list|guides list)\b/i;
export const topLevelRacecoursePaths = ['/epsom-downs-racing-tips', '/york-racing-tips', '/ascot-racing-tips', '/cheltenham-racing-tips'];

function plainText(node) {
  if (node.type === 'text') return node.data;
  return (node.children ?? []).map(plainText).join('');
}

function imageFromNode(node) {
  if (node.name === 'img') return node;
  for (const child of node.children ?? []) {
    const image = imageFromNode(child);
    if (image) return image;
  }
  return null;
}

function findEditorialContainer(node) {
  if (node.name === 'div' && /(?:^|\s)markdown(?:\s|$)/.test(node.attribs?.class || '')
    && /(?:^|\s)prose(?:\s|$)/.test(node.attribs?.class || '')) return node;
  for (const child of node.children ?? []) {
    const found = findEditorialContainer(child);
    if (found) return found;
  }
  return null;
}

function approvedHero(node) {
  const image = imageFromNode(node);
  if (!image?.attribs?.src) return null;
  try {
    const url = new URL(image.attribs.src);
    if (!['https:', 'http:'].includes(url.protocol) || ![stagingHost, liveHost].includes(url.hostname)
      || !url.pathname.startsWith('/wp-content/uploads/')) return null;
    url.protocol = 'https:';
    url.hostname = liveHost;
    url.search = '';
    url.hash = '';
    return { src: url.toString(), alt: image.attribs.alt || '' };
  } catch { return null; }
}

function sanitizedEditorial(nodes) {
  return sanitizeHtml(nodes.map((node) => render(node)).join(''), {
    allowedTags: ['p', 'h3', 'h4', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'blockquote', 'br'],
    allowedAttributes: {},
    transformTags: { a: () => ({ tagName: 'span', attribs: {} }), img: () => ({ tagName: 'span', attribs: {} }) },
  }).trim();
}

function containsCommercialLink(node) {
  if (node.name === 'a') {
    const href = node.attribs?.href || '';
    if (/\/go\/|\/sign-up-offer|[?&](?:aff|affiliate|btag|via)=/i.test(href)
      || /\bsponsored\b/i.test(node.attribs?.rel || '')) return true;
  }
  return (node.children ?? []).some(containsCommercialLink);
}

export function extractRacecoursePreview(record) {
  if (!/^\/racecourses\/[a-z0-9-]+$/.test(record?.uri || '') && !topLevelRacecoursePaths.includes(record?.uri)) throw new Error('Expected an exact racecourse page URI');
  const document = parseDocument(record.content || '');
  // This legacy Epsom page contains a copied editor wrapper around its article.
  // Select the article container explicitly; never flatten arbitrary builder markup.
  const sourceNodes = record.uri === '/epsom-downs-racing-tips'
    ? findEditorialContainer(document)?.children ?? []
    : document.children;
  const introNodes = [];
  const sections = [];
  let current = null;
  let hero = null;
  let excluded = false;
  let discardedModules = 0;
  for (const node of sourceNodes) {
    if (node.type !== 'tag') continue;
    if (node.name === 'h2') {
      const heading = plainText(node).trim();
      excluded = excludedHeading.test(heading);
      current = excluded ? null : { heading, nodes: [] };
      if (current) sections.push(current);
      continue;
    }
    if (!['p', 'h3', 'h4', 'ul', 'ol', 'blockquote'].includes(node.name)) {
      discardedModules++;
      continue;
    }
    if (excluded || containsCommercialLink(node)) continue;
    if (node.name === 'p' && imageFromNode(node)) {
      hero ??= approvedHero(node);
      continue;
    }
    if (node.name === 'p' && !plainText(node).trim()) continue;
    if (current) current.nodes.push(node);
    else if (node.name === 'p') introNodes.push(node);
  }
  const introHtml = sanitizedEditorial(introNodes);
  const cleanSections = sections.map(({ heading, nodes }) => ({ heading, html: sanitizedEditorial(nodes) }))
    .filter(({ heading, html }) => heading && html);
  if (cleanSections.length < 2) {
    throw new Error(`Racecourse editorial extraction needs review: ${record.uri} (${cleanSections.length} sections)`);
  }
  return { hero, introHtml, sections: cleanSections, discardedModules };
}

export async function racecoursePreviewPaths() {
  if (process.env.MIGRATION_EXACT_PREVIEW !== '1') return [];
  const snapshot = await latestContentSnapshot();
  if (!snapshot) throw new Error('Racecourse preview requires the local WordPress snapshot');
  const crawl = parseCrawlCsv(await readFile(crawlPath, 'utf8'));
  const pages = new Map(snapshot.pages.map((page) => [page.uri, page]));
  return crawl.filter((row) => row.status_code === '200' && row.suggested_template === 'racecourse-guide')
    .map((row) => {
      const record = pages.get(row.path);
      if (!record) throw new Error(`Missing racecourse page in snapshot: ${row.path}`);
      const editorial = extractRacecoursePreview(record);
      return {
        params: { course: row.path.split('/').at(-1) },
        props: { record, editorial, snapshotDate: snapshot.generatedAt, crawlRow: row },
      };
    });
}

export async function topLevelRacecoursePreviewPaths() {
  if (process.env.MIGRATION_EXACT_PREVIEW !== '1') return [];
  const snapshot = await latestContentSnapshot();
  if (!snapshot) throw new Error('Top-level racecourse preview requires the local WordPress snapshot');
  const crawl = parseCrawlCsv(await readFile(crawlPath, 'utf8'));
  return topLevelRacecoursePaths.map((path) => {
    const record = snapshot.pages.find((page) => page.uri === path);
    const crawlRow = crawl.find((row) => row.path === path && row.status_code === '200');
    if (!record || !crawlRow) throw new Error(`Missing top-level racecourse source: ${path}`);
    return { params: { courseSlug: path.slice(1) }, props: { record, editorial: extractRacecoursePreview(record), snapshotDate: snapshot.generatedAt, crawlRow } };
  });
}
