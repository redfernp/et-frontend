// Pre-launch sync (PRELAUNCH-SYNC-PLAN.md): bring live's changes since staging was copied onto
// staging, keeping the staging edits, so the staging -> live push loses nothing.
//
//   node --env-file=.env.local scripts/prelaunch-sync.mjs [--since=2026-09-30] [--apply] [--only=ID,ID]
//
// Without --apply it only reads both sites and writes a report. Live is read with the Editor
// application password in ../.wp-articles.env and only ever with GET; staging writes are refused
// unless the staging host is the Cloudways app. Every staging write keeps a backup.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { decodeHTML } from 'entities';

const args = Object.fromEntries(process.argv.slice(2).map((arg) => { const [key, value] = arg.replace(/^--/, '').split('='); return [key, value ?? true]; }));
const apply = args.apply === true;
const since = args.since ?? '2026-09-30T00:00:00';
const only = args.only ? new Set(String(args.only).split(',').map(Number)) : null;
// Daily tip posts where staging only holds an older day's tips: copy live anyway.
const force = new Set(args.force ? String(args.force).split(',').map(Number) : []);
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const out = `outputs/prelaunch/${stamp}`;

// Live credentials: the same Editor password the publishing skills use.
const liveEnv = Object.fromEntries((await readFile(args.liveEnv ?? '../.wp-articles.env', 'utf8')).split(/\r?\n/)
  .filter((line) => /^[A-Z_]+=/.test(line)).map((line) => [line.slice(0, line.indexOf('=')), line.slice(line.indexOf('=') + 1).trim()]));
const live = { base: liveEnv.WP_BASE_URL.replace(/\/$/, ''), auth: `Basic ${Buffer.from(`${liveEnv.WP_USERNAME}:${liveEnv.WP_APP_PASSWORD}`).toString('base64')}` };
const staging = { base: process.env.EVERYTIP_WP_BASE_URL.replace(/\/$/, ''), auth: `Basic ${Buffer.from(`${process.env.EVERYTIP_WP_USERNAME}:${process.env.EVERYTIP_WP_APPLICATION_PASSWORD}`).toString('base64')}` };
if (new URL(live.base).hostname !== 'www.everytip.co.uk') throw new Error('Live must be www.everytip.co.uk');
if (!/cloudwaysapps\.com$/.test(new URL(staging.base).hostname)) throw new Error('Refusing to write anywhere but the Cloudways staging app');

async function call(site, path, options = {}) {
  const method = options.method ?? 'GET';
  if (site === live && method !== 'GET') throw new Error('Live is read-only in this script');
  for (let attempt = 1; ; attempt++) {
    let response;
    // Dropped connections are retried like server errors.
    try { response = await fetch(`${site.base}/wp-json${path}`, { ...options, method, headers: { Authorization: site.auth, 'user-agent': 'EveryTip prelaunch sync', ...(options.body && !(options.body instanceof Uint8Array) ? { 'Content-Type': 'application/json' } : {}), ...options.headers }, signal: AbortSignal.timeout(90000) }); }
    catch (error) { if (attempt >= 4) throw error; await new Promise((resolve) => setTimeout(resolve, 3000 * attempt)); continue; }
    if (response.ok) return { data: await response.json(), headers: response.headers };
    if (attempt >= 4 || response.status < 500) throw new Error(`${method} ${site.base}${path}: HTTP ${response.status} ${(await response.text()).slice(0, 200)}`);
    await new Promise((resolve) => setTimeout(resolve, 3000 * attempt));
  }
}
async function all(site, type, query) {
  const rows = [];
  for (let page = 1; ; page++) {
    const { data, headers } = await call(site, `/wp/v2/${type}?per_page=100&page=${page}&${query}`);
    rows.push(...data);
    if (page >= Number(headers.get('x-wp-totalpages') ?? 1)) return rows;
  }
}

// Staging edits that must survive a copy from live (see the plan).
const exPartnerGo = /\/go\/(bet365|william-?hill|wh-|boyle)[^"']*/i;
export function stagingRecipes(raw) {
  const notes = [];
  let html = raw;
  if (/<table class="cg-table[\s\S]*?<\/table>/.test(html)) { html = html.replace(/<table class="cg-table[\s\S]*?<\/table>/g, '[everytip_top_offers count="3"]'); notes.push('plugin table -> top 3 ladder'); }
  // The plugin's single-bookmaker box (Hong Kong tips) runs until the next heading or blank line.
  if (/<div class="cg-box-layout/.test(html)) { html = html.replace(/<div class="cg-box-layout[\s\S]*?(?=\n\n|<h2|<p><strong|$)/, '[everytip_top_offers count="3"]\n\n'); notes.push('plugin box -> top 3 ladder'); }
  if (/<div class="cg-disclosure">/.test(html)) { html = html.replace(/\s*<div class="cg-disclosure">[^<]*<\/div>/g, ''); notes.push('removed 18+ plugin line'); }
  // Unwrap links to former partners, keeping the words (Bet365, William Hill, Boylesports).
  html = html.replace(/<a\b[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, (match, href, text) => {
    if (!exPartnerGo.test(href)) return match;
    notes.push(`unlinked former partner: ${href.replace(/^https?:\/\/[^/]+/, '')}`);
    return text;
  });
  // Beaver saved-layout shortcodes print as text now that Beaver is off.
  if (/\[fl_builder_insert_layout[^\]]*\]/.test(html)) { html = html.replace(/(?:<p>\s*)?\[fl_builder_insert_layout[^\]]*\](?:\s*<\/p>)?\s*/g, ''); notes.push('removed Beaver layout shortcode'); }
  // An empty Beaver layout wrapper around ordinary content (Beaver is off on staging).
  if (/<!-- \/?wp:fl-builder\/layout -->/.test(html)) { html = html.replace(/<!-- \/?wp:fl-builder\/layout -->\s*/g, ''); notes.push('removed Beaver wrapper'); }
  if (/fl-builder|tve_|tcb-/.test(html)) notes.push('CHECK: page builder markup');
  if (/bet365|william hill|boylesports/i.test(html.replace(/<[^>]+>/g, ' '))) notes.push('CHECK: mentions a former partner');
  return { html, notes };
}

const lineDiff = (a, b) => {
  const A = new Set(a.split('\n').map((l) => l.trim()).filter(Boolean)); const B = new Set(b.split('\n').map((l) => l.trim()).filter(Boolean));
  return { added: [...B].filter((l) => !A.has(l)).length, removed: [...A].filter((l) => !B.has(l)).length };
};
const fields = 'id,slug,date,modified,status,type,title,link';
await mkdir(out, { recursive: true });

// 1. Report.
const report = { since, changed: [], created: [], pages: [], gone: [] };
const stagingPosts = new Map((await all(staging, 'posts', `status=publish,draft,private,future&_fields=${fields}`)).map((p) => [p.id, p]));
const stagingPages = new Map((await all(staging, 'pages', `status=publish,draft,private&_fields=${fields}`)).map((p) => [p.id, p]));
const livePublishedRows = await all(live, 'posts', '_fields=id,slug');
const livePublished = new Set(livePublishedRows.map((p) => p.id));
const livePublishedSlugs = new Set(livePublishedRows.map((p) => p.slug));
// Posts this script created on staging have new IDs, so they are matched to live by slug.
const stagingBySlug = new Map([...stagingPosts.values()].map((p) => [p.slug, p]));
for (const post of await all(live, 'posts', `modified_after=${since}&orderby=modified&_fields=${fields}`)) {
  if (only && !only.has(post.id)) continue;
  const twin = stagingPosts.get(post.id)?.slug === post.slug ? stagingPosts.get(post.id) : stagingBySlug.get(post.slug) ?? stagingPosts.get(post.id);
  (twin ? report.changed : report.created).push({ ...post, stagingId: twin?.id ?? null });
}
for (const page of await all(live, 'pages', `modified_after=${since}&orderby=modified&_fields=${fields}`)) if (!only || only.has(page.id)) report.pages.push({ ...page, onStaging: stagingPages.has(page.id) });
for (const post of stagingPosts.values()) if (post.status === 'publish' && !livePublished.has(post.id) && !livePublishedSlugs.has(post.slug) && (!only || only.has(post.id))) report.gone.push(post);

const row = (p, extra = '') => `| ${p.id} | ${p.slug} | ${p.modified?.replace('T', ' ')} | ${extra} |`;
const lines = [`# Pre-launch sync report ${stamp}`, `Live changes since ${since}. Mode: ${apply ? 'APPLY' : 'dry run'}.`, '',
  `## Changed posts (${report.changed.length})`, '| ID | Slug | Live modified | Notes |', '|---|---|---|---|'];

// The clone rewrote every link to the staging host; compare as if it were live.
const stagingHost = new URL(staging.base).host;
const norm = (html) => html.split(stagingHost).join('www.everytip.co.uk').replace(/\s+/g, ' ').trim();
const same = (a, b) => norm(a) === norm(b);
// Staging's starting point for a post: the newest live revision that matches any version in
// staging's own history (the clone date differs per post). Comparing staging with it shows what
// staging changed since.
async function liveBase(liveId, stagingId, current) {
  const [{ data: liveRevisions }, { data: stagingRevisions }] = await Promise.all([
    call(live, `/wp/v2/posts/${liveId}/revisions?context=edit&per_page=100&_fields=id,date_gmt,content`),
    call(staging, `/wp/v2/posts/${stagingId}/revisions?context=edit&per_page=100&_fields=id,content`),
  ]);
  const seen = new Set([current, ...stagingRevisions.map((revision) => revision.content.raw)].map(norm));
  return liveRevisions.find((revision) => seen.has(norm(revision.content.raw)))?.content.raw ?? null;
}
// Compare visible text only: block-editor conversions on staging change markup, not words.
const decode = (text) => decodeHTML(text).replace(/ /g, ' ');
const words = (html) => norm(decode(html.replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ')));

// 2. Changed posts. Copied automatically only when staging's own changes are nothing more than
// the recipes; anything else (hand edits on staging) is left for a manual merge. Posts this script
// created earlier (a different staging ID) are always refreshed from live.
for (const post of report.changed) {
  const sid = post.stagingId ?? post.id;
  const ours = sid !== post.id;
  const { data: src } = await call(live, `/wp/v2/posts/${post.id}?context=edit&_fields=id,slug,date,title,content,excerpt`);
  const { data: cur } = await call(staging, `/wp/v2/posts/${sid}?context=edit&_fields=id,content,status`);
  const { html, notes } = stagingRecipes(src.content.raw);
  const diff = lineDiff(cur.content.raw, html);
  const base = ours ? null : await liveBase(post.id, sid, cur.content.raw);
  // Live re-saved without changing a word (e.g. a bulk save that re-encoded quotes): keep staging.
  const liveUnchanged = base !== null && words(stagingRecipes(base).html) === words(html);
  const stagingEdited = ours ? false : base === null ? 'unknown' : words(stagingRecipes(base).html) !== words(stagingRecipes(cur.content.raw).html);
  await writeFile(`${out}/${post.id}-staging-before.json`, JSON.stringify(cur));
  await writeFile(`${out}/${post.id}-live.html`, src.content.raw);
  if (base !== null) await writeFile(`${out}/${post.id}-live-at-copy.html`, base);
  const write = async () => call(staging, `/wp/v2/posts/${sid}`, { method: 'POST', body: JSON.stringify({ content: html, title: src.title.raw, excerpt: src.excerpt.raw, date: src.date, slug: src.slug, status: 'publish' }) });
  let result = `${diff.added} lines in, ${diff.removed} out${ours ? `; staging copy ${sid}` : ''}`;
  if (liveUnchanged) result += '; no real change on live (re-save), staging kept';
  else if (notes.some((n) => n.startsWith('CHECK: page builder'))) result += '; SKIPPED (page builder, do by hand)';
  else if (force.has(post.id)) { if (apply) await write(); result += apply ? '; written (forced)' : '; will be written (forced)'; }
  else if (stagingEdited === 'unknown') result += '; SKIPPED (no revision from the copy date to compare, merge by hand)';
  else if (stagingEdited) result += '; SKIPPED (also edited on staging, merge by hand)';
  else if (apply) { await write(); result += '; written'; }
  lines.push(row(post, `${result}${notes.length ? `; ${notes.join('; ')}` : ''}`));
}

// 3. New posts: terms by slug, featured image uploaded to staging media.
const termCache = new Map();
async function stagingTerm(taxonomy, liveId) {
  const key = `${taxonomy}:${liveId}`;
  if (termCache.has(key)) return termCache.get(key);
  const { data: term } = await call(live, `/wp/v2/${taxonomy}/${liveId}?_fields=id,name,slug,parent`);
  const { data: found } = await call(staging, `/wp/v2/${taxonomy}?slug=${encodeURIComponent(term.slug)}&_fields=id`);
  let id = found[0]?.id;
  if (!id && apply) id = (await call(staging, `/wp/v2/${taxonomy}`, { method: 'POST', body: JSON.stringify({ name: term.name, slug: term.slug, ...(term.parent ? { parent: await stagingTerm(taxonomy, term.parent) } : {}) }) })).data.id;
  termCache.set(key, id);
  return id;
}
lines.push('', `## New posts on live (${report.created.length})`, '| ID (live) | Slug | Live modified | Notes |', '|---|---|---|---|');
for (const post of report.created) {
  const { data: src } = await call(live, `/wp/v2/posts/${post.id}?context=edit&_fields=id,slug,date,title,content,excerpt,author,categories,tags,featured_media,yoast_head_json`);
  const { html, notes } = stagingRecipes(src.content.raw);
  await writeFile(`${out}/new-${post.id}-live.json`, JSON.stringify(src));
  let result = `${src.categories.length} categories, ${src.tags.length} tags${src.featured_media ? ', featured image' : ''}`;
  if (apply) {
    const categories = (await Promise.all(src.categories.map((id) => stagingTerm('categories', id)))).filter(Boolean);
    const tags = (await Promise.all(src.tags.map((id) => stagingTerm('tags', id)))).filter(Boolean);
    let featured;
    if (src.featured_media) {
      const { data: media } = await call(live, `/wp/v2/media/${src.featured_media}?_fields=source_url,alt_text,title`);
      const file = new Uint8Array(await (await fetch(media.source_url)).arrayBuffer());
      const name = decodeURIComponent(media.source_url.split('/').pop());
      featured = (await call(staging, '/wp/v2/media', { method: 'POST', body: file, headers: { 'Content-Disposition': `attachment; filename="${name}"`, 'Content-Type': name.endsWith('.png') ? 'image/png' : name.endsWith('.webp') ? 'image/webp' : 'image/jpeg' } })).data.id;
      if (media.alt_text) await call(staging, `/wp/v2/media/${featured}`, { method: 'POST', body: JSON.stringify({ alt_text: media.alt_text }) });
    }
    const { data: made } = await call(staging, '/wp/v2/posts', { method: 'POST', body: JSON.stringify({ slug: src.slug, title: src.title.raw, content: html, excerpt: src.excerpt.raw, date: src.date, status: 'publish', categories, tags, ...(featured ? { featured_media: featured } : {}) }) });
    if (made.slug !== src.slug) notes.push(`CHECK: slug became ${made.slug}`);
    // Yoast title and description through the staging editorial SEO route.
    const seo = src.yoast_head_json ?? {};
    if (seo.title || seo.description) {
      const { data: current } = await call(staging, `/everytip/v1/editorial-seo/${made.id}`);
      await call(staging, `/everytip/v1/editorial-seo/${made.id}`, { method: 'POST', body: JSON.stringify({ expected_revision: current.revision_token, fields: { ...(seo.title ? { seo_title: seo.title.replace(/ - Every Tip$/, '') } : {}), ...(seo.description ? { meta_description: seo.description } : {}) } }) });
    }
    result += `; created as staging ${made.id}`;
  }
  lines.push(row(post, `${result}${notes.length ? `; ${notes.join('; ')}` : ''}`));
}

// 4. Pages: report only.
lines.push('', `## Changed pages (${report.pages.length}), report only`, '| ID | Slug | Live modified | Notes |', '|---|---|---|---|');
for (const page of report.pages) lines.push(row(page, page.onStaging ? 'review by hand' : 'NOT ON STAGING'));

// 5. Published on staging, gone from live: draft on staging so the push does not bring it back.
lines.push('', `## On staging, gone from live (${report.gone.length})`, '| ID | Slug | Staging modified | Action |', '|---|---|---|---|');
for (const post of report.gone) {
  if (apply) {
    await writeFile(`${out}/gone-${post.id}-staging-before.json`, JSON.stringify(post));
    await call(staging, `/wp/v2/posts/${post.id}`, { method: 'POST', body: JSON.stringify({ status: 'draft' }) });
  }
  lines.push(row(post, apply ? 'set to draft' : 'will be set to draft'));
}

await writeFile(`${out}/report.md`, lines.join('\n') + '\n');
await writeFile(`${out}/report.json`, JSON.stringify(report, null, 2));
console.log(`${apply ? 'APPLIED' : 'Dry run'}: ${report.changed.length} changed, ${report.created.length} new, ${report.pages.length} pages, ${report.gone.length} gone. Report: ${out}/report.md`);
