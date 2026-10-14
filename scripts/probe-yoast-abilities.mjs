// Read-only staging capability check; never prints application credentials.
const site = new URL(process.env.EVERYTIP_WP_BASE_URL ?? 'https://wordpress-159231-2098144.cloudwaysapps.com');
if (site.protocol !== 'https:' || site.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') {
  throw new Error('Only the named EveryTip staging host is permitted');
}
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
if (!username || !password) throw new Error('Missing staging REST credentials');
const headers = { Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}` };
const response = await fetch(new URL('/wp-json/wp-abilities/v1/abilities?category=yoast-seo', site), {
  headers,
  signal: AbortSignal.timeout(30000),
});
let names = [];
if (response.ok) {
  const payload = await response.json();
  names = Array.isArray(payload) ? payload.map((ability) => ability.name) :
    Object.values(payload).map((ability) => ability?.name).filter(Boolean);
}
console.log(JSON.stringify({ environment: 'staging', status: response.status,
  abilitiesAvailable: response.ok, yoastGet: names.includes('yoast-seo/get-post-seo-data'),
  yoastUpdate: names.includes('yoast-seo/update-post-seo-data'), names }, null, 2));
if ((process.argv.includes('--draft-90894') || process.argv.includes('--apply-noindex-90894')) && names.includes('yoast-seo/get-post-seo-data')) {
  const path = '/wp-json/wp-abilities/v1/abilities/yoast-seo/get-post-seo-data/run?input[post_id]=90894';
  const read = await fetch(new URL(path, site), { headers, signal: AbortSignal.timeout(30000) });
  const payload = await read.json();
  const data = Array.isArray(payload) ? payload[0] : Array.isArray(payload?.result) ? payload.result[0] : payload;
  console.log(JSON.stringify({ stagingDraft: 90894, readStatus: read.status,
    postId: data?.post_id ?? null, postStatus: data?.post_status ?? null,
    seoTitle: data?.seo_title ?? null, metaDescription: data?.meta_description ?? null,
    noindex: data?.noindex ?? null, canonical: data?.canonical ?? null }, null, 2));
  const native = await fetch(new URL('/wp-json/wp/v2/pages/90894?context=edit&_fields=id,status,meta', site), {
    headers, signal: AbortSignal.timeout(30000),
  });
  const nativePage = native.ok ? await native.json() : null;
  console.log(JSON.stringify({ nativeRestStatus: native.status, nativeId: nativePage?.id ?? null,
    yoastTitleExposed: Object.hasOwn(nativePage?.meta ?? {}, '_yoast_wpseo_title'),
    yoastDescriptionExposed: Object.hasOwn(nativePage?.meta ?? {}, '_yoast_wpseo_metadesc') }, null, 2));
  if (process.argv.includes('--apply-noindex-90894')) {
    if (read.status !== 200 || data?.post_id !== 90894 || data.post_status !== 'draft' ||
        !names.includes('yoast-seo/update-post-seo-data')) {
      throw new Error('Expected editable private staging draft and Yoast update ability');
    }
    const before = { seo_title: data.seo_title, meta_description: data.meta_description, canonical: data.canonical };
    const update = await fetch(new URL('/wp-json/wp-abilities/v1/abilities/yoast-seo/update-post-seo-data/run', site), {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: { post_id: 90894, noindex: true } }), signal: AbortSignal.timeout(30000),
    });
    if (!update.ok) throw new Error(`Yoast staging noindex update HTTP ${update.status}`);
    const updated = await update.json();
    const result = updated?.result ?? updated;
    if (result?.post_id !== 90894 || result.noindex !== true ||
        Object.entries(before).some(([field, value]) => result[field] !== value)) {
      throw new Error('Yoast ability update did not return the expected isolated noindex result');
    }
    console.log(JSON.stringify({ stagingDraft: 90894, updatedField: 'noindex', verified: true,
      otherFieldsUnchanged: true }, null, 2));
  }
}
