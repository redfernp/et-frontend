import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root = resolve(process.cwd());
const raw = join(root, 'data', 'raw');
const crawlPath = join(root, 'docs', 'everytip-template-map-2026-09-30.csv');
const archiveTemplates = new Set(['author-archive', 'tag-archive', 'blog-archive', 'category-hub']);
export const ARCHIVE_PAGE_SIZE = 100;

export function parseCrawlCsv(source) {
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  for (let index = 0; index < source.length; index++) {
    const char = source[index];
    if (quoted) {
      if (char === '"' && source[index + 1] === '"') { cell += '"'; index++; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(cell); cell = ''; }
    else if (char === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (char !== '\r') cell += char;
  }
  if (quoted) throw new Error('Unclosed crawl CSV quote');
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [headers, ...values] = rows;
  return values.map((cells, index) => {
    if (cells.length !== headers.length) throw new Error(`Invalid crawl CSV row ${index + 2}`);
    return Object.fromEntries(headers.map((name, column) => [name, cells[column]]));
  });
}

export function archiveRouteKey(path) {
  if (path === '/blog' || /^\/blog\/page\/\d+$/.test(path)) return 'blog';
  const author = /^\/author\/([^/]+)(?:\/page\/\d+)?$/.exec(path);
  if (author) return `user/${author[1]}`;
  const tag = /^\/tag\/([^/]+)$/.exec(path);
  if (tag) return `tag/${tag[1]}`;
  return `category/${path.slice(1)}`;
}

export function archiveRoutePage(path) {
  const match = /\/page\/(\d+)$/.exec(path);
  return match ? Number(match[1]) : 1;
}

export function archivePagePath(path, page) {
  const base = path.replace(/\/page\/\d+$/, '');
  return page === 1 ? base : `${base}/page/${page}`;
}

export function buildArchiveRoutes(crawl, snapshot, occupiedPaths = new Set()) {
  const routes = crawl.filter((row) => row.status_code === '200' && archiveTemplates.has(row.suggested_template) && !occupiedPaths.has(row.path));
  const routePaths = new Set(routes.map((row) => row.path));
  const seen = new Set();
  return routes.map((row) => {
    if (seen.has(row.path)) throw new Error(`Duplicate archive path: ${row.path}`);
    seen.add(row.path);
    const key = archiveRouteKey(row.path);
    const page = archiveRoutePage(row.path);
    const source = key === 'blog' ? { name: 'Reviews', posts: snapshot.blogPosts } : snapshot.archives[key];
    const posts = source?.posts ?? [];
    return {
      path: row.path,
      title: row.title,
      template: row.suggested_template,
      legacyIndexability: row.indexability,
      legacyCanonical: row.canonical || null,
      key,
      page,
      sourceName: source?.name ?? null,
      sourceCount: posts.length,
      entries: posts.slice((page - 1) * ARCHIVE_PAGE_SIZE, page * ARCHIVE_PAGE_SIZE),
      hasPrevious: page > 1,
      hasNext: posts.length > page * ARCHIVE_PAGE_SIZE && routePaths.has(archivePagePath(row.path, page + 1)),
      snapshotDate: snapshot.generatedAt,
    };
  });
}

export async function loadArchiveRoutes() {
  const files = (await readdir(raw)).filter((name) => /^staging-wordpress-archives-.*\.json$/.test(name)).sort();
  if (!files.length) throw new Error('Missing archive snapshot; run node scripts/snapshot-wordpress-archives.mjs');
  const snapshot = JSON.parse(await readFile(join(raw, files.at(-1)), 'utf8'));
  const publicSource = JSON.parse(await readFile(join(raw, snapshot.postSnapshot), 'utf8'));
  const occupiedPaths = new Set([...publicSource.posts, ...publicSource.pages].map(({ uri }) => uri));
  const crawl = parseCrawlCsv(await readFile(crawlPath, 'utf8'));
  return buildArchiveRoutes(crawl, snapshot, occupiedPaths);
}
