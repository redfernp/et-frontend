import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { previewHtml } from './migration-preview.mjs';

// Dated handoff from ../legacy-rewrites/CODEX-HANDOFF.md (4 October 2026).
// These are review-only local snapshots, never an approval of current claims.
export const ownerRewriteSources = Object.freeze([
  { id: 56061, uri: '/betfred-pick-your-punt', oldExclusion: 'unsafe-content:builder-markup', sha256: '9574433F01089AFCD559B304B83272D25A3B8FE0F14F3F91038873D69F405D3E' },
  { id: 72881, uri: '/quinnbet-bonus-code', oldExclusion: 'unsafe-content:builder-markup', sha256: '23D170DD498EEA2B8D3356F9AA5D52EF8342C70399DE8F7F44A2CE1F8D2AD83E' },
  { id: 60150, uri: '/which-countries-is-bet365-available', oldExclusion: 'unsafe-content:builder-markup', sha256: '54F45068FA940695C9031FE1A16C5BF6BDFE20E34818086A0D70D9A1DF2084D2' },
  { id: 34795, uri: '/acca-insurance/paddy-power', oldExclusion: 'unsafe-content:empty-content', sha256: '45AEB080DCB052232E1C665C3A32565E7A7EE280B23625AFCD4B3F95FD641102' },
  { id: 12138, uri: '/bet-on-horse-racing-from-india.html', oldExclusion: 'unsafe-content:active-embed', sha256: '1E979D1C13DDBB95C5C5B37DD795F97C8C81086E1D95E727B9CA0AA50D133C1D' },
  { id: 7945, uri: '/learn-how-to-make-money-trading-on-betfair-without-any-experience-and-a-50-bankroll.html', oldExclusion: 'unsafe-content:active-embed', sha256: '78D38F175AAEA8F9C32853EC506F217792A62089F05D80A5150956383025A154' },
  { id: 10754, uri: '/free-horse-racing-system.html', oldExclusion: 'unsafe-content:active-embed', sha256: '0A78A04266C32D7EA44B29867FEA67023B7B6EF508BE710BF97A0DDD24F852D5' },
  { id: 1482, uri: '/steve-mullens-tips.html', oldExclusion: 'unsafe-content:active-embed', sha256: '2DEE908BDEBB5E4B1CC279A990AB3E24242C04C42FB3F05AD64C1114E91912D3' },
]);

const sourceDirectory = resolve(process.cwd(), 'data/owner-rewrites');
const capturedAt = '2026-10-04T00:00:00';

export function inertOwnerRewriteBody(raw) {
  // The handoff includes legacy layout shortcodes and occasional affiliate CTA
  // lines. Remove those entire lines before the normal allowlist sanitizer.
  return raw.split(/\r?\n/).filter((line) => !/\[fl_builder_insert_layout\b|\/go\//i.test(line)).join('\n');
}

export async function ownerRewritePreviewRecords() {
  const manifest = JSON.parse(await readFile(join(sourceDirectory, 'manifest.json'), 'utf8'));
  const records = [];
  for (const source of ownerRewriteSources) {
    const raw = await readFile(join(sourceDirectory, `${source.id}.html`));
    const digest = createHash('sha256').update(raw).digest('hex').toUpperCase();
    if (digest !== source.sha256) throw new Error(`Owner rewrite source changed: ${source.id}`);
    const metadata = manifest[source.id];
    if (!metadata?.title || !metadata.ytitle || !metadata.ydesc) throw new Error(`Missing owner rewrite metadata: ${source.id}`);
    const content = inertOwnerRewriteBody(raw.toString('utf8'));
    if (/\/go\/|\[fl_builder_insert_layout\b/i.test(content)) throw new Error(`Active offer/layout reference remains: ${source.id}`);
    const record = {
      databaseId: source.id, uri: source.uri, slug: source.uri.split('/').at(-1).replace(/\.html$/, ''),
      title: metadata.title, content, date: capturedAt, modified: capturedAt,
      sourceMode: 'owner-rewrite-handoff-2026-10-04',
      seo: { title: metadata.ytitle, metaDesc: metadata.ydesc,
        canonical: `https://www.everytip.co.uk${source.uri}`, metaRobotsNoindex: 'index' },
    };
    const html = previewHtml(record);
    if (!html.trim() || /href=|\/go\//i.test(html)) throw new Error(`Owner rewrite preview is not inert: ${source.id}`);
    records.push({ source, record, contentKind: metadata.type === 'posts' ? 'post' : 'page' });
  }
  return records;
}
