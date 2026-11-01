// Strict QA: compare every published post and page on the live WordPress site with the new
// build, element by element, and flag each difference for a keep-or-ditch decision.
//
//   node scripts/qa-compare.mjs [--limit=50] [--fresh]
//
// Live pages are fetched read-only (4 at a time) and cached in outputs/qa/live-cache, so reruns
// are quick; --fresh re-fetches. New pages are read from dist/. Writes outputs/qa/report.json,
// outputs/qa/differences.csv and outputs/qa/report.html.
import { createHash } from 'node:crypto';
import { existsSync, statSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { parseDocument, DomUtils } from 'htmlparser2';

const args = Object.fromEntries(process.argv.slice(2).map((arg) => { const [key, value] = arg.replace(/^--/, '').split('='); return [key, value ?? true]; }));
const LIVE = 'https://www.everytip.co.uk';
const cacheDir = 'outputs/qa/live-cache';
await mkdir(cacheDir, { recursive: true });

const source = JSON.parse(await readFile('outputs/launch-source.json', 'utf8'));
let records = source.records.filter((record) => ['posts', 'pages'].includes(record.kind) && record.status === 'publish');
if (args.limit) records = records.slice(0, Number(args.limit));

const distFile = (uri) => {
  const direct = `dist${uri}`;
  if (existsSync(direct) && statSync(direct).isFile()) return direct;
  const index = `dist${uri.replace(/\/$/, '')}/index.html`;
  return existsSync(index) ? index : null;
};

async function fetchLive(uri) {
  const file = `${cacheDir}/${createHash('sha1').update(uri).digest('hex')}.html`;
  if (!args.fresh && existsSync(file)) return { status: 200, html: await readFile(file, 'utf8'), cached: true };
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(LIVE + uri, { headers: { 'user-agent': 'Mozilla/5.0 (EveryTip migration QA)' }, redirect: 'manual', signal: AbortSignal.timeout(45000) });
      if (response.status >= 300 && response.status < 400) return { status: response.status, location: response.headers.get('location'), html: '' };
      const html = await response.text();
      if (response.ok) await writeFile(file, html);
      return { status: response.status, html };
    } catch (error) { if (attempt === 3) return { status: 0, error: String(error), html: '' }; await new Promise((resolve) => setTimeout(resolve, 2000 * attempt)); }
  }
}

const text = (node) => DomUtils.textContent(node).replace(/\s+/g, ' ').trim();
// htmlparser2 gives script and style elements their own node types, so match those too.
const isElement = (node) => ['tag', 'script', 'style'].includes(node.type);
const find = (doc, test) => DomUtils.findAll((node) => isElement(node) && test(node), doc.children);
const one = (doc, test) => DomUtils.findOne((node) => isElement(node) && test(node), doc.children, true);
const meta = (doc, key) => one(doc, (n) => n.name === 'meta' && (n.attribs.name === key || n.attribs.property === key))?.attribs.content?.trim() ?? '';
const norm = (value) => (value ?? '').replace(/\s+/g, ' ').trim();
const path = (href) => { try { const url = new URL(href, LIVE); return url.pathname.replace(/\/$/, '') || '/'; } catch { return href; } };

// The main article area: live is GeneratePress (.entry-content / article), the new site <main>.
function mainOf(doc, live) {
  if (live) return one(doc, (n) => /\bentry-content\b/.test(n.attribs.class ?? '')) ?? one(doc, (n) => n.name === 'article') ?? one(doc, (n) => n.name === 'main') ?? doc;
  return one(doc, (n) => n.name === 'main') ?? doc;
}

function extract(html, live) {
  const doc = parseDocument(html, { decodeEntities: true });
  const main = mainOf(doc, live);
  // Inline styles, scripts and noscript copies (page-builder CSS, lazy-load fallbacks) are not content.
  for (const node of find(doc, (n) => ['script', 'style', 'noscript'].includes(n.name) && n.attribs.type !== 'application/ld+json')) DomUtils.removeElement(node);
  // The old Affiliatable comparison table/box is replaced on purpose by the top-offers ladder.
  if (live) for (const node of find(main, (n) => /\bcg-(table|box-layout|disclosure)/.test(n.attribs.class ?? ''))) DomUtils.removeElement(node);
  // Live adds a Betfred offer banner (image link plus an orange text link) after every post.
  // Report it as one decision instead of an image and an affiliate link on every page.
  let postBanner = false;
  if (live) for (const a of find(main, (n) => n.name === 'a' && /\/go\/betfred/.test(n.attribs.href ?? '') && (/orange-link/.test(n.attribs.class ?? '') || find(n, (c) => c.name === 'img' && /racing-offer|betfred-20\d\d/i.test(`${c.attribs.src ?? ''} ${c.attribs['data-lazy-src'] ?? ''}`)).length))) { postBanner = true; DomUtils.removeElement(a); }
  const schemaTypes = new Set();
  for (const script of find(doc, (n) => n.name === 'script' && n.attribs.type === 'application/ld+json')) {
    try { JSON.stringify(JSON.parse(DomUtils.textContent(script))).replace(/"@type":"([A-Za-z]+)"/g, (m, type) => schemaTypes.add(type)); } catch {}
  }
  const links = find(main, (n) => n.name === 'a' && n.attribs.href);
  const internal = links.filter((a) => { try { return new URL(a.attribs.href, LIVE).hostname.endsWith('everytip.co.uk') || a.attribs.href.startsWith('/'); } catch { return false; } });
  // Lazy-load placeholders (data: URIs) duplicate each real image on the live site.
  const images = find(main, (n) => n.name === 'img' && !/^data:/.test(n.attribs.src ?? ''));
  // Words outside tables: table rows are compared separately, and live's Ninja tables print
  // hidden responsive cells that would swamp the prose count.
  const tableText = find(main, (n) => n.name === 'table').map(text).join(' ').split(' ').filter(Boolean).length;
  const words = text(main).split(' ').filter(Boolean).length - tableText;
  return {
    title: norm(text(one(doc, (n) => n.name === 'title') ?? { children: [] })),
    description: meta(doc, 'description'),
    canonical: one(doc, (n) => n.name === 'link' && n.attribs.rel === 'canonical')?.attribs.href ?? '',
    robots: meta(doc, 'robots'),
    ogTitle: meta(doc, 'og:title'), ogDescription: meta(doc, 'og:description'), ogImage: meta(doc, 'og:image'),
    h1: find(doc, (n) => n.name === 'h1').map(text).filter(Boolean),
    h2: find(main, (n) => n.name === 'h2').map(text).filter(Boolean),
    h3Count: find(main, (n) => n.name === 'h3').length,
    words,
    schemaTypes: [...schemaTypes].sort(),
    // An author box: live's author-box/author-info, or the new site's author box, columnist profile or reviewer box.
    author: Boolean(one(doc, (n) => /author-box|author-info|about-author|columnist-card|columnist-byline|bk-reviewer/i.test(n.attribs.class ?? ''))),
    breadcrumbs: Boolean(one(doc, (n) => /breadcrumb/i.test(`${n.attribs.class ?? ''} ${n.attribs['aria-label'] ?? ''}`))),
    images: images.length,
    imagesNoAlt: find(main, (n) => n.name === 'img').filter((img) => !norm(img.attribs.alt)).length,
    videos: find(main, (n) => n.name === 'iframe' && /youtube|vimeo/i.test(n.attribs.src ?? n.attribs['data-src'] ?? n.attribs['data-lazy-src'] ?? '')).length,
    tables: find(main, (n) => n.name === 'table').length,
    tableRows: find(main, (n) => n.name === 'tr').length,
    internalLinks: [...new Set(internal.filter((a) => !/\/go\//.test(a.attribs.href)).map((a) => path(a.attribs.href)))],
    goLinks: [...new Set(links.filter((a) => /\/go\//.test(a.attribs.href)).map((a) => path(a.attribs.href)))].sort(),
    faq: /faq|frequently asked/i.test(text(main)) || schemaTypes.has('FAQPage'),
    postBanner,
  };
}

// Each check returns null (same) or a short description of the difference.
const formerPartner = /bet365|william-?hill|boyle/i;
const checks = [
  ['seo', 'critical', 'Title tag', (o, n) => o.title !== n.title && `"${o.title}" -> "${n.title}"`],
  ['seo', 'critical', 'Meta description', (o, n) => o.description !== n.description && (n.description ? 'changed' : 'MISSING on new site')],
  ['seo', 'critical', 'Canonical', (o, n) => o.canonical && path(o.canonical) !== path(n.canonical) && `${o.canonical} -> ${n.canonical || 'MISSING'}`],
  ['seo', 'info', 'Canonical added (none on live)', (o, n) => !o.canonical && n.canonical && n.canonical],
  ['seo', 'critical', 'Robots', (o, n) => /noindex/.test(n.robots) !== /noindex/.test(o.robots) && `"${o.robots}" -> "${n.robots}"`],
  ['seo', 'critical', 'H1', (o, n) => norm(o.h1.join(' | ')).toLowerCase() !== norm(n.h1.join(' | ')).toLowerCase() && `"${o.h1.join(' | ')}" -> "${n.h1.join(' | ')}"`],
  // The old review plugin's Product markup (Offer, Rating, AggregateRating) is replaced by our Review
  // schema; hand-added "about" entities use the lowercase type "thing" and are reported on their own.
  ['seo', 'critical', 'Schema types missing', (o, n) => { const replaced = n.schemaTypes.includes('Review') ? ['Product', 'Offer', 'AggregateRating', 'Rating'] : []; const missing = o.schemaTypes.filter((t) => t !== 'thing' && !n.schemaTypes.includes(t) && !replaced.includes(t)); return missing.length && missing.join(', '); }],
  ['seo', 'medium', 'Hand-added entity schema missing', (o, n) => o.schemaTypes.includes('thing') && !n.schemaTypes.includes('thing') && 'WebPage "about" entities on live only'],
  ['seo', 'info', 'Review plugin schema replaced by Review schema', (o, n) => o.schemaTypes.includes('Product') && !n.schemaTypes.includes('Product') && n.schemaTypes.includes('Review') && 'Product/Offer/AggregateRating -> Review'],
  ['seo', 'high', 'Open Graph tags', (o, n) => { const lost = ['ogTitle', 'ogDescription', 'ogImage'].filter((k) => o[k] && !n[k]); return lost.length && `missing: ${lost.join(', ')}`; }],
  ['content', 'high', 'Word count drop over 20%', (o, n) => o.words > 150 && n.words < o.words * 0.8 && `${o.words} -> ${n.words} words`],
  ['content', 'high', 'H2 headings missing', (o, n) => { const have = new Set(n.h2.map((h) => h.toLowerCase())); const missing = o.h2.filter((h) => !have.has(h.toLowerCase())); return missing.length && missing.slice(0, 6).join(' | ') + (missing.length > 6 ? ` (+${missing.length - 6})` : ''); }],
  ['content', 'medium', 'Images fewer', (o, n) => n.images < o.images && `${o.images} -> ${n.images}`],
  ['content', 'medium', 'Images without alt text (new site)', (o, n) => n.imagesNoAlt > o.imagesNoAlt && `${o.imagesNoAlt} -> ${n.imagesNoAlt}`],
  ['content', 'high', 'Videos missing', (o, n) => n.videos < o.videos && `${o.videos} -> ${n.videos}`],
  ['content', 'high', 'Tables fewer', (o, n) => n.tables < o.tables && `${o.tables} -> ${n.tables}`],
  ['content', 'medium', 'Table rows fewer', (o, n) => n.tableRows < o.tableRows * 0.9 && `${o.tableRows} -> ${n.tableRows}`],
  ['content', 'medium', 'FAQ section missing', (o, n) => o.faq && !n.faq && 'FAQ on live only'],
  ['links', 'medium', 'Internal links removed', (o, n) => { const have = new Set(n.internalLinks); const lost = o.internalLinks.filter((l) => !have.has(l)); return lost.length && `${lost.length}: ${lost.slice(0, 5).join(' ')}`; }],
  ['commercial', 'medium', 'Affiliate links removed', (o, n) => { const lost = o.goLinks.filter((l) => !n.goLinks.includes(l) && !formerPartner.test(l)); return lost.length && lost.join(' '); }],
  ['commercial', 'info', 'Former-partner affiliate links removed (expected)', (o, n) => { const lost = o.goLinks.filter((l) => !n.goLinks.includes(l) && formerPartner.test(l)); return lost.length && lost.join(' '); }],
  ['commercial', 'high', 'Betfred banner after the post (live only)', (o, n) => o.postBanner && 'live shows the Betfred offer banner and link after the content'],
  ['layout', 'high', 'Author box missing', (o, n) => o.author && !n.author && 'author on live only'],
  ['layout', 'medium', 'Breadcrumbs missing', (o, n) => o.breadcrumbs && !n.breadcrumbs && 'breadcrumbs on live only'],
];

const results = [];
let index = 0;
async function worker() {
  while (index < records.length) {
    const record = records[index++];
    const newFile = distFile(record.uri);
    const live = await fetchLive(record.uri);
    const row = { uri: record.uri, kind: record.kind, title: record.title?.replace(/<[^>]+>/g, ''), liveStatus: live.status, differences: [] };
    if (!newFile) row.differences.push({ area: 'seo', severity: 'critical', check: 'Page missing on new site', detail: 'no built page' });
    if (live.status !== 200) row.differences.push({ area: 'seo', severity: 'info', check: 'Live page not 200', detail: `${live.status}${live.location ? ' -> ' + live.location : ''}${live.error ? ' ' + live.error : ''}` });
    if (newFile && live.status === 200) {
      const old = extract(live.html, true);
      const now = extract(await readFile(newFile, 'utf8'), false);
      for (const [area, severity, check, test] of checks) { const detail = test(old, now); if (detail) row.differences.push({ area, severity, check, detail: String(detail) }); }
      row.metrics = { liveWords: old.words, newWords: now.words, liveSchema: old.schemaTypes, newSchema: now.schemaTypes };
    }
    results.push(row);
    if (results.length % 50 === 0) console.log(`${results.length}/${records.length}`);
  }
}
await Promise.all(Array.from({ length: 4 }, worker));
results.sort((a, b) => a.uri.localeCompare(b.uri));

// Summary per check: how many pages, with examples.
const summary = {};
for (const row of results) for (const d of row.differences) {
  const key = `${d.severity}|${d.area}|${d.check}`;
  summary[key] ??= { severity: d.severity, area: d.area, check: d.check, pages: 0, examples: [] };
  summary[key].pages++;
  if (summary[key].examples.length < 5) summary[key].examples.push(`${row.uri}: ${d.detail}`);
}
const order = { critical: 0, high: 1, medium: 2, info: 3 };
const summaryRows = Object.values(summary).sort((a, b) => order[a.severity] - order[b.severity] || b.pages - a.pages);
await mkdir('outputs/qa', { recursive: true });
await writeFile('outputs/qa/report.json', JSON.stringify({ generatedAt: new Date().toISOString(), pages: results.length, summary: summaryRows, results }, null, 1));
const csv = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`;
await writeFile('outputs/qa/differences.csv', ['severity,area,check,url,detail,decision (keep/ditch)', ...results.flatMap((row) => row.differences.map((d) => [d.severity, d.area, d.check, LIVE + row.uri, d.detail, ''].map(csv).join(',')))].join('\n'));
// Assessment of each check after review on 31 October 2026, shown in the report.
const notes = {
  'Robots': 'KEEP (decided 1 Nov): your rolling rule noindexes John Newsome and Seymour Biz columns older than 12 months. Staging applies it to all 434; live is behind on these.',
  'H1': 'Mostly expected: live printed duplicate H1s ("X | X") or none; the new site prints one H1 per page. Check the few where the wording changed.',
  'Meta description': 'Pages edited on live since staging was copied; copied across when pages are synced at launch.',
  'Title tag': 'Fixed: titles now match live.',
  'Betfred banner after the post (live only)': 'DITCHED (decided 1 Nov): every post now ends with the Today’s Top 3 Betting Offers block instead.',
  'Word count drop over 20%': 'Mostly expected: former partners, non-partners and promo copy removed from guides and reviews. A few are pages edited on live since the copy (synced at launch).',
  'H2 headings missing': 'Mostly expected: review and guide redesigns restructure headings; removed partner sections. Pages edited on live since the copy are synced at launch.',
  'Tables fewer': 'DITCHED (decided 1 Nov): the old Beaver Top Bookies tables are gone; the 36 posts that had one show the Top 3 offers after the intro instead (src/data/top3-after-intro.json).',
  'Author box missing': 'Expected: utility pages (newsletter, free bets hub, subscription confirm) and the Bet365 review template.',
  'Schema types missing': 'NetBet now scores 4/5 with Review schema. The other four old .html reviews are left for Paul to refresh later.',
  'Hand-added entity schema missing': 'OMITTED for now (decided 1 Nov): Paul will refresh these guides later.',
  'Review plugin schema replaced by Review schema': 'Expected: the new reviews output clean Review schema from our star rating.',
  'Internal links removed': 'Mostly expected: links to former-partner and non-partner reviews removed with their sections.',
  'Affiliate links removed': 'Mostly expected: non-partner and duplicate CTA links removed. Review the list for any partner link that should stay.',
  'Images fewer': 'Mostly expected: logos of removed bookmakers and the Affiliatable table.',
  'Images without alt text (new site)': 'Counts lazy-load placeholders on live, whose alt matches the real image. Remaining cases are images whose alt is empty in WordPress on both sites.',
  'Canonical added (none on live)': 'Improvement: live had no canonical on these pages.',
  'Former-partner affiliate links removed (expected)': 'Expected: Bet365, William Hill and Boylesports links removed by design.',
  'Live page not 200': 'Old offer posts deleted on live; drafted on staging by the sync.',
};

// Readable report: summary by check, then every difference, filterable by severity and area.
const esc = (value) => String(value ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const rows = results.flatMap((row) => row.differences.map((d) => ({ ...d, uri: row.uri })));
await writeFile('outputs/qa/report.html', `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>EveryTip migration QA</title>
<style>body{font:15px/1.5 system-ui,sans-serif;margin:24px;color:#1d2b36}h1{margin:0 0 4px}table{border-collapse:collapse;width:100%;margin:12px 0 28px}th,td{text-align:left;padding:7px 9px;border-bottom:1px solid #e3e8ec;vertical-align:top}th{background:#f3f7fa}.critical{color:#b42318;font-weight:700}.high{color:#b54708;font-weight:700}.medium{color:#175cd3}.info{color:#667085}details summary{cursor:pointer}select,input{font:inherit;padding:5px 8px;margin-right:8px}code{font-size:13px}</style>
<h1>EveryTip migration QA</h1><p>${results.length} pages compared, live site v new build, ${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC. Decide keep or ditch per check; record decisions in differences.csv.</p>
<h2>Summary by check</h2><table><tr><th>Severity</th><th>Area</th><th>Check</th><th>Pages</th><th>Assessment</th><th>Examples</th></tr>
${summaryRows.map((s) => `<tr><td class="${s.severity}">${s.severity}</td><td>${s.area}</td><td>${esc(s.check)}</td><td>${s.pages}</td><td>${esc(notes[s.check] ?? '')}</td><td><details><summary>show</summary>${s.examples.map((e) => `<div><code>${esc(e)}</code></div>`).join('')}</details></td></tr>`).join('')}</table>
<h2>All differences</h2><p><select id="sev"><option value="">All severities</option><option>critical</option><option>high</option><option>medium</option><option>info</option></select><select id="area"><option value="">All areas</option>${[...new Set(rows.map((r) => r.area))].map((a) => `<option>${a}</option>`).join('')}</select><input id="q" placeholder="Filter by URL or check"></p>
<table id="all"><tr><th>Severity</th><th>Area</th><th>Check</th><th>Page</th><th>Detail</th></tr>${rows.map((r) => `<tr data-sev="${r.severity}" data-area="${r.area}"><td class="${r.severity}">${r.severity}</td><td>${r.area}</td><td>${esc(r.check)}</td><td><a href="${LIVE}${esc(r.uri)}">${esc(r.uri)}</a></td><td>${esc(r.detail)}</td></tr>`).join('')}</table>
<script>const f=()=>{const s=sev.value,a=area.value,t=q.value.toLowerCase();for(const tr of document.querySelectorAll('#all tr[data-sev]'))tr.hidden=(s&&tr.dataset.sev!==s)||(a&&tr.dataset.area!==a)||(t&&!tr.textContent.toLowerCase().includes(t))};for(const el of [sev,area,q])el.addEventListener('input',f)</script>`);
console.log(`Pages compared: ${results.length}`);
for (const s of summaryRows) console.log(`${s.severity.padEnd(8)} ${s.area.padEnd(10)} ${String(s.pages).padStart(5)}  ${s.check}`);
