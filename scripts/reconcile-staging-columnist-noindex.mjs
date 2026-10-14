// Read-only reconciliation of any timed-out update, then write a local verification receipt.
import { readdir, readFile, writeFile } from 'node:fs/promises';
const site = new URL(process.env.EVERYTIP_WP_BASE_URL ?? '');
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') {
  throw new Error('Only EveryTip staging is permitted');
}
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!username || !password) throw new Error('Missing staging REST credentials');
const headers = { Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}` };
const directory = new URL('../artifacts/staging-columnist-noindex/', import.meta.url);
const names = await readdir(directory);
const safeFields = ['seo_title', 'meta_description', 'focus_keyphrase', 'canonical', 'nofollow',
  'noimageindex', 'noarchive', 'nosnippet', 'open_graph_title', 'open_graph_description',
  'twitter_title', 'twitter_description', 'schema_page_type', 'schema_article_type'];
const parseAbility = (value) => Array.isArray(value) ? value[0] :
  Array.isArray(value?.result) ? value.result[0] : value?.result ?? value;
for (const name of names.filter((name) => /^before-\d+\.json$/.test(name))) {
  const id = Number(name.match(/\d+/)[0]);
  if (names.includes(`verified-${id}.json`)) continue;
  const before = JSON.parse(await readFile(new URL(name, directory), 'utf8'));
  const [wpResponse, seoResponse] = await Promise.all([
    fetch(new URL(`/wp-json/wp/v2/posts/${id}?context=edit&_fields=id,slug,date,status,yoast_head_json`, site),
      { headers, signal: AbortSignal.timeout(90000) }),
    fetch(new URL(`/wp-json/wp-abilities/v1/abilities/yoast-seo/get-post-seo-data/run?input[post_id]=${id}`, site),
      { headers, signal: AbortSignal.timeout(90000) }),
  ]);
  if (!wpResponse.ok || !seoResponse.ok) throw new Error(`Readback HTTP failure for ${id}`);
  const wp = await wpResponse.json();
  const after = parseAbility(await seoResponse.json());
  if (wp.id !== id || wp.slug !== before.wordpress.slug || wp.status !== before.wordpress.status ||
      wp.date !== before.wordpress.date || wp.yoast_head_json?.robots?.index !== 'noindex' ||
      wp.yoast_head_json?.robots?.follow !== before.wordpress.yoast_head_json?.robots?.follow ||
      after.post_id !== id || after.noindex !== true ||
      safeFields.some((field) => JSON.stringify(after[field]) !== JSON.stringify(before.yoast[field]))) {
    throw new Error(`Manual review required: staging readback mismatch for ${id}`);
  }
  await writeFile(new URL(`verified-${id}.json`, directory), JSON.stringify({
    id, slug: wp.slug, verifiedAt: new Date().toISOString(), noindex: true,
    follow: wp.yoast_head_json.robots.follow, otherSeoFieldsUnchanged: true,
    recoveredAfterTimeout: true,
  }, null, 2), { flag: 'wx' });
  console.log(`Reconciled ${id}: noindex,follow; other SEO fields unchanged`);
}
