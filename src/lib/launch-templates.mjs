import { parseDocument } from 'htmlparser2';
import { render } from 'dom-serializer';
import sanitizeHtml from 'sanitize-html';
import { columnistKeyForUri, getColumnistProfiles, offlinePreviewProfiles } from './columnist-profiles.mjs';

const textOf = (node) => node.type === 'text' ? node.data : (node.children ?? []).map(textOf).join('');
const plain = (html) => textOf(parseDocument(html ?? '', { decodeEntities: true })).replace(/\s+/g, ' ').trim();

// The homepage intro copy sits between two known WordPress headings. Links stay live.
export function homeEditorialHtml(record) {
  const nodes = parseDocument(record?.content ?? '', { decodeEntities: true }).children.filter((node) => node.type === 'tag');
  const start = nodes.findIndex((node) => node.name === 'h2' && /^Free Betting Tips Published Every Day/i.test(textOf(node).trim()));
  if (start < 0) return null;
  const end = nodes.findIndex((node, index) => index > start && node.name === 'h2');
  const html = sanitizeHtml(nodes.slice(start + 1, end < 0 ? undefined : end).filter((node) => node.name === 'p').map(render).join(''), {
    allowedTags: ['p', 'strong', 'em', 'b', 'i', 'br', 'a'],
    allowedAttributes: { a: ['href', 'rel'] },
  }).trim();
  return html || null;
}

// Newest four John Newsome and Seymour Biz columns for the homepage cards.
export function columnistCards(records) {
  return records.filter((record) => record.kind === 'posts' && columnistKeyForUri(record.uri))
    .sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4)
    .map((record) => ({ uri: record.uri, title: plain(record.title), date: record.date.slice(0, 10),
      type: columnistKeyForUri(record.uri) === 'john' ? 'Football' : 'Horse racing' }));
}

let profiles;
// One WordPress read per build; fall back to the stored author boxes if staging is slow.
export function launchColumnists() {
  return profiles ??= getColumnistProfiles().catch((error) => {
    console.warn(`Columnist profiles unavailable, using stored copy: ${error.message}`);
    return offlinePreviewProfiles;
  });
}

export const columnistArchives = {
  john: '/english-premier-league-predictions-for-saturday',
  seymour: '/saturday-horse-racing-tips',
};

// Category label and breadcrumb for the article header.
export function articleCategory(record) {
  const columnist = columnistKeyForUri(record.uri);
  if (columnist === 'john') return { label: 'John Newsome · Football', href: columnistArchives.john };
  if (columnist === 'seymour') return { label: 'Seymour Biz · Horse racing', href: columnistArchives.seymour };
  if (isGuide(record)) return { label: 'Betting guides', href: '/betting-guides' };
  if (record.kind === 'posts') return { label: 'Free betting tips', href: '/free-betting-tips' };
  return null;
}

export const plainTitle = plain;

// WordPress HTML from the first <h2> matching `heading` to the end. Designed hubs replace
// the flattened legacy layout above it with their own header and directory.
export function contentFromHeading(html, heading) {
  const matches = [...(html ?? '').matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)];
  const match = matches.find((m) => heading.test(plain(m[1])));
  return match ? html.slice(match.index) : html;
}

// Newest published posts for hub news lists.
export function latestPosts(records, count = 5) {
  return records.filter((record) => record.kind === 'posts').sort((a, b) => b.date.localeCompare(a.date)).slice(0, count)
    .map((record) => ({ uri: record.uri, title: plain(record.title), date: record.date.slice(0, 10) }));
}

// Newest posts in the Offer News category (from its archive record), for the daily offers grid.
export function latestOfferNews(records, count = 4) {
  const uris = new Set(records.filter((item) => item.kind === 'archive' && /\/offer-news$/.test(item.archiveBase ?? item.uri)).flatMap((item) => item.posts.map((post) => post.uri)));
  const byUri = new Map(records.map((record) => [record.uri, record]));
  // A one-line summary from the article's opening text, as on the live Offer News list.
  const summary = (html) => { const text = plain((html ?? '').replace(/<(table|figure|aside)[\s\S]*?<\/\1>/g, ' ')); return text.length > 150 ? `${text.slice(0, 150).replace(/\s+\S*$/, '')}…` : text; };
  return latestPosts(records.filter((item) => uris.has(item.uri)), count).map((post) => ({ ...post, summary: summary(byUri.get(post.uri)?.content) }));
}

// WordPress HTML before the first <h2> matching `heading` (for example the trailing offer list).
export function contentBeforeHeading(html, heading) {
  const matches = [...(html ?? '').matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)];
  const match = matches.find((m) => heading.test(plain(m[1])));
  return match ? html.slice(0, match.index) : html;
}

// Roundups and how-to guides use the approved roundup guide header.
export function isGuide(record) {
  if (record.kind === 'pages') return /^\/(best-|high-stakes-)/.test(record.uri);
  return record.kind === 'posts' && /^\/(best-(?!backed-horses)|online-bookmakers-|low-or-no-|how-to-|bookmakers-|which-bookies-)/.test(record.uri);
}

// Give each <h2> an id and return a short table of contents.
export function withHeadingIds(html, limit = 7) {
  const toc = [];
  const used = new Set();
  const out = (html ?? '').replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/g, (whole, attrs, inner) => {
    const label = plain(inner);
    if (!label) return whole;
    let id = (attrs.match(/\sid="([^"]+)"/) ?? [])[1];
    if (!id) {
      const base = label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'section';
      id = base; for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
      attrs = `${attrs} id="${id}"`;
    }
    used.add(id);
    if (toc.length < limit) toc.push({ href: `#${id}`, label });
    return `<h2${attrs}>${inner}</h2>`;
  });
  return { html: out, toc };
}

let menu;
// The WordPress primary menu, read once per build; the stored fallback covers a slow staging read.
export function launchMenuItems() {
  return menu ??= import('./wordpress-menu.ts').then((m) => m.getWordPressMenu('PRIMARY')).then((result) => result.items)
    .catch(async (error) => {
      console.warn(`WordPress menu unavailable, using fallback: ${error.message}`);
      return (await import('./menu-tree.ts')).publicMenuFallback;
    });
}

const publicOrigin = 'https://www.everytip.co.uk';
// Yoast's canonical on the public host; a page without one is self-canonical.
export function canonicalFor(record) {
  const source = record.seo?.canonical;
  if (!source) return `${publicOrigin}${record.uri}`;
  try {
    const url = new URL(source, publicOrigin);
    return `${publicOrigin}${url.pathname}${url.search}`;
  } catch { return `${publicOrigin}${record.uri}`; }
}

// WordPress (staging or the origin) writes its own host into schema and author links; the public
// site is www.everytip.co.uk. Any http(s) host ending in cloudwaysapps.com or naming the origin is swapped.
const toPublic = (value) => value.replace(/https?:\\?\/\\?\/(?:wordpress-[\w-]+\.cloudwaysapps\.com|origin\.everytip\.co\.uk)/g, (match) => match.includes('\\/') ? 'https:\\/\\/www.everytip.co.uk' : publicOrigin);

// Yoast's JSON-LD graph (Article, Person, Organization, breadcrumbs), ready for a script tag.
export function schemaFor(record) {
  const raw = record.seo?.schema?.raw;
  if (!raw) return null;
  try { JSON.parse(raw); } catch { return null; }
  return toPublic(raw).replace(/<\/script/gi, '<\\/script');
}

// The post author for the byline and author box (live site shows the same box).
export function authorFor(record) {
  const author = record.author?.node;
  if (!author?.name) return null;
  return { name: author.name, description: author.description ?? '', href: author.uri ?? null, avatar: author.avatar?.url ? toPublic(author.avatar.url) : null };
}

// Links listed under a homepage heading (for example "Latest Bookmaker Reviews"), up to the next heading.
export function linksUnderHeading(html, heading) {
  const doc = parseDocument(html ?? '', { decodeEntities: true });
  const links = [];
  let inside = false;
  const visit = (node) => {
    if (node.type === 'tag' && /^h[1-4]$/.test(node.name)) { inside = heading.test(plain(render(node))); return; }
    if (inside && node.type === 'tag' && node.name === 'a' && node.attribs.href) {
      const label = plain(render(node));
      if (label) links.push([label, node.attribs.href]);
      return;
    }
    for (const child of node.children ?? []) visit(child);
  };
  visit(doc);
  return links;
}

// Bookmaker reviews that use the approved review design (Bet365 has its own template).
// partner matches an entry in src/data/offers.json where EveryTip has a live offer.
export const bookmakerReviews = {
  '/betfred-review': { name: 'Betfred', partner: 'betfred' },
  '/quinnbet-review': { name: 'QuinnBet', partner: 'quinnbet' },
  '/betway-sportsbook-review': { name: 'Betway', partner: 'betway' },
  '/10bet-review': { name: '10Bet', partner: '10bet' },
  '/betwright-review': { name: 'BetWright', partner: 'betwright' },
  '/netbet-review': { name: 'NetBet', partner: 'netbet' },
  '/netbet-sportsbook-review.html': { name: 'NetBet', partner: 'netbet' },
  '/spreadex-review': { name: 'Spreadex', partner: 'spreadex' },
  '/boylesports-review': { name: 'Boylesports', partner: null },
  '/betfair-sportsbook-review': { name: 'Betfair Sportsbook', partner: null },
  '/william-hill-review': { name: 'William Hill', partner: null },
  '/888sport-review': { name: '888sport', partner: null },
  '/mansionbet-review': { name: 'MansionBet', partner: null },
  '/paddy-power-review.html': { name: 'Paddy Power', partner: null },
  '/star-sports-bet-review.html': { name: 'Star Sports', partner: null },
  '/mr-play-sports-review.html': { name: 'mr.play Sports', partner: null },
  '/betfair-exchange-review.html': { name: 'Betfair Exchange', partner: null },
  '/comeon-review-2019.html': { name: 'ComeOn!', partner: null },
};
