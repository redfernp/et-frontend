// Read-only comparison of the named priority routes against live WordPress SEO.
// This is a preview audit, never a publication or indexing switch.
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseDocument } from 'htmlparser2';

const root = resolve(import.meta.dirname, '..');
const routes = [
  [16, 'pages', '/'],
  [76939, 'pages', '/free-betting-tips'],
  [56315, 'pages', '/bookie-free-bets-bonus-offers'],
  [87553, 'pages', '/bet365-review'],
  [58743, 'posts', '/best-paypal-betting-sites.html'],
  [33470, 'posts', '/low-or-no-minimum-deposit-betting-sites.html'],
  [72421, 'posts', '/value-bet-tips-dark-horses.html'],
  [45270, 'pages', '/racecourses/kempton-racing-tips'],
  [41881, 'pages', '/free-horse-racing-tips'],
  [70281, 'pages', '/safer-gambling'],
  [61, 'pages', '/terms-conditions'],
  [6376, 'pages', '/privacy-policy'],
  [23888, 'pages', '/saturday-horse-racing-tips'],
  [24016, 'pages', '/english-premier-league-predictions-for-saturday'],
  [12835, 'pages', '/professional-winning-tipsters-comparison-table'],
];

const assetPath = (path) => path === '/' ? join(root, 'dist/index.html')
  : path.endsWith('.html') ? join(root, 'dist', path.slice(1))
    : join(root, 'dist', path.replace(/^\/+|\/+$/g, ''), 'index.html');
const collect = (node, name, output = []) => {
  if (node.name === name) output.push(node);
  for (const child of node.children ?? []) collect(child, name, output);
  return output;
};
const text = (node) => node?.type === 'text' ? node.data : (node?.children ?? []).map(text).join('');
const findMeta = (nodes, name) => nodes.find((node) =>
  node.attribs?.name?.toLowerCase() === name)?.attribs?.content ?? '';
const findCanonical = (nodes) => nodes.find((node) =>
  node.attribs?.rel?.toLowerCase() === 'canonical')?.attribs?.href ?? '';
const hasNoindex = (robots) => /(?:^|[,\s])noindex(?:$|[,\s])/i.test(robots);
const canonicalPath = (path) => `https://www.everytip.co.uk${path}`;

async function liveSeo(id, type) {
  const url = `https://www.everytip.co.uk/wp-json/wp/v2/${type}/${id}?_fields=id,slug,status,link,modified,yoast_head_json`;
  const response = await fetch(url, { signal: AbortSignal.timeout(25000) });
  if (!response.ok) throw new Error(`Live REST HTTP ${response.status}`);
  const item = await response.json();
  if (item.id !== id || item.status !== 'publish') throw new Error('Live identity/status mismatch');
  const seo = item.yoast_head_json ?? {};
  return {
    slug: item.slug, link: item.link, modified: item.modified,
    title: seo.title ?? '', description: seo.description ?? '',
    canonical: seo.canonical ?? '',
    robots: `${seo.robots?.index ?? 'unknown'},${seo.robots?.follow ?? 'unknown'}`,
  };
}

async function builtSeo(path) {
  const asset = assetPath(path);
  if (!existsSync(asset)) return { missingAsset: true };
  const html = await readFile(asset, 'utf8');
  const document = parseDocument(html);
  const metas = collect(document, 'meta');
  const links = collect(document, 'link');
  return {
    title: text(collect(document, 'title')[0]).trim(),
    description: findMeta(metas, 'description'),
    canonical: findCanonical(links),
    robots: findMeta(metas, 'robots'),
    previewMarker: Boolean(findMeta(metas, 'everytip-preview')),
    stagingHostLeak: html.includes('wordpress-159231-2098144.cloudwaysapps.com'),
  };
}

const records = await Promise.all(routes.map(async ([id, type, path]) => {
  const record = { id, type, path, expectedCanonical: canonicalPath(path) };
  try { record.live = await liveSeo(id, type); }
  catch (error) { record.liveError = String(error.message ?? error); }
  record.built = await builtSeo(path);
  if (record.live && !record.built.missingAsset) {
    record.parity = {
      title: record.live.title === record.built.title,
      description: record.live.description === record.built.description,
      canonical: record.live.canonical === record.built.canonical,
      robots: record.live.robots === record.built.robots,
    };
    record.intentionalPreviewNoindex = record.built.previewMarker && hasNoindex(record.built.robots);
    record.accidentallyIndexablePreview = record.built.previewMarker && !hasNoindex(record.built.robots);
    record.liveCanonicalSelfMatches = record.live.canonical === record.expectedCanonical;
    record.liveLinkPathMatches = new URL(record.live.link).pathname === path;
  }
  return record;
}));
const result = { auditedAt: new Date().toISOString(), readOnly: true,
  summary: {
    routes: records.length,
    liveReadErrors: records.filter((row) => row.liveError).length,
    missingAssets: records.filter((row) => row.built.missingAsset).length,
    intentionalPreviewNoindex: records.filter((row) => row.intentionalPreviewNoindex).length,
    accidentallyIndexablePreview: records.filter((row) => row.accidentallyIndexablePreview).length,
    liveLinkPathMismatches: records.filter((row) => row.liveLinkPathMatches === false).length,
    titleDifferences: records.filter((row) => row.parity?.title === false).length,
    descriptionDifferences: records.filter((row) => row.parity?.description === false).length,
    canonicalDifferences: records.filter((row) => row.parity?.canonical === false).length,
    robotsDifferences: records.filter((row) => row.parity?.robots === false).length,
  }, records };
if (process.argv.includes('--summary')) {
  const { records, ...summary } = result;
  console.log(JSON.stringify({ ...summary,
    routeFlags: records.map((row) => ({ path: row.path,
      liveError: row.liveError, missingAsset: row.built.missingAsset,
      previewNoindex: row.intentionalPreviewNoindex,
      accidentalPreviewIndex: row.accidentallyIndexablePreview,
      liveSelfCanonical: row.liveCanonicalSelfMatches,
      liveLinkPathMatches: row.liveLinkPathMatches,
      parity: row.parity, stagingHostLeak: row.built.stagingHostLeak,
    })) }, null, 2));
} else console.log(JSON.stringify(result, null, 2));
