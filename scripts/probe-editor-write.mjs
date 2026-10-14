// Staging-only REST write probe against the disposable Gutenberg test draft.
// Run with: node --env-file=.env.local scripts/probe-editor-write.mjs
// Never print credentials or post content.
const base = process.env.EVERYTIP_WP_BASE_URL;
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
const postId = 90857;
const marker = '<!-- everytip-rest-write-probe-2026-10-02 -->';

if (!base || !username || !password) throw new Error('Missing staging REST credentials');
const site = new URL(base);
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') {
  throw new Error('Write probe is restricted to EveryTip staging');
}

const endpoint = new URL(`/wp-json/wp/v2/posts/${postId}`, site);
const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
const headers = { Authorization: authorization };
const read = async () => {
  const response = await fetch(new URL(`${endpoint.pathname}?context=edit`, site), {
    headers,
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Read failed: HTTP ${response.status}`);
  return response.json();
};

const before = await read();
if (before.id !== postId || before.status !== 'draft' ||
    before.slug !== 'staging-only-gutenberg-article-editing-test') {
  throw new Error('Unexpected post identity or status; refusing write');
}
const content = before.content?.raw;
if (typeof content !== 'string') throw new Error('Editable post content unavailable');
if (!content.includes(marker)) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: `${content}\n\n${marker}` }),
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`Write failed: HTTP ${response.status}`);
}
const after = await read();
const verified = after.status === 'draft' && after.content?.raw?.includes(marker);
console.log(JSON.stringify({ environment: 'staging', postId, status: after.status, restWriteVerified: verified }));
if (!verified) process.exitCode = 1;
