# EveryTip crawl-to-template mapping — first pass

Source: `C:\Users\jpred\Downloads\internal_html.csv`, a Screaming Frog internal HTML crawl dated 13 September 2026. Row-level decisions are in [everytip-template-map-2026-09-30.csv](everytip-template-map-2026-09-30.csv). Recreate it with `python scripts/map_crawl_templates.py INPUT.csv OUTPUT.csv` from the `et-astro` directory.

This is a **provisional routing and design inventory**, not a claim that the current Beaver Builder/Thrive modules or WordPress post types have been verified for each URL. It makes no WordPress changes.

Six high-priority pages have since been checked on staging; their confirmed builder, WordPress ID, sidebar setting, and table sources are recorded in [the pilot audit](everytip-template-pilot-audit-2026-09-30.md) and corresponding CSV columns. The remaining URL classifications are still crawl-derived.

## Scope and SEO guardrails

- 1,091 crawled URL rows: 1,057 returned 200, 28 returned 301, and 6 returned 404.
- Of the 200s, 501 were indexable, 555 were `noindex`, and one was canonicalised. Retain these differences until an explicit SEO review changes them.
- One row is a query-string variant, not a second page. The 28 redirects are route rules, not Astro content pages. The 404s require an inbound-link check before deciding whether to redirect or leave missing.
- 134 successful pages lack a detectable `wp/v2/posts` or `wp/v2/pages` link header in this crawl. That does **not** mean they are not WordPress content; their object type/ID needs a staging REST or admin check.
- 92 template assignments are marked low confidence. The CSV is the work queue for resolving them.
- Preserve the exact legacy path, `.html` suffix, canonical, title/meta, indexability, and internal links during initial migration unless a separate redirect/consolidation decision is approved.

## Proposed Astro template families

| Astro family | Crawl rows | Primary source and editable content | Key layout/modules |
| --- | ---: | --- | --- |
| `Home` | 1 | WordPress page and ACF offer placements | Current ladder, sidebar, latest tips/news |
| `Article` | 788 | WordPress posts via WPGraphQL; REST for automated publishing | Dated predictions/news, author/date, inline offer slot, related content |
| `RoundupGuide` | 26 | WordPress editorial copy + ordered ACF bookmaker/offer relationships | Existing ranked/comparison layout, editable sections, central offer terms |
| `Review` | 28 | WordPress review content + bookmaker/offer records | Review header, pros/cons, ratings where present, offer CTA |
| `OfferExplainer` | 26 | WordPress page content + central ACF offer | Eligibility, offer details, exact/full and approved compact terms |
| `OfferIndex` | 1 | ACF offer placements | Filtered/ordered live offers |
| `TipsHub` | 71 | WordPress editorial copy + canonical tips dataset | Today’s table, filters, previous tips accordion/archive |
| `RacecourseGuide` | 45 | WordPress page copy + course metadata + same tips dataset | Course-only tips, past course tips, current sidebar and guide content |
| `RacecourseIndex` | 1 | WordPress/editorial course list | Course navigation |
| `Guide` | 22 | WordPress page content/approved content sections | Evergreen editorial content and related links |
| `Directory` | 6 | WordPress directory records/editorial intro | Tipster listings or comparison rows |
| `Archive` | 33 | WordPress taxonomy/author/archive metadata | Paginated listings; robots differ by archive |
| `Utility` | 6 | WordPress page content | About, policies, contact, HTML sitemap as appropriate |
| `NewsletterLanding` | 2 | WordPress editorial copy + ConvertBox | Signup/thank-you content |
| No standalone page | 35 | Redirect policy, 404 audit, canonical query variant | 28 redirects, 6 missing pages, 1 query variant |

These are component families, not 17 wholly separate visual systems. Shared shell components should reproduce the existing header, navigation, right-hand offer/sidebar modules, footer, typography, and mobile behavior. Each family can have controlled variants; for example `Review` includes bookmaker and product reviews, and `TipsHub` includes racing, football, and named-tipster pages. Preserve the existing page appearance first; rationalize designs only after side-by-side QA.

## Pilot pages to inspect before building fields/templates

1. Homepage: `/` — Thrive-built ladder and sidebar composition.
2. Roundups: `/low-or-no-minimum-deposit-betting-sites.html`, `/best-paypal-betting-sites.html`, `/best-odds-guaranteed-bookies.html`, `/best-cash-out-betting-sites-uk-ire` — staging pilot completed; use its field/component blueprint and capture mobile baselines.
3. Tips: `/value-bet-tips-dark-horses.html` and `/racecourses/kempton-racing-tips` — staging source/filter pilot completed; implement one-record-to-many-pages display and the historical archive.
4. Offers: `/bookie-free-bets-bonus-offers`, `/latest-betting-offers`, and one bookmaker offer explainer — central ACF offer/terms source.
5. Reviews: `/bet365-review` and `/betfair-exchange-review.html` — distinguish bookmaker review from other product reviews.
6. Editorial: one indexable dated prediction, one noindex older prediction, and one automated daily post — same Article shell but different publishing/SEO behavior.
7. Archives: `/blog`, `/author/jnewsome`, and a category hub — pagination and robots checks.

## Editing/data boundaries

- WordPress remains the editorial CMS. WPGraphQL supplies published content to Astro; authenticated REST handles automated post/tip imports.
- ACF Pro central offer/bookmaker records supply reusable facts, affiliate destinations, and **approved** full/compact terms. Roundups and articles reference records rather than duplicating terms.
- ACF controls page-specific editorial sections and ordering; Astro controls markup, responsive layout, sidebars, and reusable cards. Do not put arbitrary Beaver/Thrive HTML into the permanent content model.
- The horse tips table should be a separate structured dataset, not an ever-growing ACF repeater or Ninja Tables HTML blob. One tip record should feed the Dark Horse hub and filtered racecourse pages. Store publication snapshot and subsequent outcome separately; render recent history in accessible accordions with paginated older archive pages. A WordPress custom table plus a small import/API/GraphQL plugin is the simplest first option; Cloudflare D1 is not required solely for this dataset.
- Continue displaying the current WordPress/Ninja Tables output until the replacement tips import, filters, archives, and results have been checked side by side.

## Required second-pass audit

Use staging to enrich the CSV with actual WordPress ID/type, taxonomy, builder metadata, ACF field availability, Ninja Tables shortcode/table IDs, live offer blocks, and a screenshot/section inventory for the pilot pages. Resolve the 92 low-confidence rows and 134 missing object IDs. Prioritize the 501 indexable pages and high-value money/tips pages; still preserve the existing `noindex` policy for older posts and archives. No mass content conversion or redirect decisions should be made from URL names alone.
