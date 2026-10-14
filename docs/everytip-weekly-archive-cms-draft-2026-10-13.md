# Weekly archive CMS pilot — 13 October 2026

## Outcome

A new **unpublished staging-only Gutenberg page draft `91014`** was created for the evergreen introduction of John Newsome's weekly archive. The original published staging page `24016` at `/english-premier-league-predictions-for-saturday` was **not edited**; live WordPress, DNS, deployed Astro and commercial CTAs were untouched.

Draft slug: `staging-john-newsome-archive-evergreen-intro-2026-10-13`. It has exactly two editable core blocks: the source-backed H2 `John Newsome's Football Correct Score Betting Tips` and its 373-character introductory paragraph. The draft contains no article list, date-specific game/odds copy, image, link, offer, Ninja/Thrive shortcode or pagination control. The WordPress rendered version uses typographic apostrophes, as the live page does; the plain-text source meaning matches.

Before creating the draft, the full current published staging page body, rendered HTML, metadata and Yoast response were saved under ignored `data/raw/wp-john-archive-source-24016-before-intro-draft-2026-10-13T21-42-12.551Z.json`. The current staging raw source and live public render both had the same ID/slug/status, `2026-09-25T15:30:46` modified timestamp, H2 and paragraph text (after normalizing WordPress typography). The guarded script refused a duplicate slug, rejected any shortcode/offer markup and re-read the published source immediately before creating the draft.

Independent staging REST readback of draft `91014`: status `draft`, exact expected slug, two blocks rendering as H2 and paragraph, 0 links, 0 images and 0 shortcodes. A separate read confirmed original `24016` remains published with its original slug and modified timestamp. Repeatable code: `scripts/seed-john-archive-intro-draft.mjs`; its one-time `--apply` path is guarded by the original source timestamp and unique draft slug.

An authenticated WPGraphQL read also returned draft `91014` with status `draft`, the same slug, exactly H2 and paragraph rendered content (50- and 373-character text), and no GraphQL errors. This proves the two-block CMS pilot is available to the intended Astro read path without making it public.

## Typed archive model still required

The published John hub is not a normal article body. Its 30,402-character classic raw body contains current and historical post snippets, 64 links, four images and Thrive pagination tokens. The replacement must pair editable Gutenberg intro blocks with a typed archive query over John's actual WordPress posts, exact `.html` destinations, author identity and date order. Pagination is a frontend concern and must not be copied into the intro blocks. The base hub and `/page/N/` routes need distinct SEO handling: the user asked for paginated archives to be noindex; this draft does not decide or change their public robots policy. Current local Astro archives remain noindex previews until the release gate is passed.

The Seymour hub `23888` was also read and compared live vs staging: both have the same `2026-09-25T15:23:32` modified timestamp and matching initial H2/evergreen paragraph. Its remaining body includes six images, a `/go/betfred` link and an embedded Betfred offer with **older terms** that differ from the owner's later approved central offer copy. Do not bulk-convert that body or copy the offer into a new intro. A future Seymour intro draft can safely use only its source-backed H2/paragraph; the commercial block should be replaced by a central ACF offer reference only after current eligibility/terms/CTA review. Its actual weekly list/pagination should use the same typed archive family rather than fixed HTML.

This pilot is a CMS structure test, not publication approval. The original John and Seymour pages remain the live/staging source until a full content, navigation, SEO and responsive cutover check is complete.
