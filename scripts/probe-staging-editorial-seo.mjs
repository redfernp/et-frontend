// Staging-only probe for the scoped Yoast editorial endpoint. No credentials logged.
const site = new URL(process.env.EVERYTIP_WP_BASE_URL ?? 'https://wordpress-159231-2098144.cloudwaysapps.com');
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') {
  throw new Error('Only the named EveryTip staging host is permitted');
}
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!username || !password) throw new Error('Missing staging REST credentials');
const auth = { Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}` };
const endpoint = new URL('/wp-json/everytip/v1/editorial-seo/90894', site);
const request = async (method, body, authenticated = true) => {
  const response = await fetch(endpoint, {
    method,
    headers: { ...(authenticated ? auth : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(30000),
  });
  return { status: response.status, data: await response.json() };
};
const initial = await request('GET');
if (initial.status !== 200 || initial.data.id !== 90894 || initial.data.status !== 'draft' ||
    initial.data.post_type !== 'page' || !/^[0-9a-f]{64}$/.test(initial.data.revision_token)) {
  throw new Error(`Unexpected staging draft SEO response (HTTP ${initial.status})`);
}
console.log(JSON.stringify({ phase: 'read', stagingDraft: 90894, status: initial.status,
  postStatus: initial.data.status, fields: initial.data.fields }, null, 2));
if (!process.argv.includes('--apply-draft-90894')) process.exit(0);

const blocked = await request('POST', {
  expected_revision: initial.data.revision_token,
  fields: { canonical: 'https://www.everytip.co.uk/' },
});
if (blocked.status !== 400) throw new Error(`Advanced SEO field was not rejected (HTTP ${blocked.status})`);
const desired = {
  seo_title: 'STAGING ONLY — High-stakes roundup editorial draft',
  meta_description: 'Private EveryTip migration draft for editorial review. This preview is not ready for publication.',
  focus_keyphrase: '',
};
const updated = await request('POST', { expected_revision: initial.data.revision_token, fields: desired });
if (updated.status !== 200 || updated.data.id !== 90894 || updated.data.status !== 'draft' ||
    Object.entries(desired).some(([key, value]) => updated.data.fields[key] !== value)) {
  throw new Error(`SEO update failed or returned unexpected fields (HTTP ${updated.status})`);
}
const stale = await request('POST', {
  expected_revision: initial.data.revision_token,
  fields: { seo_title: 'This stale write must be rejected' },
});
if (stale.status !== 409) throw new Error(`Stale write was not rejected (HTTP ${stale.status})`);
const readback = await request('GET');
if (readback.status !== 200 || readback.data.revision_token !== updated.data.revision_token ||
    Object.entries(desired).some(([key, value]) => readback.data.fields[key] !== value)) {
  throw new Error('Independent SEO readback did not match the write');
}
const anonymous = await request('GET', undefined, false);
if (![401, 403].includes(anonymous.status)) throw new Error(`Anonymous read not denied (HTTP ${anonymous.status})`);
console.log(JSON.stringify({ phase: 'verified', stagingDraft: 90894, status: readback.data.status,
  seoTitle: readback.data.fields.seo_title, metaDescription: readback.data.fields.meta_description,
  advancedFieldRejected: true, staleWriteRejected: true, anonymousReadDenied: true }, null, 2));
