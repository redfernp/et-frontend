import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { parseDocument } from 'htmlparser2';
import { render } from 'dom-serializer';
import { previewHtml } from './migration-preview.mjs';
import { legacyColumnistPortraitPaths } from './columnist-profiles.mjs';

export const seymourOct10 = Object.freeze({
  id: 90999,
  slug: 'saturdays-horse-racing-preview-tips-10th-october-2026-seymour-biz',
  uri: '/saturdays-horse-racing-preview-tips-10th-october-2026-seymour-biz.html',
  endpoint: 'https://www.everytip.co.uk/wp-json/wp/v2/posts/90999?context=view',
});
const liveOrigin = 'https://www.everytip.co.uk';
const offerClaim = /\b(?:bet\s+this|sign[ -]?up|claim\s+your|free\s+bets?|bonus(?:es)?|welcome\s+offers?|promo(?:tion)?s?|\d+\s*\/\s*\d+|\d+\s*to\s*\d+)\b/i;
const textOf = (node) => node.type === 'text' ? node.data : (node.children ?? []).map(textOf).join('');
const plainText = (html) => parseDocument(html, { decodeEntities: true }).children.map(textOf).join('').replace(/\s+/g, ' ').trim();

export function validateLiveSeymourOct10(post) {
  const content = post?.content?.rendered ?? post?.content;
  const title = post?.title?.rendered ?? post?.title;
  let link;
  try { link = new URL(post?.link); } catch { throw new Error('Seymour 10 October live URL is invalid'); }
  if (post?.id !== seymourOct10.id || post.slug !== seymourOct10.slug || post.status !== 'publish' ||
      link.origin !== liveOrigin || link.pathname !== seymourOct10.uri || link.search || link.hash ||
      typeof content !== 'string' || content.length < 7000 || typeof title !== 'string' || !plainText(title) ||
      !/^2026-10-08T/.test(post.date ?? '') || !post.modified || post.author !== 7 ||
      /<\s*(?:script|iframe|form)\b|\bfl-builder\b|\btve_[\w-]+\b/i.test(content)) {
    throw new Error('Seymour 10 October live article identity, date, author or safe-body contract changed');
  }
  return { id: post.id, slug: post.slug, uri: seymourOct10.uri, link: post.link,
    status: post.status, date: post.date, modified: post.modified, author: post.author,
    title: plainText(title), content,
    seo: post.seo ?? (post.yoast_head_json ? {
      title: post.yoast_head_json.title, description: post.yoast_head_json.description,
      robots: post.yoast_head_json.robots,
    } : null) };
}

export async function readLiveSeymourOct10({ fetchImpl = fetch, endpoint = seymourOct10.endpoint } = {}) {
  if (endpoint !== seymourOct10.endpoint) throw new Error('Seymour 10 October read is restricted to the one live public REST URL');
  const response = await fetchImpl(endpoint, { method: 'GET', signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Live Seymour 10 October public REST HTTP ${response.status}`);
  return validateLiveSeymourOct10(await response.json());
}

/** A dated local source is not evidence that selections, prices or offers remain current. */
export async function seymourOct10Preview({ snapshotRead = async () => JSON.parse(await readFile(
  resolve(process.cwd(), 'data/raw/live-seymour-oct10-2026-10-13.json'), 'utf8')),
  freshRead = readLiveSeymourOct10 } = {}) {
  if (process.env.MIGRATION_LIVE_SEYMOUR_OCT10_READ === '1') {
    return { record: validateLiveSeymourOct10(await freshRead()), sourceMode: 'live-public-rest-read-only', capturedAt: new Date().toISOString() };
  }
  const snapshot = await snapshotRead();
  if (snapshot?.source !== seymourOct10.endpoint || !snapshot.capturedAt) throw new Error('Missing dated Seymour 10 October live snapshot');
  return { record: validateLiveSeymourOct10(snapshot.post), sourceMode: 'dated-live-public-rest-snapshot', capturedAt: snapshot.capturedAt };
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

/** Keep the dated race analysis but withhold complete offer/odds and outbound commercial blocks. */
export function previewSeymourOct10Body(record) {
  const source = validateLiveSeymourOct10(record);
  const nodes = parseDocument(source.content, { decodeEntities: true }).children.filter((node) => node.type === 'tag');
  if (nodes.some((node) => !['p', 'h2', 'h3', 'h4', 'blockquote', 'ul', 'ol'].includes(node.name))) {
    throw new Error('Seymour 10 October body has an unsupported top-level element');
  }
  let withheldBlocks = 0;
  const retained = nodes.filter((node) => {
    const claim = offerClaim.test(textOf(node)) || containsCommercialLink(node);
    if (claim) withheldBlocks++;
    return !claim;
  });
  const body = previewHtml({ uri: seymourOct10.uri, content: retained.map(render).join('\n') },
    { excludedImagePaths: legacyColumnistPortraitPaths.seymour });
  const visible = plainText(body);
  if (withheldBlocks < 2 || retained.length < 25 || visible.length < 4500 ||
      offerClaim.test(visible) || /<a\b|\bhttps?:\/\/[^\s"']*\/go\//i.test(body)) {
    throw new Error('Seymour 10 October commercial-claim filter or editorial-retention contract failed');
  }
  return { html: body, withheldBlocks, retainedBlocks: retained.length, visibleCharacters: visible.length };
}
