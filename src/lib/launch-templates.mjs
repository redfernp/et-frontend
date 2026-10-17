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

// WordPress HTML before the first <h2> matching `heading` (for example the trailing offer list).
export function contentBeforeHeading(html, heading) {
  const matches = [...(html ?? '').matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)];
  const match = matches.find((m) => heading.test(plain(m[1])));
  return match ? html.slice(0, match.index) : html;
}

// Roundups and how-to guides use the approved roundup guide header.
export function isGuide(record) {
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
