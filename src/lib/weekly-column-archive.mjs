import { parseDocument } from 'htmlparser2';
import { latestContentSnapshot } from './migration-preview.mjs';

const stagingOrigin = 'https://wordpress-159231-2098144.cloudwaysapps.com';
const pageSize = 100;
export const WEEKLY_ARCHIVE_PAGE_SIZE = 20;
export const weeklyColumnFamilies = Object.freeze({
  'saturday-horse-racing-tips': {
    pageId: 23888, columnist: 'Seymour Biz', discipline: 'Horse racing',
    subtitle: 'Seymour Biz’s Weekend Racing Previews',
    intro: 'Browse Seymour’s weekly Saturday racing analysis as dated records. Past selections are not current tips.',
    portrait: 'https://www.everytip.co.uk/wp-content/uploads/2025/06/Seymour-Biz-Horse-Racing-Feature-Writer-100x100.png',
    siblingHref: '/english-premier-league-predictions-for-saturday', siblingLabel: 'John’s football column',
    accent: '#f26800', relatedTopic: 'racing',
    pattern: /-seymour-biz\.html$/,
  },
  'english-premier-league-predictions-for-saturday': {
    pageId: 24016, columnist: 'John Newsome', discipline: 'Football',
    subtitle: 'John Newsome’s Premier League Predictions',
    intro: 'Browse John’s weekly match analysis as dated records. Past scores and prices are not current predictions.',
    portrait: 'https://www.everytip.co.uk/wp-content/uploads/2025/06/John-Newsome-Everytip-Football-Feature-Writer-100x100.png',
    siblingHref: '/saturday-horse-racing-tips', siblingLabel: 'Seymour’s racing column',
    accent: '#256dae', relatedTopic: 'football',
    pattern: /-john-newsome\.html$/,
  },
});

const query = `query EveryTipWeeklyColumnInventory($after: String) {
  posts(first: 100, after: $after, where: { orderby: { field: DATE, order: DESC } }) {
    nodes { databaseId uri slug status title date modified }
    pageInfo { endCursor hasNextPage }
  }
}`;

function titleText(value) {
  const document = parseDocument(value, { decodeEntities: true });
  const text = (node) => node.type === 'text' ? node.data : (node.children ?? []).map(text).join('');
  return document.children.map(text).join('').replace(/\s+/g, ' ').trim();
}

export function weeklyArchivePath(slug, page = 1) {
  if (!weeklyColumnFamilies[slug] || !Number.isInteger(page) || page < 1) throw new Error('Invalid weekly archive path');
  return page === 1 ? `/${slug}` : `/${slug}/page/${page}`;
}

export function selectWeeklyColumnEntries(posts, slug) {
  const family = weeklyColumnFamilies[slug];
  if (!family || !Array.isArray(posts)) throw new Error('Invalid weekly archive family or posts');
  const seenIds = new Set();
  const seenPaths = new Set();
  const entries = [];
  for (const post of posts) {
    if (!family.pattern.test(post?.uri ?? '')) continue;
    const time = Date.parse(post.date ?? '');
    if (!Number.isSafeInteger(post.databaseId) || post.databaseId <= 0 ||
        !/^\/[a-z0-9-]+\.html$/.test(post.uri) || post.slug !== post.uri.slice(1, -5) ||
        post.status !== 'publish' || !Number.isFinite(time) ||
        typeof post.title !== 'string' || !titleText(post.title) ||
        seenIds.has(post.databaseId) || seenPaths.has(post.uri)) {
      throw new Error(`Invalid weekly archive post ${post?.databaseId ?? 'unknown'}`);
    }
    seenIds.add(post.databaseId);
    seenPaths.add(post.uri);
    entries.push({ id: post.databaseId, href: post.uri, title: titleText(post.title), date: post.date.slice(0, 10),
      dateLabel: post.date.slice(0, 10), excerpt: 'Historical column · Past selections and prices are not current advice.' });
  }
  entries.sort((a, b) => b.date.localeCompare(a.date) || b.id - a.id);
  if (!entries.length) throw new Error(`No weekly archive posts for ${slug}`);
  return entries;
}

/** Complete read-only published-post inventory from the exact staging GraphQL host. */
export async function readStagingWeeklyColumnPosts({ endpoint = `${stagingOrigin}/graphql`, fetchImpl = fetch } = {}) {
  const url = new URL(endpoint);
  if (url.origin !== stagingOrigin || url.pathname !== '/graphql' || url.search || url.hash || url.username || url.password) {
    throw new Error('Weekly archive read is restricted to EveryTip staging WPGraphQL');
  }
  const posts = [];
  const seenIds = new Set();
  let after = null;
  for (let page = 0; page < 20; page++) {
    const response = await fetchImpl(url, { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, variables: { after } }), signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Weekly archive WPGraphQL HTTP ${response.status}`);
    const payload = await response.json();
    if (payload?.errors?.length) throw new Error(`Weekly archive WPGraphQL error: ${payload.errors.map(({ message }) => message).join('; ')}`);
    const connection = payload?.data?.posts;
    const info = connection?.pageInfo;
    if (!Array.isArray(connection?.nodes) || connection.nodes.length > pageSize ||
        typeof info?.hasNextPage !== 'boolean' ||
        (info.hasNextPage && (!info.endCursor || info.endCursor === after || connection.nodes.length === 0))) {
      throw new Error('Incomplete weekly archive WPGraphQL connection');
    }
    for (const post of connection.nodes) {
      if (!Number.isSafeInteger(post?.databaseId) || seenIds.has(post.databaseId)) throw new Error('Duplicate/invalid weekly archive post ID');
      seenIds.add(post.databaseId);
      posts.push(post);
    }
    if (!info.hasNextPage) return posts;
    after = info.endCursor;
  }
  throw new Error('Weekly archive inventory exceeded 20 GraphQL pages');
}

/** Snapshot route registry remains authoritative until a full new-content build. */
let buildInventoryPromise;
export async function weeklyColumnArchivePreview(slug, {
  snapshotRead = latestContentSnapshot, freshRead = readStagingWeeklyColumnPosts,
} = {}) {
  const family = weeklyColumnFamilies[slug];
  if (!family) throw new Error(`Unknown weekly column: ${slug}`);
  const snapshot = await snapshotRead();
  const page = snapshot?.pages?.find((item) => item.uri === `/${slug}`);
  if (!snapshot?.generatedAt || page?.databaseId !== family.pageId || !page.title?.trim() || !Array.isArray(snapshot.posts)) {
    throw new Error(`Missing dated weekly archive source: ${slug}`);
  }
  const datedPosts = snapshot.posts.map((post) => ({ ...post, status: 'publish' }));
  const datedEntries = selectWeeklyColumnEntries(datedPosts, slug);
  let entries = datedEntries;
  let sourceMode = 'dated-snapshot-preview';
  let capturedAt = snapshot.generatedAt;
  if (process.env.MIGRATION_STAGING_WEEKLY_ARCHIVE_READ === '1') {
  // All archive pages in one static build must share the same inventory and
  // must not repeat the full WordPress pagination for every numbered route.
  const freshPosts = await (freshRead === readStagingWeeklyColumnPosts
    ? (buildInventoryPromise ??= freshRead()) : freshRead());
  entries = selectWeeklyColumnEntries(freshPosts, slug);
  const known = new Map(datedEntries.map((entry) => [entry.id, entry.href]));
  if (entries.length !== known.size || entries.some((entry) => known.get(entry.id) !== entry.href)) {
    throw new Error(`Fresh weekly archive route registry changed for ${slug}; refresh exact article routes before building`);
  }
  sourceMode = 'fresh-staging-wpgraphql-preview';
  capturedAt = new Date().toISOString();
  }
  return { slug, page, family, entries, sourceMode, capturedAt };
}

export function archivePageEntries(archive, page) {
  const totalPages = Math.ceil(archive.entries.length / WEEKLY_ARCHIVE_PAGE_SIZE);
  if (!Number.isInteger(page) || page < 1 || page > totalPages) throw new Error(`Weekly archive page out of range: ${page}`);
  return { ...archive, pageNumber: page, totalPages,
    entriesOnPage: archive.entries.slice((page - 1) * WEEKLY_ARCHIVE_PAGE_SIZE, page * WEEKLY_ARCHIVE_PAGE_SIZE) };
}
