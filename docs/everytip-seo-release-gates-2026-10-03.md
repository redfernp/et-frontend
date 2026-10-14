# EveryTip exact-URL SEO release gates — 3 October 2026

This is a **local build audit**, not a launch approval. No live or staging WordPress content is changed by these commands.

## Two distinct checks

- `node scripts/audit-launch-readiness.mjs --preview-strict` checks that any built preview route remains `noindex` and contains no staging-host references. It does **not** imply the migration is launch-ready. Missing exact assets are reported but do not fail this preview-safety check.
- `node scripts/audit-launch-readiness.mjs --strict` is the public launch gate. It fails if a live 200 URL is missing, a preview marker survives, live robots or canonical intent differs, the staging hostname appears, an existing source meta description is lost, or the title is empty.
- `npm run audit:uncrawled-seo` checks the additional live-200 URLs that the crawl missed for blank titles, accidental indexability, lost source descriptions, staging-host leakage and active `/go/` links. It reports their missing assets but allows them during preview QA. This is still **not** a full launch SEO gate for those pages.

The 30 September crawl has **1,057 live HTTP-200 rows but only 1,056 distinct paths**. A separate read-only live HEAD pass found **158 additional published CMS paths returning 200** that the crawl entirely missed, plus two old paths returning 301. Thus the broader known live-200 universe is **1,214 distinct URLs**. The current local build has **1,180** inert noindex assets and **34** missing: 18 from the original crawl and 16 uncrawled builder/empty-body pages. The existing `audit-launch-readiness.mjs` still audits only the original crawl and reports **1,039/1,057 rows**, 18 missing, 485 robots differences and 486 canonical differences. Use `npm run audit:uncrawled` alongside it for the broader denominator until a unified launch gate is built. None of these preview assets is public-launch-approved.

The crawl audit also reports 113 missing descriptions; all 113 lack a source description in this snapshot, so they are an editorial SEO backlog, not a migration regression. The added uncrawled SEO check found and fixed one real description regression on John Newsome's September 2026 article; its current local output has **zero** description regressions. Losing a description that *does* exist in WordPress fails the launch gate.

## Highest-risk blockers before a public cutover

1. Replace every preview asset at the exact public URL with a verified production template. Do not equate URL coverage with content/SEO parity.
2. Resolve the **34 distinct missing known live-200 assets**: the owner is reviewing the original 18, while eight additional source-indexable builder pages and eight source-noindex utility/test pages need separate treatment. Choose exact 200 pages or individually reviewed redirect/retirement decisions. No blanket `.html` redirect.
3. For every indexable route, emit its verified production-domain canonical at the **same exact path**, its live/Yoast robots intent, and its existing title/description. A staging canonical is rewritten only when its path matches the verified live path. Mismatches fail closed as noindex for review.
4. Preserve noindex on live noindex posts and archive pagination, while keeping individual indexable articles indexable. The PPC Bet365 variant must not be conflated with `/bet365-review`; URL slug is identity.
5. Extend the strict launch gate to the 158 additional verified live-200 paths, then run `npm run build`, both audits, and a rendered-URL crawl on a review deployment. Inspect status, canonical, robots, title and description, plus internal links and sitemap entries. Re-run after any WordPress content sync or route change. The current publicly reachable workers.dev preview is noindex but not access-controlled, and is an older dated bundle; never treat it as an approval surface for active offers.

Do not remove the preview banner/noindex merely to make the launch gate pass. Commercial offer terms, destinations and historical claims remain a separate editorial verification gate.
