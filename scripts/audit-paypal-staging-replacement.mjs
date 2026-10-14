// Read-only comparison of the approved PayPal draft with the published staging
// post and the live public post. Never logs authentication material or raw HTML.
import { createHash } from 'node:crypto';
import { parseDocument, DomUtils } from 'htmlparser2';

const base = new URL(process.env.EVERYTIP_WP_BASE_URL ?? '');
if (base.protocol !== 'https:' || base.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') {
  throw new Error('Named EveryTip staging host only');
}
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!username || !password) throw new Error('Missing staging read credentials');
const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
const fetchPost = async (id, live = false) => {
  const url = live
    ? new URL(`/wp-json/wp/v2/posts/${id}`, 'https://www.everytip.co.uk')
    : new URL(`/wp-json/wp/v2/posts/${id}?context=edit`, base);
  const response = await fetch(url, {
    headers: live ? {} : { Authorization: authorization },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`${live ? 'Live' : 'Staging'} post ${id}: HTTP ${response.status}`);
  return response.json();
};

const normalize = (value) => value.replace(/\s+/g, ' ').trim();
const hash = (value) => createHash('sha256').update(value).digest('hex').slice(0, 20);
const all = (document, predicate) => DomUtils.findAll(predicate, document.children);
const summarize = (post) => {
  const html = post.content?.rendered ?? '';
  const raw = post.content?.raw ?? '';
  const document = parseDocument(html, { decodeEntities: true });
  const text = (node) => normalize(DomUtils.textContent(node));
  const headings = all(document, (node) => /^h[1-6]$/.test(node.name ?? '')).map((node) => ({
    level: node.name, text: text(node),
  }));
  const tables = all(document, (node) => node.name === 'table').map((table) => ({
    rows: DomUtils.findAll((node) => node.name === 'tr', [table]).length,
    cells: DomUtils.findAll((node) => node.name === 'td' || node.name === 'th', [table]).length,
    textLength: text(table).length,
    textHash: hash(text(table)),
  }));
  const images = all(document, (node) => node.name === 'img').map((node) => node.attribs?.src ?? '');
  const links = all(document, (node) => node.name === 'a' && node.attribs?.href).map((node) => node.attribs.href);
  return {
    id: post.id, status: post.status, slug: post.slug, modified: post.modified,
    title: post.title?.raw ?? post.title?.rendered,
    textLength: text(document).length, textHash: hash(text(document)), headings,
    tables, images, links,
    blocks: (raw.match(/<!--\s*wp:/g) ?? []).length,
    renderedOfferReferences: (html.match(/data-everytip-offer-slot="\d+"/g) ?? []).length,
    acf: {
      rankedEntries: post.acf?.ranked_entries?.map((entry) => ({
        offer: entry.offer, bestFor: entry.best_for, editorialVerdict: entry.editorial_verdict,
      })) ?? [],
      guideIntro: post.acf?.guide_intro ?? '',
    },
    seo: {
      title: post.yoast_head_json?.title, description: post.yoast_head_json?.description,
      robots: post.yoast_head_json?.robots, canonical: post.yoast_head_json?.canonical,
    },
  };
};

const [staging, draft, live] = await Promise.all([
  fetchPost(58743), fetchPost(90868), fetchPost(58743, true),
]);
if (staging.id !== 58743 || staging.slug !== 'best-paypal-betting-sites' || staging.status !== 'publish' ||
    draft.id !== 90868 || draft.slug !== 'staging-gutenberg-conversion-paypal-roundup-2026' || draft.status !== 'draft' ||
    live.id !== 58743 || live.slug !== staging.slug || live.status !== 'publish') {
  throw new Error('Unexpected PayPal source/draft identity or publication state');
}
const summaries = { staging: summarize(staging), draft: summarize(draft), live: summarize(live) };
const visibleText = (post) => normalize(DomUtils.textContent(parseDocument(post.content?.rendered ?? '', { decodeEntities: true })));
const firstDifference = (left, right) => {
  let offset = 0;
  while (offset < Math.min(left.length, right.length) && left[offset] === right[offset]) offset++;
  return { offset, left: left.slice(Math.max(0, offset - 40), offset + 90),
    right: right.slice(Math.max(0, offset - 40), offset + 90) };
};
const textDifferences = {
  liveVersusStaging: firstDifference(visibleText(live), visibleText(staging)),
  draftVersusStaging: firstDifference(visibleText(draft), visibleText(staging)),
};
const stagingWithoutAdminTableLink = normalize(visibleText(staging).replace(/\bEdit Table\b/g, ''));
const normalizeSourceLink = (href) => href.replace('https://wordpress-159231-2098144.cloudwaysapps.com',
  'https://www.everytip.co.uk');
const gate = {
  liveAndStagingModifiedEqual: staging.modified === live.modified,
  liveAndStagingTextEqual: summaries.staging.textHash === summaries.live.textHash,
  liveAndStagingEditorialTextEqual: stagingWithoutAdminTableLink === visibleText(live),
  liveAndStagingEditorialLinksEqual: JSON.stringify(summaries.staging.links
    .filter((href) => !href.includes('/wp-admin/admin.php?page=ninja_tables'))
    .map(normalizeSourceLink)) === JSON.stringify(summaries.live.links),
  draftAndStagingTextEqual: summaries.draft.textHash === summaries.staging.textHash,
  draftAndStagingHeadingsEqual: JSON.stringify(summaries.draft.headings) === JSON.stringify(summaries.staging.headings),
  draftAndStagingTablesEqual: JSON.stringify(summaries.draft.tables) === JSON.stringify(summaries.staging.tables),
  draftAndStagingImagesEqual: JSON.stringify(summaries.draft.images) === JSON.stringify(summaries.staging.images),
  draftAndStagingLinksEqual: JSON.stringify(summaries.draft.links) === JSON.stringify(summaries.staging.links),
  draftAndStagingSeoEqual: summaries.draft.seo.title === summaries.staging.seo.title &&
    summaries.draft.seo.description === summaries.staging.seo.description &&
    JSON.stringify(summaries.draft.seo.robots) === JSON.stringify(summaries.staging.seo.robots),
};
console.log(JSON.stringify({ environment: 'read-only', gate, textDifferences, summaries }, null, 2));
if (Object.values(gate).some((value) => !value)) process.exitCode = 1;
