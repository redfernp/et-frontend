# Homepage CMS separation and draft — 13 October 2026

This is an unpublished staging editing proof, not a homepage replacement or a release approval.

## Fresh source map

- Exact homepage page **16**, slug `home`, published on both live and staging, modified `2026-09-25T10:11:33`. Their rendered visible text was identical (SHA-256 `7b5930bb9926e58b38903ea1ddca4daa15d2635d24ee28a13563c42dc7b9285b`). Staging raw body was 31,575 characters of classic HTML, without Gutenberg markers or shortcodes.
- The body contains 94 links, 17 images and 16 `/go/`/commercial-style destinations. It embeds the eight “Today’s Top Offers” cards **twice** (main ladder and sidebar), plus static feature articles, latest tips, bookmaker reviews, guides, recommended bookies and sidebar content. These are not evergreen prose and must not be copied into editor blocks or published as stale facts.
- The eight paragraphs between “Free Betting Tips Published Every Day On Every Tip!” and “Latest Free Betting Tips Published On Every Tip!” are the candidate editorial region. Most assert current update cadence, named tip providers, geographic coverage, volume or quality. They need owner verification before being treated as live claims. The seven ACF partner records versus eight homepage offer headings also needs a deliberate mapping; do not infer an eighth approved partner.
- Menus are separate CMS navigation data, not part of the homepage body. The offer ladder should render central ACF Pro offer references with verified compact terms and fail-closed links; latest posts/reviews/guides should query published WPGraphQL records and only link to built exact routes; the sidebar should reuse the approved branded-offer component. Daily racing/tips tables belong to typed feeds, not hard-coded homepage HTML.

## Staging-only write and readback

- Created unpublished Gutenberg **page 91013**, slug `migration-draft-home-evergreen-editorial-20261013`, with one heading and one short introductory paragraph. The paragraph is a conservative paraphrase of the source's sport list. It omits daily-frequency, rankings, named contributors, affiliate claims, offer amounts, CTAs, news cards and all dynamic modules. It is intentionally **not** a complete homepage.
- Before creation, saved page 16's full raw/rendered content, meta and Yoast JSON to ignored local `data/raw/staging-home-original-16-2026-10-13.json` using an exclusive write. Authenticated readback confirmed the new draft's ID/slug/status and two core Gutenberg blocks byte-for-byte. Independent readback confirmed published page 16's status/slug/modified time, raw hash and Yoast JSON unchanged.
- Anonymous REST returned **401** for draft 91013 and its public path returned **404**. Authenticated staging WPGraphQL returned page 91013 with `status: draft` and the new intro content. Its computed Yoast metadata currently reports `index,follow`; it is not public while a draft, and this auto-generated SEO is **not** approved for launch.
- No live WordPress write, published staging-homepage edit, offer/CTA update, or deployment occurred.

## Next content-model step

Keep core Gutenberg blocks for the short editorial intro and noncommercial explanatory prose. Define typed ACF section references for the offer ladder, secondary branded sidebar, and curated featured story slots rather than duplicating offer terms in page HTML. Source the main and footer menus from WordPress; source latest published posts, reviews and guides from WPGraphQL with exact-route availability and freshness guards. Preserve page 16's intended SEO title/description only after the full replacement passes mobile/desktop, accessibility, legal-footer, route and content-parity checks. Until then the published homepage remains untouched.

Read-only audit: `node --env-file=.env.local scripts/audit-homepage-cms-draft.mjs`. One-off draft writer: `node --env-file=.env.local scripts/create-staging-home-editorial-draft.mjs --apply`; do **not** rerun because the unique slug and exclusive backup intentionally fail closed.
