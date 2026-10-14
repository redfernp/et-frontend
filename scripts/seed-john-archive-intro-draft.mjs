// Staging-only evergreen intro pilot for the John Newsome archive. Never
// edits the published hub or copies its dated article list/Thrive pagination.
import { mkdir, writeFile } from 'node:fs/promises';
import { parseDocument, DomUtils } from 'htmlparser2';
import render from 'dom-serializer';

const apply = process.argv[2] === '--apply';
if (process.argv.length > 3 || (process.argv[2] && !apply)) {
  throw new Error('Usage: seed-john-archive-intro-draft.mjs [--apply]');
}
const site = new URL(process.env.EVERYTIP_WP_BASE_URL ?? '');
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') {
  throw new Error('Named EveryTip staging host only');
}
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!username || !password) throw new Error('Missing staging REST credentials');
const headers = { Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}` };
const json = async (url, options = {}) => {
  const response = await fetch(url, {
    ...options, headers: { ...headers, ...options.headers }, signal: AbortSignal.timeout(45000),
  });
  if (!response.ok) throw new Error(`${options.method ?? 'GET'} ${url}: HTTP ${response.status}`);
  return response.json();
};
const sourceUrl = new URL('/wp-json/wp/v2/pages/24016?context=edit', site);
const liveUrl = new URL('/wp-json/wp/v2/pages/24016', 'https://www.everytip.co.uk');
const [source, live] = await Promise.all([
  json(sourceUrl),
  fetch(liveUrl, { signal: AbortSignal.timeout(45000) }).then(async (response) => {
    if (!response.ok) throw new Error(`Live public read HTTP ${response.status}`);
    return response.json();
  }),
]);
if (source.id !== 24016 || source.slug !== 'english-premier-league-predictions-for-saturday' ||
    source.status !== 'publish' || source.modified !== '2026-09-25T15:30:46' ||
    live.id !== source.id || live.slug !== source.slug || live.status !== 'publish' ||
    live.modified !== source.modified) {
  throw new Error('John archive identity or current source changed; refusing pilot');
}
const text = (node) => DomUtils.textContent(node).replace(/\s+/g, ' ').trim();
const typographyEquivalent = (value) => value.replace(/[‘’′]/g, "'").replace(/[“”]/g, '"');
const sourceDocument = parseDocument(source.content.raw, { decodeEntities: true });
const sourceTop = sourceDocument.children.filter((node) => node.type === 'tag');
const liveDocument = parseDocument(live.content.rendered, { decodeEntities: true });
const liveTop = liveDocument.children.filter((node) => node.type === 'tag');
const sourceIntro = [sourceTop[2], sourceTop[3]];
const liveIntro = [liveTop[2], liveTop[3]];
const expectedTags = ['h2', 'p'];
if (sourceTop[0]?.name !== 'h1' || sourceTop[1]?.name !== 'span' ||
    sourceIntro.some((node, index) => node?.name !== expectedTags[index]) ||
    liveIntro.some((node, index) => node?.name !== expectedTags[index]) ||
    sourceIntro.some((node, index) => typographyEquivalent(text(node)) !== typographyEquivalent(text(liveIntro[index])))) {
  throw new Error('Evergreen introduction no longer occupies the expected safe source nodes');
}
const childTags = sourceIntro.flatMap((node) => DomUtils.findAll((child) => child.type === 'tag', [node]).map((child) => child.name));
if (childTags.some((tag) => !['h2', 'p', 'strong'].includes(tag)) ||
    sourceIntro.some((node) => /\[(?:tcb_|ninja_|et_)/i.test(render(node)) || /\bfl-builder\b|\/go\//i.test(render(node)))) {
  throw new Error('Intro contains active, commercial or unsupported markup');
}
const inner = (node) => render(node.children, { encodeEntities: 'utf8' });
const content = [
  `<!-- wp:heading {"level":2} -->\n<h2 class="wp-block-heading">${inner(sourceIntro[0])}</h2>\n<!-- /wp:heading -->`,
  `<!-- wp:paragraph -->\n<p>${inner(sourceIntro[1])}</p>\n<!-- /wp:paragraph -->`,
].join('\n\n');
const draftSlug = 'staging-john-newsome-archive-evergreen-intro-2026-10-13';
const draftTitle = 'STAGING ONLY — John Newsome archive evergreen intro';
const matchesUrl = new URL('/wp-json/wp/v2/pages', site);
matchesUrl.search = new URLSearchParams({ slug: draftSlug, context: 'edit', status: 'draft', per_page: '10' }).toString();
const matches = await json(matchesUrl);
if (matches.length) throw new Error('Named pilot draft already exists; refusing duplicate or overwrite');
const checks = {
  blocks: (content.match(/<!-- wp:/g) ?? []).length === 2,
  visibleText: (() => {
    const document = parseDocument(content, { decodeEntities: true });
    const parts = document.children.filter((node) => node.type === 'tag');
    return parts.length === 2 && parts.every((node, index) => text(node) === text(sourceIntro[index]));
  })(),
  noDatedPostsOrShortcodes: !/\[tcb_|<a\b|<img\b|\bfl-builder\b|\/go\//i.test(content),
};
console.log(JSON.stringify({ environment: 'staging', mode: apply ? 'apply' : 'dry-run',
  sourceId: source.id, sourceModified: source.modified, draftSlug, checks,
  heading: text(sourceIntro[0]), paragraphLength: text(sourceIntro[1]).length }, null, 2));
if (Object.values(checks).some((pass) => !pass)) throw new Error('Safe intro extraction failed');
if (apply) {
  const reread = await json(sourceUrl);
  if (reread.modified !== source.modified || reread.content?.raw !== source.content.raw) {
    throw new Error('Published source changed immediately before draft creation');
  }
  const directory = new URL('../data/raw/', import.meta.url);
  await mkdir(directory, { recursive: true });
  const stamp = new Date().toISOString().replaceAll(':', '-');
  const backup = new URL(`wp-john-archive-source-24016-before-intro-draft-${stamp}.json`, directory);
  await writeFile(backup, JSON.stringify({ capturedAt: new Date().toISOString(),
    source: { id: source.id, slug: source.slug, status: source.status, modified: source.modified,
      title: source.title?.raw, contentRaw: source.content.raw, contentRendered: source.content.rendered,
      seo: source.yoast_head_json, author: source.author, date: source.date },
    introContent: content,
  }, null, 2), { flag: 'wx' });
  const created = await json(new URL('/wp-json/wp/v2/pages', site), {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title: draftTitle, slug: draftSlug, status: 'draft', content,
      excerpt: 'Staging-only evergreen introduction; dated posts and pagination remain outside this draft.' }),
  });
  const [after, sourceAfter] = await Promise.all([
    json(new URL(`/wp-json/wp/v2/pages/${created.id}?context=edit`, site)), json(sourceUrl),
  ]);
  const renderedNodes = parseDocument(after.content?.rendered ?? '', { decodeEntities: true })
    .children.filter((node) => node.type === 'tag');
  const verified = {
    draftIdentity: after.id === created.id && after.slug === draftSlug && after.status === 'draft' &&
      after.title?.raw === draftTitle,
    rawBlocks: after.content?.raw === content,
    renderedIntro: renderedNodes.length === 2 && renderedNodes.every((node, index) =>
      node.name === expectedTags[index] && typographyEquivalent(text(node)) === typographyEquivalent(text(sourceIntro[index]))),
    originalUnchanged: sourceAfter.id === source.id && sourceAfter.modified === source.modified &&
      sourceAfter.content?.raw === source.content.raw && sourceAfter.status === source.status,
  };
  console.log(JSON.stringify({ environment: 'staging', draftId: after.id, status: after.status,
    verified, backup: backup.pathname }, null, 2));
  if (Object.values(verified).some((pass) => !pass)) process.exitCode = 1;
}
