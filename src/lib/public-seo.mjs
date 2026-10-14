import { columnistPostOlderThanTwelveMonths } from './columnist-noindex-cutoff.mjs';
import { columnistKeyForUri } from './columnist-profiles.mjs';

const productionOrigin = 'https://www.everytip.co.uk';
const stagingHost = 'wordpress-159231-2098144.cloudwaysapps.com';

function exactPath(value) {
  return typeof value === 'string' && value.startsWith('/') && !value.startsWith('//')
    && !/[?#\\]/.test(value) && !/\s/.test(value);
}

function canonicalPath(value) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || ![stagingHost, 'www.everytip.co.uk'].includes(url.hostname)
      || url.search || url.hash || !exactPath(url.pathname)) return null;
    return url.pathname;
  } catch {
    return null;
  }
}

/**
 * Resolve SEO for an exact public route. An indexable route is only allowed
 * when the live crawl confirms it and every supplied canonical is self-matching.
 * A staging-domain Yoast canonical is rewritten to the production host only
 * after that exact-path verification; an unknown/mismatched path fails closed.
 * @param {{ path: string, crawlRow: { path: string, canonical?: string, indexability?: string, robots?: string, title?: string, meta_description?: string }, yoast?: { canonical?: string, metaRobotsNoindex?: string, metaRobotsNofollow?: string, title?: string, metaDesc?: string } | null, publishedLocal?: string, now?: Date }} input
 */
export function resolvePublicSeo({ path, crawlRow, yoast = null, publishedLocal, now = new Date() }) {
  if (!exactPath(path)) throw new Error(`Invalid public SEO path: ${path}`);
  if (!crawlRow || crawlRow.path !== path) throw new Error(`Missing exact crawl row for ${path}`);
  const crawlCanonicalPath = crawlRow.canonical ? canonicalPath(crawlRow.canonical) : null;
  const yoastCanonicalPath = yoast?.canonical ? canonicalPath(yoast.canonical) : null;
  const canonicalMismatch = (crawlRow.canonical && crawlCanonicalPath !== path)
    || (yoast?.canonical && yoastCanonicalPath !== path);
  const crawlNoindex = crawlRow.indexability !== 'Indexable'
    || /\bnoindex\b/i.test(crawlRow.robots ?? '');
  const yoastNoindex = /^(?:noindex|true|1)$/i.test(String(yoast?.metaRobotsNoindex ?? '').trim());
  const nofollow = /\bnofollow\b/i.test(crawlRow.robots ?? '')
    || /^(?:nofollow|true|1)$/i.test(String(yoast?.metaRobotsNofollow ?? '').trim());
  const agedColumnist = Boolean(columnistKeyForUri(path))
    && columnistPostOlderThanTwelveMonths(publishedLocal, now);
  const index = !crawlNoindex && !yoastNoindex && !canonicalMismatch && !agedColumnist;
  const title = (yoast?.title || crawlRow.title || '').trim();
  const description = (yoast?.metaDesc || crawlRow.meta_description || '').trim();
  return {
    title,
    description,
    canonical: !canonicalMismatch && (crawlCanonicalPath === path || yoastCanonicalPath === path)
      ? `${productionOrigin}${path}` : null,
    robots: `${index ? 'index' : 'noindex'},${nofollow ? 'nofollow' : 'follow'}`,
    indexable: index,
    needsReview: Boolean(canonicalMismatch),
  };
}
