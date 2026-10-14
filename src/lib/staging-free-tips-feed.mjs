// Read-only, explicitly opted-in article feed for the free-tips preview.
// This never approves commercial links or changes the page's noindex status.
import { parseDocument } from 'htmlparser2';
import { assessFeedFreshness } from './feed-freshness.mjs';

const stagingOrigin = 'https://wordpress-159231-2098144.cloudwaysapps.com';
const count = 5;

export const freeTipsFeedQuery = `query EveryTipFreeTipsLatestPosts {
  posts(first: ${count}, where: { orderby: { field: DATE, order: DESC } }) {
    nodes { databaseId uri status title date }
  }
}`;

const plainText = (html) => {
  const read = (node) => node.type === 'text' ? node.data : (node.children ?? []).map(read).join('');
  return read(parseDocument(html, { decodeEntities: true })).replace(/\s+/g, ' ').trim();
};

function exactInternalUri(uri) {
  if (typeof uri !== 'string' || !uri.startsWith('/') || uri.startsWith('//') ||
      uri.includes('?') || uri.includes('#') || uri.includes('\\') || uri.includes('..') ||
      /[\u0000-\u001f]/.test(uri) || /^\/(?:go|wp-admin|pilot)(?:\/|$)/i.test(uri)) return false;
  const parsed = new URL(uri, 'https://www.everytip.co.uk');
  return parsed.origin === 'https://www.everytip.co.uk' && parsed.pathname === uri;
}

export function validateFreeTipsFeed(payload) {
  if (payload?.errors?.length) throw new Error(`Free tips WPGraphQL error: ${payload.errors.map(({ message }) => message).join('; ')}`);
  const nodes = payload?.data?.posts?.nodes;
  if (!Array.isArray(nodes) || nodes.length !== count) throw new Error(`Free tips feed requires exactly ${count} published posts`);
  const ids = new Set();
  const paths = new Set();
  const items = nodes.map((post) => {
    const title = typeof post?.title === 'string' ? plainText(post.title) : '';
    const day = typeof post?.date === 'string' ? post.date.slice(0, 10) : '';
    if (!Number.isInteger(post?.databaseId) || post.databaseId <= 0 || post.status !== 'publish' ||
        !exactInternalUri(post.uri) || !title || !/^\d{4}-\d{2}-\d{2}$/.test(day) ||
        Number.isNaN(Date.parse(`${day}T00:00:00Z`)) || ids.has(post.databaseId) || paths.has(post.uri)) {
      throw new Error('Free tips feed identity, publication or exact-path contract mismatch');
    }
    ids.add(post.databaseId);
    paths.add(post.uri);
    const [year, month, date] = day.split('-').map(Number);
    const parsedDate = new Date(Date.UTC(year, month - 1, date));
    if (parsedDate.toISOString().slice(0, 10) !== day) throw new Error('Free tips feed contains an invalid publication date');
    const label = `${date} ${new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' }).format(parsedDate)}`;
    return { id: post.databaseId, href: post.uri, title, date: day, dateLabel: label };
  });
  return { items, freshness: assessFeedFreshness(items[0].date, { maxAgeDays: 2 }),
    sourceMode: 'fresh-staging-wpgraphql-preview' };
}

export async function readStagingFreeTipsFeed({ fetchImpl = fetch, endpoint = `${stagingOrigin}/graphql` } = {}) {
  const url = new URL(endpoint);
  if (url.origin !== stagingOrigin || url.pathname !== '/graphql' || url.search || url.hash || url.username || url.password) {
    throw new Error('Free tips feed read is restricted to EveryTip staging WPGraphQL');
  }
  const response = await fetchImpl(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: freeTipsFeedQuery }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Free tips WPGraphQL HTTP ${response.status}`);
  return validateFreeTipsFeed(await response.json());
}

export async function freeTipsFeedPreview({ enabled = process.env.MIGRATION_STAGING_FREE_TIPS_FEED_READ === '1',
  freshRead = readStagingFreeTipsFeed } = {}) {
  if (!enabled) return null;
  // An opted-in failure must stop the build; dated fixtures must not masquerade
  // as fresh editorial content when staging is unavailable.
  return freshRead();
}
export const stagingFreeTipsFeedEnabled = () => process.env.MIGRATION_STAGING_FREE_TIPS_FEED_READ === '1';
