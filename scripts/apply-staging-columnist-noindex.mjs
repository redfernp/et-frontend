// Set Yoast noindex on old John/Seymour columns only, preserving every other SEO field.
// Usage: node --env-file=.env.local scripts/apply-staging-columnist-noindex.mjs --apply --limit=10
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { columnistNoindexCutoff } from '../src/lib/columnist-noindex-cutoff.mjs';

if (!process.argv.includes('--apply')) throw new Error('Explicit --apply required');
const limit = Number(process.argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1] ?? 10);
if (!Number.isInteger(limit) || limit < 1 || limit > 200) throw new Error('Choose --limit=1..200');
const offset = Number(process.argv.find((arg) => arg.startsWith('--offset='))?.split('=')[1] ?? 0);
if (!Number.isInteger(offset) || offset < 0 || offset > 195) throw new Error('Choose --offset=0..195');
const site = new URL(process.env.EVERYTIP_WP_BASE_URL ?? '');
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') {
  throw new Error('Only the named EveryTip staging site is permitted');
}
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!username || !password) throw new Error('Missing staging REST credentials');
const headers = { Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}` };
const directory = new URL('../artifacts/staging-columnist-noindex/', import.meta.url);
const planName = (await readdir(directory)).filter((name) => name.startsWith('plan-') && name.endsWith('.json')).sort().at(-1);
if (!planName) throw new Error('No current read-only plan');
const plan = JSON.parse(await readFile(new URL(planName, directory), 'utf8'));
if (plan.environment !== 'staging' || plan.cutoffExclusive !== columnistNoindexCutoff() ||
    plan.dateBasis !== 'WordPress publication date' ||
    Date.now() - Date.parse(plan.generatedAt) > 2 * 60 * 60 * 1000) {
  throw new Error('Staging plan is stale or has the wrong cutoff');
}
const safeFields = ['seo_title', 'meta_description', 'focus_keyphrase', 'canonical', 'nofollow',
  'noimageindex', 'noarchive', 'nosnippet', 'open_graph_title', 'open_graph_description',
  'twitter_title', 'twitter_description', 'schema_page_type', 'schema_article_type'];
const parseAbility = (value) => Array.isArray(value) ? value[0] :
  Array.isArray(value?.result) ? value.result[0] : value?.result ?? value;
async function request(url, options = {}) {
  const response = await fetch(new URL(url, site), { ...options,
    headers: { ...headers, ...options.headers }, signal: AbortSignal.timeout(90000) });
  if (!response.ok) throw new Error(`${options.method ?? 'GET'} ${url}: HTTP ${response.status}`);
  return response.json();
}
async function native(id) {
  return request(`/wp-json/wp/v2/posts/${id}?context=edit&_fields=id,slug,date,status,yoast_head_json`);
}
async function seo(id) {
  return parseAbility(await request(`/wp-json/wp-abilities/v1/abilities/yoast-seo/get-post-seo-data/run?input[post_id]=${id}`));
}
const targets = plan.rows.filter((row) => row.needsUpdate).slice(offset);
let changed = 0;
let newlyNoindex = 0;
for (const row of targets) {
  if (changed >= limit) break;
  const current = await native(row.id);
  if (current.id !== row.id || current.slug !== row.slug || current.status !== 'publish' ||
      current.date?.slice(0, 10) >= plan.cutoffExclusive) {
    throw new Error(`Identity/date/status changed for ${row.id}; stopping`);
  }
  if (current.yoast_head_json?.robots?.index === 'noindex') {
    newlyNoindex++;
    continue;
  }
  if (current.yoast_head_json?.robots?.index !== 'index') {
    throw new Error(`Unknown current robots state for ${row.id}`);
  }
  const before = await seo(row.id);
  if (before.post_id !== row.id || before.post_status !== 'publish' || before.noindex === true) {
    throw new Error(`Yoast state disagrees with REST for ${row.id}`);
  }
  const saved = { savedAt: new Date().toISOString(), plan: planName, expected: row,
    wordpress: current, yoast: before };
  const backup = new URL(`before-${row.id}.json`, directory);
  try { await writeFile(backup, JSON.stringify(saved, null, 2), { flag: 'wx' }); }
  catch (error) {
    if (error.code === 'EEXIST') throw new Error(`Backup already exists for ${row.id}; inspect before retrying`);
    throw error;
  }
  const response = parseAbility(await request('/wp-json/wp-abilities/v1/abilities/yoast-seo/update-post-seo-data/run', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ input: { post_id: row.id, noindex: true } }),
  }));
  if (response.post_id !== row.id || response.noindex !== true) {
    throw new Error(`Yoast update response mismatch for ${row.id}`);
  }
  const [after, updated] = await Promise.all([seo(row.id), native(row.id)]);
  if (after.post_id !== row.id || after.noindex !== true ||
      updated.id !== row.id || updated.slug !== row.slug || updated.status !== 'publish' ||
      updated.date !== current.date || updated.yoast_head_json?.robots?.index !== 'noindex' ||
      updated.yoast_head_json?.robots?.follow !== current.yoast_head_json.robots.follow ||
      safeFields.some((field) => JSON.stringify(after[field]) !== JSON.stringify(before[field]))) {
    throw new Error(`SEO readback mismatch for ${row.id}; stopping (backup saved)`);
  }
  await writeFile(new URL(`verified-${row.id}.json`, directory), JSON.stringify({
    id: row.id, slug: row.slug, verifiedAt: new Date().toISOString(), noindex: true,
    follow: updated.yoast_head_json.robots.follow, otherSeoFieldsUnchanged: true,
  }, null, 2), { flag: 'wx' });
  changed++;
  console.log(`Verified ${changed}/${limit}: ${row.id} ${row.family}`);
}
console.log(JSON.stringify({ environment: 'staging', plan: planName, changed, newlyNoindex,
  offset, targetsFromOffset: targets.length, remainingFromOffset: targets.length - changed - newlyNoindex }, null, 2));
