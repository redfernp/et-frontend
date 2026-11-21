// WordPress drafts for a partner preview build (the partner's review, press release and so on).
// They stay drafts in WordPress until the partner has paid, so normal builds never see them and
// the live worker's WordPress fallback cannot serve them. Only a preview build that sets
// PARTNER_DRAFTS (a JSON list of {"id": 123, "path": "/pricedup-review"}) and a WordPress
// application password reads them, through the REST API, and adds them as ordinary records.
// Every draft is noindex. Run by scripts/partner-preview.mjs; never set in CI.
const env = typeof process !== 'undefined' ? process.env : {};

export async function readPartnerDrafts(existingPaths) {
  const list = JSON.parse(env.PARTNER_DRAFTS || '[]');
  if (!list.length) return [];
  const base = String(env.PARTNER_WP_BASE_URL || '').replace(/\/$/, '');
  if (!base || !env.PARTNER_WP_USERNAME || !env.PARTNER_WP_APP_PASSWORD) throw new Error('PARTNER_DRAFTS needs PARTNER_WP_BASE_URL, PARTNER_WP_USERNAME and PARTNER_WP_APP_PASSWORD');
  const auth = 'Basic ' + Buffer.from(`${env.PARTNER_WP_USERNAME}:${env.PARTNER_WP_APP_PASSWORD.replace(/\s/g, '')}`).toString('base64');
  const get = async path => {
    const response = await fetch(`${base}/wp-json/wp/v2${path}`, { headers: { Authorization: auth, 'User-Agent': 'everytip-partner-preview/1.0' }, signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`Partner draft ${path}: HTTP ${response.status}`);
    return response.json();
  };
  const records = [];
  for (const { id, path, type = 'posts' } of list) {
    if (!/^\/[a-z0-9-]+$/.test(path)) throw new Error(`Partner draft ${id}: path must look like /some-slug, got ${path}`);
    if (existingPaths.has(path)) throw new Error(`Partner draft ${id}: ${path} is already a published page`);
    const post = await get(`/${type}/${id}?context=edit`);
    if (post.status === 'publish') throw new Error(`Partner draft ${id} is already published; remove it from the drafts list`);
    const user = post.author ? await get(`/users/${post.author}?context=edit`).catch(() => null) : null;
    const title = post.title?.raw || post.title?.rendered || '';
    records.push({
      kind: type, databaseId: post.id, uri: path, status: 'publish', title,
      content: post.content?.rendered ?? '', date: post.date, modified: post.modified,
      author: { node: user ? { name: user.name, description: user.description ?? '', uri: `/author/${user.slug}/`, slug: user.slug, avatar: { url: user.avatar_urls?.['96'] ?? '' } } : null },
      seo: { title: `${title} - EveryTip`, metaDesc: post.excerpt?.raw ?? '', canonical: '', metaRobotsNoindex: 'noindex', metaRobotsNofollow: 'nofollow',
        schema: { raw: '' }, opengraphTitle: title, opengraphDescription: '', opengraphImage: null },
    });
    existingPaths.add(path);
    console.log(`Partner preview: draft ${id} added at ${path}`);
  }
  return records;
}
