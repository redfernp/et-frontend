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
  if (record.kind === 'posts') return { label: 'Free betting tips', href: '/free-betting-tips' };
  return null;
}

export const plainTitle = plain;
