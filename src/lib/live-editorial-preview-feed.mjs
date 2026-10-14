// Explicit local-preview-only feed from four independently validated October columns.
// Not a live tips, prices, offer-news or affiliate feed.
import { parseDocument } from 'htmlparser2';
import { assessFeedFreshness } from './feed-freshness.mjs';
import { sourceLockedOctoberOverlayPosts } from './weekly-column-archive.mjs';
import { johnWeek7, readLiveJohnWeek7 } from './live-john-week7.mjs';
import { johnWeek6, readLiveJohnWeek6 } from './live-john-week6.mjs';
import { seymourOct10, readLiveSeymourOct10 } from './live-seymour-oct10.mjs';
import { seymourOct3, readLiveSeymourOct3 } from './live-seymour-oct3.mjs';

const specs = [johnWeek7, johnWeek6, seymourOct10, seymourOct3];
const text = (node) => node.type === 'text' ? node.data : (node.children ?? []).map(text).join('');
const plain = (value) => parseDocument(value, { decodeEntities: true }).children.map(text).join('')
  .replace(/\s+/g, ' ').trim();
export const liveEditorialFeedEnabled = () => process.env.MIGRATION_LIVE_EDITORIAL_FEED_READ === '1';

export function selectLiveEditorialPreviewFeed(posts, capturedAt = new Date().toISOString()) {
  if (!Array.isArray(posts) || posts.length !== specs.length || !Number.isFinite(Date.parse(capturedAt))) {
    throw new Error('Live editorial feed requires four dated exact sources');
  }
  const items = posts.map((post, index) => {
    const spec = specs[index];
    const date = post?.date?.slice(0, 10);
    const title = typeof post?.title === 'string' ? plain(post.title) : '';
    if (post?.databaseId !== spec.id || post.uri !== spec.uri || post.slug !== spec.slug ||
        post.status !== 'publish' || !/^2026-10-\d\d$/.test(date ?? '') || !title ||
        /\b(?:free bets?|sign[ -]?up|bonus|welcome offer|promotion)\b/i.test(title)) {
      throw new Error(`Live editorial feed source identity or title changed: ${spec.id}`);
    }
    const day = new Date(`${date}T00:00:00Z`);
    if (!Number.isFinite(day.getTime()) || day.toISOString().slice(0, 10) !== date) {
      throw new Error(`Live editorial feed date invalid: ${spec.id}`);
    }
    return { id: spec.id, href: spec.uri, title, date,
      dateLabel: `${day.getUTCDate()} ${new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' }).format(day)}`,
      type: spec.uri.endsWith('-john-newsome.html') ? 'Football' : 'Horse racing',
      description: `Published ${date} · Historical column preview; past selections are not current advice.` };
  }).sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  return { items, cards: items.map(({ id, href, title, date, type, description }) =>
    ({ id, uri: href, title, date, type, description })),
  freshness: assessFeedFreshness(items[0].date, { maxAgeDays: 7 }),
  sourceMode: 'live-public-rest-columnist-review', capturedAt };
}

const freshOctoberOverlay = () => sourceLockedOctoberOverlayPosts({
  johnRead: async () => ({ record: await readLiveJohnWeek7() }),
  johnWeek6Read: readLiveJohnWeek6,
  seymourRead: async () => ({ record: await readLiveSeymourOct10() }),
  seymourOct3Read: async () => ({ record: await readLiveSeymourOct3() }),
});

export async function readLiveEditorialPreviewFeed({ overlayRead = freshOctoberOverlay } = {}) {
  if (process.env.MIGRATION_EXACT_PREVIEW !== '1' || !liveEditorialFeedEnabled()) {
    throw new Error('Live editorial feed requires explicit local exact-preview flags');
  }
  // The overlay reader checks exact Astro route files and conservatively filters each
  // article body before returning metadata. Any drift stops this opt-in build.
  const posts = await overlayRead();
  return selectLiveEditorialPreviewFeed(posts);
}
