// Guarded staging-only removal of obsolete Betfred offer paragraphs from the
// unpublished low-deposit roundup fixture. Published post 33470 is read-only.
import { mkdir, writeFile } from 'node:fs/promises';
import { parseDocument, DomUtils } from 'htmlparser2';

const apply = process.argv[2] === '--apply';
if (process.argv.length > 3 || (process.argv[2] && !apply)) {
  throw new Error('Usage: repair-low-deposit-roundup-draft.mjs [--apply]');
}
const site = new URL(process.env.EVERYTIP_WP_BASE_URL ?? '');
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') {
  throw new Error('Named EveryTip staging host only');
}
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!username || !password) throw new Error('Missing staging REST credentials');
const headers = { Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}` };
const read = async (id) => {
  const response = await fetch(new URL(`/wp-json/wp/v2/posts/${id}?context=edit`, site),
    { headers, signal: AbortSignal.timeout(45000) });
  if (!response.ok) throw new Error(`Staging post ${id} read HTTP ${response.status}`);
  return response.json();
};
const [source, before] = await Promise.all([read(33470), read(90880)]);
if (source.id !== 33470 || source.slug !== 'low-or-no-minimum-deposit-betting-sites' ||
    source.status !== 'publish' || source.modified !== '2026-09-25T10:41:58' ||
    before.id !== 90880 || before.slug !== 'staging-gutenberg-conversion-low-deposit-roundup-2026' ||
    before.status !== 'draft' || before.modified !== '2026-10-02T21:53:36' ||
    before.acf?.ranked_entries?.length !== 1 || before.acf.ranked_entries[0].offer !== 90846) {
  throw new Error('Unexpected source/draft identity or revision; no write made');
}
const raw = before.content?.raw ?? '';
const blocks = [...raw.matchAll(/<!-- wp:([\w-]+)(?:\s[^>]*)? -->([\s\S]*?)<!-- \/wp:\1 -->/g)]
  .map((match, index) => ({ index, type: match[1], body: match[2], whole: match[0] }));
if (blocks.length !== 67 || blocks.map((block) => block.whole).join('\n\n') !== raw) {
  throw new Error('Unexpected Gutenberg block shape; no write made');
}
const isObsoleteOfferBlock = (block) => block.type === 'paragraph' &&
  /BETFRED50|Bet £10 Get £50 in Free Bets|one of the best welcome bonus offers at the moment/i.test(block.body);
const removed = blocks.filter(isObsoleteOfferBlock);
if (removed.map((block) => block.index).join(',') !== '6,8,22,23' ||
    removed.filter((block) => /BETFRED50/i.test(block.body)).length !== 3) {
  throw new Error('Old offer block boundaries changed; no write made');
}
const revised = blocks.filter((block) => !isObsoleteOfferBlock(block)).map((block) => block.whole).join('\n\n');
const inventory = (html) => {
  const document = parseDocument(html, { decodeEntities: true });
  const all = (predicate) => DomUtils.findAll(predicate, document.children);
  return {
    headings: all((node) => /^h[1-6]$/.test(node.name ?? '')).map((node) => DomUtils.textContent(node)),
    images: all((node) => node.name === 'img').map((node) => node.attribs?.src),
    links: all((node) => node.name === 'a' && node.attribs?.href).map((node) => node.attribs.href),
  };
};
const beforeInventory = inventory(raw);
const afterInventory = inventory(revised);
const checks = {
  remainingBlocks: (revised.match(/<!-- wp:/g) ?? []).length === 63,
  exactUnchangedBlocks: blocks.filter((block) => !isObsoleteOfferBlock(block)).every((block) => revised.includes(block.whole)),
  headingsImagesLinks: JSON.stringify(beforeInventory) === JSON.stringify(afterInventory),
  obsoleteCopyAbsent: !/BETFRED50|3 x £10 in Sports Free Bets|2 x £10 in Acca Free Bets|Bet £10 Get £50 in Free Bets/i.test(revised),
  noAffiliateLinks: !/<a\b[^>]*href="[^"]*\/go\//i.test(revised),
};
console.log(JSON.stringify({ environment: 'staging', mode: apply ? 'apply' : 'dry-run',
  originalId: source.id, draftId: before.id, removedBlockIndexes: removed.map((block) => block.index), checks,
  diagnostics: { beforeBlockMarkers: (raw.match(/<!-- wp:/g) ?? []).length,
    revisedBlockMarkers: (revised.match(/<!-- wp:/g) ?? []).length,
    before: { headings: beforeInventory.headings.length, images: beforeInventory.images.length, links: beforeInventory.links.length },
    after: { headings: afterInventory.headings.length, images: afterInventory.images.length, links: afterInventory.links.length } } }, null, 2));
if (Object.values(checks).some((pass) => !pass)) throw new Error('Safe low-deposit draft repair guard failed');
if (apply) {
  const [sourceAgain, draftAgain] = await Promise.all([read(33470), read(90880)]);
  if (sourceAgain.modified !== source.modified || sourceAgain.content?.raw !== source.content.raw ||
      draftAgain.modified !== before.modified || draftAgain.content?.raw !== raw ||
      JSON.stringify(draftAgain.acf) !== JSON.stringify(before.acf)) {
    throw new Error('Source or draft changed immediately before write; no write made');
  }
  const directory = new URL('../data/raw/', import.meta.url);
  await mkdir(directory, { recursive: true });
  const stamp = new Date().toISOString().replaceAll(':', '-');
  const backup = new URL(`wp-low-deposit-draft-90880-pre-repair-${stamp}.json`, directory);
  await writeFile(backup, JSON.stringify({ savedAt: new Date().toISOString(),
    source: { id: source.id, slug: source.slug, status: source.status, modified: source.modified,
      raw: source.content.raw, seo: source.yoast_head_json },
    draft: { id: before.id, slug: before.slug, status: before.status, modified: before.modified,
      date: before.date, title: before.title?.raw, content: raw, acf: before.acf,
      author: before.author, categories: before.categories, featuredMedia: before.featured_media,
      seo: before.yoast_head_json }, revised,
  }, null, 2), { flag: 'wx' });
  const update = await fetch(new URL('/wp-json/wp/v2/posts/90880', site), {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: revised, date: before.date }), signal: AbortSignal.timeout(45000),
  });
  if (!update.ok) throw new Error(`Staging draft update HTTP ${update.status}`);
  const [after, sourceAfter] = await Promise.all([read(90880), read(33470)]);
  const verified = {
    identity: after.id === before.id && after.status === 'draft' && after.slug === before.slug &&
      after.title?.raw === before.title?.raw && after.date === before.date &&
      after.author === before.author && after.featured_media === before.featured_media &&
      JSON.stringify(after.categories) === JSON.stringify(before.categories),
    raw: after.content?.raw === revised,
    structure: (after.content?.raw.match(/<!-- wp:/g) ?? []).length === 63 &&
      JSON.stringify(inventory(after.content?.rendered ?? '')) === JSON.stringify(inventory(before.content?.rendered ?? '')),
    acf: JSON.stringify(after.acf) === JSON.stringify(before.acf),
    originalUnchanged: sourceAfter.id === source.id && sourceAfter.modified === source.modified &&
      sourceAfter.content?.raw === source.content.raw && sourceAfter.status === 'publish',
  };
  console.log(JSON.stringify({ environment: 'staging', draftId: after.id, status: after.status,
    independentReadback: verified, backup: backup.pathname }, null, 2));
  if (Object.values(verified).some((pass) => !pass)) process.exitCode = 1;
}
