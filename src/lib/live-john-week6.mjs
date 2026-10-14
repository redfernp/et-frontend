import { createHash } from 'node:crypto';
import { parseDocument } from 'htmlparser2';
import { render } from 'dom-serializer';
import { previewHtml } from './migration-preview.mjs';
import { legacyColumnistPortraitPaths } from './columnist-profiles.mjs';

export const johnWeek6 = Object.freeze({
  id: 90942,
  slug: 'epl-game-week-6-2026-27-season-premier-league-tips-john-newsome',
  uri: '/epl-game-week-6-2026-27-season-premier-league-tips-john-newsome.html',
  endpoint: 'https://www.everytip.co.uk/wp-json/wp/v2/posts/90942?context=view',
  sourceModified: '2026-10-05T18:29:41',
  contentSha256: '56698fa2903e51a6cfb8786f1a8710ed4cab4045c4e551dc34ebaa955ec0c544',
  titleSha256: '48e2376539f31e21ca8d9c40a1e1c54a98e14eb1002a30a04b94c231948aab97',
});
const liveOrigin = 'https://www.everytip.co.uk';
const commercialClaim = /\b(?:betfred|bet365|bookmakers?|bookies|betting sites?|free bets?|welcome offers?|promotions?|odds|prices?|claim your|sign[ -]?up|offers?)\b|\b\d+\s*\/\s*\d+\b/i;
const digest = (value) => createHash('sha256').update(value).digest('hex');
const textOf = (node) => node.type === 'text' ? node.data : (node.children ?? []).map(textOf).join('');
const plainText = (html) => parseDocument(html, { decodeEntities: true }).children.map(textOf).join('').replace(/\s+/g, ' ').trim();

export function validateLiveJohnWeek6(post) {
  const content = post?.content?.rendered ?? post?.content;
  const title = post?.rawTitle ?? post?.title?.rendered ?? post?.title;
  let link;
  try { link = new URL(post?.link); } catch { throw new Error('John Week 6 live URL is invalid'); }
  if (post?.id !== johnWeek6.id || post.slug !== johnWeek6.slug || post.status !== 'publish' ||
      link.origin !== liveOrigin || link.pathname !== johnWeek6.uri || link.search || link.hash ||
      typeof content !== 'string' || content.length < 30000 ||
      typeof title !== 'string' || !plainText(title) ||
      post.date !== '2026-10-05T18:21:54' || post.modified !== johnWeek6.sourceModified || post.author !== 5 ||
      digest(content) !== johnWeek6.contentSha256 || digest(title) !== johnWeek6.titleSha256 ||
      /<\s*(?:script|iframe|form)\b|\bfl-builder\b|\btve_[\w-]+\b/i.test(content)) {
    throw new Error('John Week 6 exact live article source lock changed');
  }
  return { id: post.id, slug: post.slug, uri: johnWeek6.uri, link: post.link, status: post.status,
    date: post.date, modified: post.modified, author: post.author,
    title: plainText(title), rawTitle: title, content };
}

export async function readLiveJohnWeek6({ fetchImpl = fetch, endpoint = johnWeek6.endpoint } = {}) {
  if (endpoint !== johnWeek6.endpoint) throw new Error('John Week 6 read is restricted to the exact public REST URL');
  const response = await fetchImpl(endpoint, { method: 'GET', signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Live John Week 6 public REST HTTP ${response.status}`);
  return validateLiveJohnWeek6(await response.json());
}

function hasCommercialLink(node) {
  if (node.name === 'a') {
    let url;
    try { url = new URL(node.attribs?.href ?? '', liveOrigin); } catch { return true; }
    if (url.origin !== liveOrigin || /^\/go\/|\/sign-up-offer(?:\/|$)/i.test(url.pathname) ||
        /\b(?:sponsored|affiliate)\b/i.test(node.attribs?.rel ?? '')) return true;
  }
  return (node.children ?? []).some(hasCommercialLink);
}

/** Preserve dated match analysis only; omit whole blocks with odds, brands or outbound links. */
export function previewJohnWeek6Body(record) {
  const source = validateLiveJohnWeek6(record);
  const nodes = parseDocument(source.content, { decodeEntities: true }).children.filter((node) => node.type === 'tag');
  if (nodes.some((node) => !['p', 'h2', 'h3', 'h4', 'blockquote', 'ul', 'ol'].includes(node.name))) {
    throw new Error('John Week 6 body has an unsupported top-level element');
  }
  let withheldBlocks = 0;
  const retained = nodes.filter((node) => {
    const withheld = commercialClaim.test(textOf(node)) || hasCommercialLink(node);
    if (withheld) withheldBlocks++;
    return !withheld;
  });
  const html = previewHtml({ uri: johnWeek6.uri, content: retained.map(render).join('\n') },
    { excludedImagePaths: legacyColumnistPortraitPaths.john });
  const visible = plainText(html);
  if (withheldBlocks < 15 || retained.length < 170 || visible.length < 16000 ||
      commercialClaim.test(visible) || /<a\b|\bhttps?:\/\/[^\s"']*\/go\//i.test(html)) {
    throw new Error('John Week 6 commercial filter or editorial-retention contract failed');
  }
  return { html, withheldBlocks, retainedBlocks: retained.length, visibleCharacters: visible.length };
}
