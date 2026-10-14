# EveryTip migration progress — 4 October 2026

This is local preview work only. No staging/live WordPress write, Cloudflare upload, DNS change or commercial CTA activation occurred today.

## Baseline and current coverage

The 3 October audit established **1,214 distinct known live HTTP-200 URLs**: 1,056 unique paths in the dated 1,057-row crawl plus 158 published CMS paths omitted from that crawl and verified live-200 separately. At today's start, **1,180/1,214** had exact-path local noindex assets; **34** were missing (18 owner-reviewed crawl exceptions and 16 additional builder/empty-source paths).

Four additional source-indexable bookmaker review URLs now have exact-path, source-locked **partial editorial previews**: `/10bet-review`, `/betwright-review`, `/netbet-review`, and `/spreadex-review`. Their dated WordPress source IDs and SHA-256 digests are fixed in the extractor, so a later source change fails closed. The extraction keeps “what to watch”, safety, service, markets, odds, in-play, mobile and streaming text, but withholds welcome-bonus and promotions sections, old builder CSS/markup, links, scores and commercial CTAs. These are **not complete reviews or launch-approved replacements**; factual claims and licensing still require editorial verification.

Current unique live-200 local coverage is **1,184/1,214 (97.5%)**, leaving **30**: the owner's **18** and **12** additional. Of those 12, four have source `index` (`/bet365-review-redesign`, `/quinnbet-extra-places-offer`, `/william-hill-free-or-4-explained`, `/fafabet-bonus-code`) and eight are source-noindex utility/test/empty-body paths. The old 1,057-row crawl audit remains **1,039/1,057**, because the new four were outside the crawl. URL coverage must not be confused with launch readiness; safe-launch work remains roughly **50%** (45–60% range).

## Checks

- Staging-connected local build: **1,235 Astro pages**, **977 normalized `.html` routes**; changed published CMS records still read fresh under the opt-in gate.
- Astro check: **0 diagnostics** across 244 files; content tests **108/108** and route tests **10/10** passing.
- Uncrawled SEO preview gate: **146/158** exact assets, **12** missing, zero blank titles, accidentally indexable previews, lost source descriptions, staging-host strings or active affiliate links.
- Local Chrome at 375px and 1365px: all four new review previews have no document-width overflow, retain safer-gambling footer links, and expose zero active affiliate links.
- Local Cloudflare package: **1,184** inspected inert noindex HTML files; **21,083** internal links, zero broken targets. **No upload.** The public workers.dev preview is still an earlier dated build.

Next local priority is source-locked extraction/layout for the remaining four indexable uncrawled paths, separating review or evergreen explanation from obsolete offer copy. The eight source-noindex utility paths need individual keep/redirect/retire decisions, not automatic content publication. Separately, production SEO parity, central offer approval, current CMS freshness, editorial review and release QA remain open gates.

## 14:36 Europe/Rome follow-up

The fifth indexable uncrawled page, `/bet365-review-redesign`, now has the same source-locked **partial review** treatment. Its old inline-style source is classified separately from the four Beaver-builder review sources. A visual check caught welcome-offer wording in the earlier “What to watch” extraction, so the selected text was narrowed. Tests now reject offer amounts, welcome-offer/free-bet/bonus wording and claim CTAs across all five review extractions. The published output remains labelled as incomplete dated editorial copy, with no offer CTA, score or affiliate link.

The latest full opt-in staging-connected local build emitted **1,236 Astro pages** and **977 normalized `.html` routes**. Unique known live-200 coverage is **1,185/1,214 (97.6%)**, leaving **29**: the owner's 18 and **11 additional**. Of the 11, only three are source-indexable offer-specific pages (`/quinnbet-extra-places-offer`, `/william-hill-free-or-4-explained`, `/fafabet-bonus-code`); the other eight are source-noindex utility/test/empty-body pages. The offer pages remain excluded because their dated promotions and terms are not independently verified. Safe-live-launch work is still roughly **50%**; five partial noindex previews do not close editorial or release gates.

Validation: Astro check **0 diagnostics** across 244 files, content tests **108/108**, route tests **10/10**; the uncrawled SEO preview gate reports **147/158** inert assets with zero accidental indexability, lost source descriptions, staging-host references or active affiliate links. Chrome checks at 375px and 1365px passed for all five review previews: no document-width overflow, responsible-gambling footer present and zero active affiliate links. The local Cloudflare package inspected **1,185 noindex HTML files**; **21,099** internal links had zero broken targets. Nothing was uploaded, and the public workers.dev preview is unchanged.

## Legacy-rewrite handoff reconciliation — 4 October

The owner supplied `../legacy-rewrites/CODEX-HANDOFF.md`. Its final section supersedes the earlier suggested redirects. Read-only live `HEAD` checks confirmed all **12** newly recorded exact-path 301s and their target locations. Ten belonged to the dated 1,057-row live-200 crawl; two World Cup paths were outside it. The Astro Worker now mirrors all 12 locally, plus its two previously verified redirects. Both Wrangler configs route these paths through the Worker first, including the `.html` sources. The exact-route planner excludes verified redirects even if an older WordPress snapshot still contains their published records. Route tests assert each 301, each local target asset, and the absence of a competing source asset.

The dated crawl's 1,057 live-200 rows are no longer a current-live denominator. Subtracting only the **10** freshly verified crawl redirects leaves **1,047 candidate current-200 crawl rows**; **1,039** have inert local assets, while the **eight owner-rewritten exact paths** remain unbuilt locally. This is a targeted reconciliation, not a complete fresh live crawl. The separate 158 uncrawled-path audit also needs refreshing before recomputing overall current-live coverage. Safe-launch readiness remains roughly **50% unfinished**: the 1,039 built crawl assets are still noindex previews, with 485 robots and 486 canonical mismatches against the old source intentionally held for prelaunch review.

Do **not** clone live wholesale into staging just to import these rewrites: that could overwrite staging-only ACF offer records, the content-model plugin, and Gutenberg pilots. Reconcile the eight rewritten WordPress IDs and their `post_content` individually, preserving exact slugs and reviewing SEO fields. For `/acca-insurance/paddy-power` (ID 34795), Thrive still renders old live markup despite the new normal WordPress body; Astro must use the rewritten `post_content`, not `tve_updated_post`. The Betfred rewrite also contains a Beaver layout shortcode, which cannot be copied as trusted Astro HTML. No staging import or Thrive toggle was performed here.

Checks after redirect parity: offline exact-route build **1,235 pages** and **977 normalized `.html` routes**; Astro check **0 diagnostics** across 245 files; content tests **108/108**; route tests **10/10**; local internal-link audit **21,099 links, zero broken**. Nothing was deployed or written to either WordPress site.

## Gutenberg conversion resumed — 4 October

With fresh user direction to convert all retained content, **20 additional published staging posts** were converted from classic HTML to core Gutenberg blocks and independently verified. The recorded total is now **26/983 published posts**; see `docs/everytip-staging-gutenberg-batch-2026-10-04.md` for exact IDs, checks and limits. This included fifteen Seymour Biz weekly columns after a shared whitespace-loss defect in inline blockquote conversion was fixed and regression-tested. All twenty pre-conversion backups exist locally. No live WordPress record was changed, no Astro preview was redeployed, and no ACF offer was activated.

Three further Seymour columns passed the same guarded staging conversion and readback checks, lifting the total to **29/983** (23 new today). The local backup and provenance log is in `docs/everytip-staging-gutenberg-batch-2026-10-04.md`.

Four John Newsome columns then passed with columnist-specific removal of the retired portrait and long-article verification, lifting the total to **33/983** (27 new today). No SEO noindex change was made; the owner is considering a historical-post cutoff. Read-only Ninja Tables mapping found 15 shortcode-bearing posts, 30 pages and 49 distinct table IDs, to be modelled separately rather than flattened into text blocks. See the same batch log for details. No live WordPress or Cloudflare deployment change.
