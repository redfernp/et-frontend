// A guarded, staging-only client for Codex/Eric editorial SEO changes.
// Usage: node --env-file=.env.local scripts/staging-editorial-seo.mjs 90894
//        node --env-file=.env.local scripts/staging-editorial-seo.mjs 90894 edit.json [--apply]
// edit.json: {"post_id":90894,"expected_revision":"<from read>","fields":{"seo_title":"..."}}
import { readFile } from 'node:fs/promises';

const site = new URL(process.env.EVERYTIP_WP_BASE_URL ?? 'https://wordpress-159231-2098144.cloudwaysapps.com');
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') {
  throw new Error('Only the named EveryTip staging host is permitted');
}
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!username || !password) throw new Error('Missing staging REST credentials');
const id = Number(process.argv[2]);
if (!Number.isSafeInteger(id) || id < 1) throw new Error('Provide a numeric WordPress post or page ID');
const file = process.argv[3]?.startsWith('--') ? undefined : process.argv[3];
const apply = process.argv.includes('--apply');
const allowPublished = process.argv.includes('--allow-published');
if (apply && !file) throw new Error('--apply requires a reviewed JSON edit file');
const url = new URL(`/wp-json/everytip/v1/editorial-seo/${id}`, site);
const headers = { Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}` };
const call = async (method, body) => {
  const response = await fetch(url, {
    method,
    headers: { ...headers, ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`Staging SEO ${method} HTTP ${response.status}: ${data.code ?? 'unknown error'}`);
  return data;
};
const current = await call('GET');
if (current.id !== id || !['post', 'page'].includes(current.post_type)) {
  throw new Error('SEO endpoint returned an unexpected identity');
}
if (!file) {
  console.log(JSON.stringify({ environment: 'staging', ...current }, null, 2));
} else {
const input = JSON.parse(await readFile(file, 'utf8'));
if (input.post_id !== id || typeof input.expected_revision !== 'string' ||
    input.expected_revision !== current.revision_token || !input.fields ||
    typeof input.fields !== 'object' || Array.isArray(input.fields)) {
  throw new Error('Edit file ID/revision/fields do not match the latest staging read');
}
const allowed = new Set(['seo_title', 'meta_description', 'focus_keyphrase']);
if (!Object.keys(input.fields).length || Object.entries(input.fields).some(([key, value]) => !allowed.has(key) || typeof value !== 'string')) {
  throw new Error('Only nonempty SEO title, description and focus-keyphrase string fields are allowed');
}
if (current.status !== 'draft' && apply && !allowPublished) {
  throw new Error('Refusing to edit non-draft staging content without --allow-published');
}
console.log(JSON.stringify({ environment: 'staging', postId: id, postType: current.post_type,
  postStatus: current.status, before: current.fields, proposed: input.fields, action: apply ? 'apply' : 'dry-run' }, null, 2));
if (apply) {
  const updated = await call('POST', { expected_revision: current.revision_token, fields: input.fields });
  const readback = await call('GET');
  if (readback.id !== id || readback.status !== current.status ||
      readback.revision_token !== updated.revision_token ||
      Object.entries(input.fields).some(([key, value]) => readback.fields[key] !== value)) {
    throw new Error('Independent SEO readback failed');
  }
  console.log(JSON.stringify({ environment: 'staging', postId: id, verified: true,
    status: readback.status, fields: readback.fields }, null, 2));
}
}
