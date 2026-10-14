// Guarded staging-only repair of the unpublished PayPal Gutenberg fixture.
// Run preview-paypal-roundup-conversion.mjs successfully first. Never edits
// the published original, changes status, or introduces affiliate links.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { parseDocument, DomUtils } from 'htmlparser2';

const apply = process.argv[2] === '--apply';
if (process.argv.length > 3 || (process.argv[2] && !apply)) {
  throw new Error('Usage: repair-paypal-roundup-draft.mjs [--apply]');
}
const site = new URL(process.env.EVERYTIP_WP_BASE_URL ?? '');
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') {
  throw new Error('Only the named EveryTip staging site is permitted');
}
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!username || !password) throw new Error('Missing staging REST credentials');
const headers = { Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}` };
const request = async (path, options = {}) => {
  const response = await fetch(new URL(path, site), {
    ...options, headers: { ...headers, ...options.headers }, signal: AbortSignal.timeout(45000),
  });
  if (!response.ok) throw new Error(`Staging ${options.method ?? 'GET'} ${path}: HTTP ${response.status}`);
  return response.json();
};
const originalPath = '/wp-json/wp/v2/posts/58743?context=edit';
const draftPath = '/wp-json/wp/v2/posts/90868?context=edit';
const [original, before] = await Promise.all([request(originalPath), request(draftPath)]);
if (original.id !== 58743 || original.slug !== 'best-paypal-betting-sites' || original.status !== 'publish' ||
    original.modified !== '2026-09-25T18:21:16') {
  throw new Error('Published staging source changed; regenerate and review before draft repair');
}
if (before.id !== 90868 || before.slug !== 'staging-gutenberg-conversion-paypal-roundup-2026' ||
    before.status !== 'draft' || before.modified !== '2026-10-02T21:09:48' ||
    (before.content?.raw.match(/<!-- wp:/g) ?? []).length !== 200 ||
    before.acf?.ranked_entries?.map((entry) => entry.offer).join(',') !== '90846,90850,90849,90852') {
  throw new Error('Unrecognised draft identity, body or ACF state; no write made');
}
const converted = await readFile(new URL('../data/raw/wp-gutenberg-preview-58743.html', import.meta.url), 'utf8');
const details = (html) => {
  const document = parseDocument(html, { decodeEntities: true });
  const all = (predicate) => DomUtils.findAll(predicate, document.children);
  const text = (node) => DomUtils.textContent(node).replace(/\s+/g, ' ').trim();
  return {
    blocks: (html.match(/<!-- wp:/g) ?? []).length,
    offers: (html.match(/<!-- wp:acf\/everytip-offer-slot /g) ?? []).length,
    tables: all((node) => node.name === 'table').map((node) => ({
      rows: DomUtils.findAll((child) => child.name === 'tr', [node]).length,
      text: text(node),
    })),
    images: all((node) => node.name === 'img').map((node) => node.attribs?.src),
    links: all((node) => node.name === 'a' && node.attribs?.href).map((node) => node.attribs.href),
    headings: all((node) => /^h[1-6]$/.test(node.name ?? '')).map((node) => text(node)),
  };
};
const expected = details(converted);
const existing = details(before.content.raw);
const seo = (post) => ({ title: post.yoast_head_json?.title,
  description: post.yoast_head_json?.description, canonical: post.yoast_head_json?.canonical,
  robots: post.yoast_head_json?.robots });
const allowedLinks = [
  '/bet365-review', '/bet365-review', '/betfred-review', '/betfred-review',
  '/how-to-lay-a-horse-to-lose-on-betfair.html', '/betfair-sportsbook-review', 'https://www.paypal.com/',
];
const checks = {
  structure: expected.blocks === 200 && expected.offers === 4 && expected.tables.length === 1 &&
    expected.tables[0].rows === 38 && expected.images.length === 5,
  existingStructure: existing.blocks === expected.blocks && existing.offers === expected.offers &&
    existing.tables.length === 1 && existing.tables[0].text === expected.tables[0].text &&
    JSON.stringify(existing.images) === JSON.stringify(expected.images),
  safeLinks: JSON.stringify([...expected.links].sort()) === JSON.stringify([...allowedLinks].sort()) &&
    !/href="[^"]*\/go\//i.test(converted),
  oldLinksAbsent: existing.links.length === 0,
  decodedHeadings: expected.headings.length === 43 &&
    !expected.headings.some((heading) => /&(?:amp|#8211);/.test(heading)),
  noBuilderOrNinja: !/\bfl-builder\b|ninja_table/i.test(converted),
  draftBodyChanges: before.content.raw !== converted,
};
console.log(JSON.stringify({ environment: 'staging', mode: apply ? 'apply' : 'dry-run',
  draftId: before.id, originalId: original.id, checks, retainedOfferIds: before.acf.ranked_entries.map((entry) => entry.offer),
  editorialLinkCount: expected.links.length, tableRows: expected.tables[0]?.rows }, null, 2));
if (Object.values(checks).some((pass) => !pass)) throw new Error('Draft repair guard failed; no write made');
if (apply) {
  const reread = await request(draftPath);
  if (reread.modified !== before.modified || reread.content?.raw !== before.content.raw ||
      JSON.stringify(reread.acf) !== JSON.stringify(before.acf)) {
    throw new Error('Draft changed immediately before write; no write made');
  }
  const directory = new URL('../data/raw/', import.meta.url);
  await mkdir(directory, { recursive: true });
  const stamp = new Date().toISOString().replaceAll(':', '-');
  const backup = new URL(`wp-paypal-draft-90868-pre-repair-${stamp}.json`, directory);
  await writeFile(backup, JSON.stringify({ savedAt: new Date().toISOString(),
    original: { id: original.id, slug: original.slug, modified: original.modified, seo: original.yoast_head_json },
    draft: { id: before.id, slug: before.slug, status: before.status, modified: before.modified,
      title: before.title?.raw, content: before.content.raw, acf: before.acf, seo: before.yoast_head_json,
      categories: before.categories, author: before.author, date: before.date, featuredMedia: before.featured_media },
  }, null, 2), { flag: 'wx' });
  await request('/wp-json/wp/v2/posts/90868', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: converted }),
  });
  const after = await request(draftPath);
  const actual = details(after.content?.raw ?? '');
  const verified = {
    identity: after.id === before.id && after.slug === before.slug && after.status === 'draft' &&
      after.title?.raw === before.title?.raw && after.date === before.date &&
      after.author === before.author && after.featured_media === before.featured_media &&
      JSON.stringify(after.categories) === JSON.stringify(before.categories),
    rawEqual: after.content?.raw === converted,
    structure: actual.blocks === 200 && actual.offers === 4 && actual.tables.length === 1 &&
      actual.tables[0].rows === 38 && actual.tables[0].text === existing.tables[0].text &&
      JSON.stringify(actual.images) === JSON.stringify(existing.images),
    links: JSON.stringify([...actual.links].sort()) === JSON.stringify([...allowedLinks].sort()),
    acf: JSON.stringify(after.acf) === JSON.stringify(before.acf),
    seo: JSON.stringify(seo(after)) === JSON.stringify(seo(before)),
  };
  console.log(JSON.stringify({ environment: 'staging', draftId: after.id,
    independentReadback: verified, backup: backup.pathname }, null, 2));
  if (Object.values(verified).some((pass) => !pass)) process.exitCode = 1;
}
