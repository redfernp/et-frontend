import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseDocument } from 'htmlparser2';
import { render } from 'dom-serializer';
import { previewHtml } from './migration-preview.mjs';
import { legacyColumnistPortraitPaths } from './columnist-profiles.mjs';

export const johnWeek7 = Object.freeze({
  id: 91110,
  slug: 'epl-game-week-7-2026-27-season-premier-league-tips-john-newsome',
  uri: '/epl-game-week-7-2026-27-season-premier-league-tips-john-newsome.html',
  endpoint: 'https://www.everytip.co.uk/wp-json/wp/v2/posts/91110?context=view',
});
const liveOrigin = 'https://www.everytip.co.uk';
const commercialClaim = /\b(?:betfred|bet365|bookmakers?|bookies|betting sites?|free bets?|welcome offers?|promotions?|odds|prices?|claim your|sign[ -]?up|offers?)\b|\b\d+\s*\/\s*\d+\b/i;

const textOf = (node) => node.type === 'text' ? node.data : (node.children ?? []).map(textOf).join('');
const plainText = (html) => parseDocument(html, { decodeEntities: true }).children.map(textOf).join('').replace(/\s+/g, ' ').trim();

export function validateLiveJohnWeek7(post) {
  const content = post?.content?.rendered ?? post?.content;
  const title = post?.title?.rendered ?? post?.title;
  let link;
  try { link = new URL(post?.link); } catch { throw new Error('John Week 7 live URL is invalid'); }
  if (post?.id !== johnWeek7.id || post.slug !== johnWeek7.slug || post.status !== 'publish' ||
      link.origin !== liveOrigin || link.pathname !== johnWeek7.uri || link.search || link.hash ||
      typeof content !== 'string' || content.length < 20000 || typeof title !== 'string' || !plainText(title) ||
      !/^2026-10-13T/.test(post.date ?? '') || !post.modified || post.author !== 3 ||
      /<\s*(?:script|iframe|form)\b|\bfl-builder\b|\btve_[\w-]+\b/i.test(content)) {
    throw new Error('John Week 7 live article identity, date, author or safe-body contract changed');
  }
  return { id: post.id, slug: post.slug, uri: johnWeek7.uri, link: post.link,
    status: post.status, date: post.date, modified: post.modified, author: post.author,
    title: plainText(title), content,
    seo: post.seo ?? (post.yoast_head_json ? {
      title: post.yoast_head_json.title, description: post.yoast_head_json.description,
      robots: post.yoast_head_json.robots,
    } : null) };
}

export async function readLiveJohnWeek7({ fetchImpl = fetch, endpoint = johnWeek7.endpoint } = {}) {
  if (endpoint !== johnWeek7.endpoint) throw new Error('John Week 7 read is restricted to the one live public REST URL');
  const response = await fetchImpl(endpoint, { method: 'GET', signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Live John Week 7 public REST HTTP ${response.status}`);
  return validateLiveJohnWeek7(await response.json());
}

/** Snapshot is a dated local source, never evidence that prices or offers remain current. */
export async function johnWeek7Preview({ snapshotRead = async () => JSON.parse(await readFile(
  resolve(process.cwd(), 'data/raw/live-john-week7-2026-10-13.json'), 'utf8')),
  freshRead = readLiveJohnWeek7 } = {}) {
  if (process.env.MIGRATION_LIVE_JOHN_WEEK7_READ === '1') {
    return { record: validateLiveJohnWeek7(await freshRead()), sourceMode: 'live-public-rest-read-only', capturedAt: new Date().toISOString() };
  }
  const snapshot = await snapshotRead();
  if (snapshot?.source !== johnWeek7.endpoint || !snapshot.capturedAt) throw new Error('Missing dated John Week 7 live snapshot');
  return { record: validateLiveJohnWeek7(snapshot.post), sourceMode: 'dated-live-public-rest-snapshot', capturedAt: snapshot.capturedAt };
}

function containsCommercialLink(node) {
  if (node.name === 'a') {
    let url;
    try { url = new URL(node.attribs?.href ?? '', liveOrigin); } catch { return true; }
    if (url.origin !== liveOrigin || /^\/go\/|\/sign-up-offer(?:\/|$)/i.test(url.pathname) ||
        /\b(?:sponsored|affiliate)\b/i.test(node.attribs?.rel ?? '')) return true;
  }
  return (node.children ?? []).some(containsCommercialLink);
}

/** Keep match analysis; withhold price, bookmaker and offer claims as complete blocks. */
export function previewJohnWeek7Body(record) {
  const source = validateLiveJohnWeek7(record);
  const nodes = parseDocument(source.content, { decodeEntities: true }).children.filter((node) => node.type === 'tag');
  if (nodes.some((node) => !['p', 'h2', 'h3', 'h4', 'blockquote', 'ul', 'ol'].includes(node.name))) {
    throw new Error('John Week 7 body has an unsupported top-level element');
  }
  let withheldBlocks = 0;
  const retained = nodes.filter((node) => {
    const claim = commercialClaim.test(textOf(node)) || containsCommercialLink(node);
    if (claim) withheldBlocks++;
    return !claim;
  });
  const body = previewHtml({ uri: johnWeek7.uri, content: retained.map(render).join('\n') },
    { excludedImagePaths: legacyColumnistPortraitPaths.john });
  const visible = plainText(body);
  if (withheldBlocks < 20 || retained.length < 200 || visible.length < 19000 ||
      commercialClaim.test(visible) || /<a\b|\bhttps?:\/\/[^\s"']*\/go\//i.test(body)) {
    throw new Error('John Week 7 commercial-claim filter or editorial-retention contract failed');
  }
  return { html: body, withheldBlocks, retainedBlocks: retained.length, visibleCharacters: visible.length };
}
