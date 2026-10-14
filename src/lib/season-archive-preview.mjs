import { parseDocument } from 'htmlparser2';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { assessContent } from './migration-preview.mjs';
import { parseCrawlCsv } from './exact-route-preview.mjs';

export const seasonArchivePaths = [
  '/john-newsome-archive-posts-2017-2018-season',
  '/john-newsome-archive-posts-2018-2019-season',
  '/john-newsome-archive-posts-2019-2020-season',
  '/john-newsome-archive-posts-2020-2021-season',
  '/john-newsome-archive-posts-2021-2022-season',
];
export const seasonArchiveBuildEnabled = () => process.env.MIGRATION_EXACT_PREVIEW === '1';

export async function seasonArchiveAvailablePaths() {
  const crawl = parseCrawlCsv(await readFile(resolve(process.cwd(), 'docs/everytip-template-map-2026-09-30.csv'), 'utf8'));
  return new Set(crawl.filter((item) => item.status_code === '200').map((item) => item.path));
}

const sourceHosts = new Set(['wordpress-159231-2098144.cloudwaysapps.com', 'www.everytip.co.uk']);

function descendants(node, name) {
  const found = [];
  for (const child of node.children ?? []) {
    if (child.name === name) found.push(child);
    found.push(...descendants(child, name));
  }
  return found;
}

function nodeText(node) {
  if (node.type === 'text') return node.data;
  return (node.children ?? []).map(nodeText).join('');
}

/** @param {Set<string> | null} [availablePaths] */
export function seasonArchivePreview(record, snapshot, availablePaths = null) {
  if (!seasonArchivePaths.includes(record.uri)) throw new Error(`Not a mapped season archive: ${record.uri}`);
  const allRecords = new Map([...snapshot.posts, ...snapshot.pages].map((item) => [item.uri, item]));
  const document = parseDocument(record.content ?? '', { decodeEntities: true });
  const links = [];
  const seen = new Set();
  let withheld = 0;
  for (const li of descendants(document, 'li')) {
    const anchor = descendants(li, 'a')[0];
    if (!anchor) continue;
    let url;
    try { url = new URL(anchor.attribs?.href); } catch { withheld++; continue; }
    const path = url.pathname.replace(/\/$/, '');
    const target = allRecords.get(path);
    if (!sourceHosts.has(url.hostname) || url.protocol !== 'https:' || url.search || url.hash || !target ||
        assessContent(target).length || (availablePaths && !availablePaths.has(path))) {
      withheld++;
      continue;
    }
    if (seen.has(path)) continue;
    seen.add(path);
    const title = nodeText(anchor).replace(/\s+/g, ' ').trim();
    if (!title) { withheld++; continue; }
    links.push({ href: path, title });
  }
  if (links.length < 20) throw new Error(`Season archive ${record.uri} has too few safe entries`);
  return { uri: record.uri, title: record.title, modified: record.modified, seo: record.seo, links, withheld };
}
