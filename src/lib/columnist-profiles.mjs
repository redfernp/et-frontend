const endpoint = process.env.WPGRAPHQL_ENDPOINT || 'https://wordpress-159231-2098144.cloudwaysapps.com/graphql';
const mediaHost = 'https://wordpress-159231-2098144.cloudwaysapps.com';
const liveHost = 'https://www.everytip.co.uk';

const query = `query EveryTipColumnists {
  seymour: user(id: "seymourb", idType: SLUG) {
    databaseId name slug description uri avatar(size: 300) { url width height }
  }
  john: user(id: "jnewsome", idType: SLUG) {
    databaseId name slug description uri avatar(size: 300) { url width height }
  }
  editor: user(id: "erick", idType: SLUG) {
    databaseId name slug uri avatar(size: 300) { url width height }
  }
}`;

export function columnistKeyForUri(uri) {
  // Historical column slugs include Saturday/Sunday variants, tournament
  // columns and duplicate `-2` suffixes. The author suffix is the stable
  // identifier across those exact legacy paths.
  if (/^\/[^/]+-seymour-biz(?:-lucky-15|-\d+)?\.html$/.test(uri)) return 'seymour';
  if (/^\/[^/]+-john-newsome(?:-\d+)?\.html$/.test(uri)) return 'john';
  return null;
}

export const legacyColumnistPortraitPaths = {
  seymour: ['/wp-content/uploads/2019/03/saturday-horse-racing-tips-and-previews-from-expert-tipster-seymour-biz-on-everytip.png'],
  john: ['/wp-content/uploads/2017/11/John-Newsome-Football-Betting-Tips-everytip.png'],
};

export function normalizeColumnist(key, node) {
  const expected = key === 'seymour' ? { slug: 'seymourb', name: 'Seymour Biz', role: 'Saturday horse racing columnist' }
    : { slug: 'jnewsome', name: 'John Newsome', role: 'Premier League columnist' };
  if (node?.slug !== expected.slug || node.name !== expected.name || !node.description?.trim()) {
    throw new Error(`Missing or unexpected ${key} WordPress user profile`);
  }
  const avatar = new URL(node.avatar?.url ?? '');
  if (avatar.origin !== mediaHost || !avatar.pathname.startsWith('/wp-content/uploads/') || !/\.(png|jpe?g|webp)$/i.test(avatar.pathname)) {
    throw new Error(`Unexpected ${key} profile image URL`);
  }
  const image = `${liveHost}${avatar.pathname}`;
  return { id: node.databaseId, name: node.name, slug: node.slug, bio: node.description.trim(), role: expected.role, uri: node.uri, image };
}

export function normalizeEditor(node) {
  if (node?.slug !== 'erick' || node.name !== 'Everytip') throw new Error('Missing or unexpected EveryTip editor profile');
  const avatar = new URL(node.avatar?.url ?? '');
  if (avatar.origin !== mediaHost || !avatar.pathname.startsWith('/wp-content/uploads/') || !/\.(png|jpe?g|webp)$/i.test(avatar.pathname)) {
    throw new Error('Unexpected EveryTip editor logo URL');
  }
  return { id: node.databaseId, name: 'EveryTip Editorial Team', slug: node.slug, uri: node.uri, image: `${liveHost}${avatar.pathname}` };
}

// Offline QA only: dated, shortened author-box copy and known colour portrait paths.
// Production builds still read the current WordPress user profiles below.
export const offlinePreviewProfiles = {
  seymour: {
    id: 0, name: 'Seymour Biz', slug: 'seymourb', uri: '/author/seymourb',
    role: 'Saturday horse racing columnist',
    bio: 'Seymour writes Saturday horse-racing previews, Lucky 15 selections and analysis of major UK meetings and festivals.',
    image: `${liveHost}/wp-content/uploads/2025/06/Seymour-Biz-Horse-Racing-Feature-Writer-100x100.png`,
  },
  john: {
    id: 0, name: 'John Newsome', slug: 'jnewsome', uri: '/author/jnewsome',
    role: 'Premier League columnist',
    bio: 'John writes weekly Premier League previews and correct-score analysis, drawing on team form and match context.',
    image: `${liveHost}/wp-content/uploads/2025/06/John-Newsome-Everytip-Football-Feature-Writer-100x100.png`,
  },
  editor: {
    id: 0, name: 'EveryTip Editorial Team', slug: 'erick', uri: '/author/erick',
    image: `${liveHost}/wp-content/uploads/2025/06/cropped-ET.jpg`,
  },
};

export async function getColumnistProfiles() {
  if (process.env.MIGRATION_OFFLINE_SNAPSHOT === '1') return offlinePreviewProfiles;
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ query }),
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Columnist WPGraphQL HTTP ${response.status}`);
  const result = await response.json();
  if (result.errors?.length) throw new Error(result.errors.map((error) => error.message).join('; '));
  return { seymour: normalizeColumnist('seymour', result.data?.seymour), john: normalizeColumnist('john', result.data?.john), editor: normalizeEditor(result.data?.editor) };
}
