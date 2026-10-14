import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import sanitizeHtml from 'sanitize-html';

const rawDirectory = resolve(process.cwd(), 'data/raw');
const stagingHost = 'wordpress-159231-2098144.cloudwaysapps.com';
const liveHost = 'www.everytip.co.uk';
const removableSelfEmbeds = new Map([
  ['/epl-game-week-11-2022-23-season-premier-league-tips-john-newsome.html', '/english-premier-league-2019-2020-best-young-players.html/embed'],
  ['/epl-game-week-12-2022-23-season-premier-league-tips-john-newsome.html', '/greatest-premier-league-football-games-of-all-time.html/embed'],
]);

function contentWithoutApprovedSelfEmbed(record) {
  const html = record.content ?? '';
  const expectedPath = removableSelfEmbeds.get(record.uri);
  if (!expectedPath) return html;
  const frames = [...html.matchAll(/<iframe\b[^>]*>[\s\S]*?<\/iframe>/gi)];
  if (frames.length !== 1) throw new Error(`Expected one known WordPress self-embed: ${record.uri}`);
  const opening = frames[0][0].match(/^<iframe\b[^>]*>/i)?.[0] ?? '';
  const src = opening.match(/\bsrc="([^"]+)"/i)?.[1];
  let url;
  try { url = new URL(src); } catch { throw new Error(`Invalid WordPress self-embed: ${record.uri}`); }
  if (!/\bclass="[^"]*\bwp-embedded-content\b/i.test(opening) ||
      !/\bsandbox="allow-scripts"/i.test(opening) ||
      !/visibility:\s*hidden/i.test(opening) ||
      ![stagingHost, liveHost].includes(url.hostname) || url.pathname !== expectedPath) {
    throw new Error(`Unapproved WordPress self-embed: ${record.uri}`);
  }
  return html.replace(frames[0][0], '');
}

export const previewUris = [
  '/value-bet-tips-dark-horses.html',
  '/bet365-review',
];

// Authenticated raw Ninja Tables audit, 2026-10-13. These exact-path tips
// previews must not present the snapshot's rendered rows as current picks.
export const ninjaBackedTipPreviewUris = new Set([
  '/football-correct-score-tips.html',
  '/templegates-tips.html',
  '/lucky-15-tips.html',
  '/under-over-1-5-goals-tips.html',
  '/horse-racing-treble-tips.html',
  '/over-2-5-goals-tips.html',
  '/1x2-betting-tips.html',
  '/football-accumulator-tips.html',
  '/nap-of-the-day.html',
  '/both-teams-to-score-btts-tips.html',
  '/value-bet-tips-dark-horses.html',
  '/uefa-champions-league-betting-tips-predictions.html',
  '/world-cup-2026-betting-tips.html',
  '/english-premier-league-betting-tips.html',
]);

export function withholdsSnapshotTipTables(record) {
  return ninjaBackedTipPreviewUris.has(record?.uri);
}

export function previewTitle(record) {
  if (record.uri === '/bet365-review') return 'Bet365 Review 2026';
  return record.title;
}

export async function latestContentSnapshot() {
  let files;
  try {
    files = await readdir(rawDirectory);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
  const latest = files.filter((name) => /^staging-wordpress-public-.*\.json$/.test(name)).sort().at(-1);
  return latest ? JSON.parse(await readFile(join(rawDirectory, latest), 'utf8')) : null;
}

export function assessContent(record) {
  const html = contentWithoutApprovedSelfEmbed(record);
  const reasons = [];
  if (!record.uri?.startsWith('/')) reasons.push('invalid-uri');
  if (!html.trim()) reasons.push('empty-content');
  if (/\bfl-builder\b|\bfl-row\b|\bfl-col\b|\btve_[\w-]+\b|\bthrv_[\w-]+\b/i.test(html)) reasons.push('builder-markup');
  if (/<\s*(?:script|iframe|form)\b/i.test(html)) reasons.push('active-embed');
  if (/<\s*style\b/i.test(html)) reasons.push('inline-style');
  return reasons;
}

function approvedImageSource(value) {
  if (!value) return null;
  try {
    const parsed = new URL(value, `https://${stagingHost}`);
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    if (![stagingHost, liveHost].includes(parsed.hostname)) return null;
    if (!parsed.pathname.startsWith('/wp-content/uploads/')) return null;
    parsed.protocol = 'https:';
    parsed.hostname = liveHost;
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch {
    return null;
  }
}

/** @param {{ content: string, uri?: string }} record @param {{ excludedImagePaths?: string[], allowedEditorialHrefs?: string[] }} [options] */
export function previewHtml(record, { excludedImagePaths = [], allowedEditorialHrefs = [] } = {}) {
  const reasons = assessContent(record);
  if (reasons.length) throw new Error(`Cannot preview ${record.uri ?? 'unknown'}: ${reasons.join(', ')}`);
  // Some legacy builder text was entity-encoded twice before reaching Gutenberg.
  // Decode one layer only for typographic/numeric entities, not &lt;/&gt;,
  // then run the usual HTML sanitizer before anything reaches the frontend.
  const content = contentWithoutApprovedSelfEmbed(record).replace(/&amp;(amp|quot|apos|nbsp|#(?:\d{2,7}|x[0-9a-f]{1,6}));/gi,
    (_match, entity) => `&${entity};`);
  const editorialHrefSet = new Set(allowedEditorialHrefs);
  const sanitized = sanitizeHtml(content, {
    allowedTags: ['p', 'h2', 'h3', 'h4', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'blockquote', 'figure', 'figcaption', 'img', 'br', 'hr', 'div', 'span', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'a'],
    allowedAttributes: {
      img: ['src', 'alt', 'width', 'height', 'loading'],
      a: ['href'],
      th: ['scope'],
      td: ['colspan', 'rowspan'],
    },
    allowedSchemes: ['https'],
    // This removes the entire table subtree, including stale row text. Other
    // editorial HTML remains. Exact routes show a visible feed status note.
    exclusiveFilter: withholdsSnapshotTipTables(record) ? (frame) => frame.tag === 'table' : undefined,
    transformTags: {
      a: (_tagName, attribs) => editorialHrefSet.has(attribs.href)
        ? { tagName: 'a', attribs: { href: attribs.href } }
        : { tagName: 'span', attribs: {} },
      img: (_tagName, attribs) => {
        const src = approvedImageSource(attribs.src);
        if (src && excludedImagePaths.some((path) => new URL(src).pathname === path)) return { tagName: 'span', attribs: {} };
        return src
          ? { tagName: 'img', attribs: { src, alt: attribs.alt ?? '', width: attribs.width, height: attribs.height, loading: 'lazy' } }
          : { tagName: 'span', attribs: {} };
      },
    },
  });
  // Cloudways rewrites some body text/shortcodes to the staging domain when
  // cloning. Preserve the prose, but restore the public site identity.
  return sanitized.replaceAll(stagingHost, liveHost);
}
