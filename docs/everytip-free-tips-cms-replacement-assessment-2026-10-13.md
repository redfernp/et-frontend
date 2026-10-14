# Free-tips hub CMS replacement — read-only assessment, 13 October 2026

Scope: exact `/free-betting-tips`, WordPress **page 76939**. Compared authenticated staging REST `content.raw`, public live/staging REST rendering, current local Astro pilot and the existing WPGraphQL adapter. No WordPress write or deploy.

## What is actually editable now

- Staging page 76939 is `publish`, slug `free-betting-tips`, modified **30 September 2026 11:11:04**. Its raw body has **18,733 characters but only one Gutenberg block marker**: `wp:fl-builder/layout`. It also contains one `[fl_builder_insert_layout]` and one `[et_offer_news]`. This is **not** a core-block page merely because the block editor can open it. No independent `wp:paragraph`/`wp:heading` body sections were found. REST shows no page-level ACF fields. Thrive meta keys exist, but are not evidence of a Thrive-rendered body.
- The rendered staging page has a featured Betfred offer, an offer-news module, tip directory, recommended bookies, and long-form SEO/editorial sections. The local exact Astro route already uses the approved pilot design and extracts the long-form editorial copy beginning at “Free Sports Betting Tips From Professional Betting Tipsters”; old links and commercial blocks are stripped. The **pilot directory groups, tipster banners, guide links and offer/news displays are presently code/fixture-led**, not all editable page sections. Its optional five-post staging WPGraphQL feed is only titles/paths, not a daily-tip or approved offer feed.
- Live page 76939 was modified **13 October 2026 08:41:16**. It has a different visible-text hash (`33d1b429a70faa18` versus staging `3fd6451b83b4c759`). The three live offer-news cards are Arsenal–Lille Bet Builder refund, 13 October extra-place races, and Leicester 13:24 money back. Staging still lists three **30 September** stories. Live/staging share page ID and slug, but staging content is materially stale. Do not overwrite live or present staging news as current. The local exact preview remains noindex and intentionally withholds current daily selections and active offers.
- A read-only fresh staging WPGraphQL priority-page probe timed out after 30 seconds during this assessment. The existing adapter has validated staging identity in earlier runs, but **this run does not establish current GraphQL availability**. REST raw read succeeded. Retry GraphQL and Yoast readback before any draft conversion or build gate.

## Recommended content split

| Section | Editor model | Astro source/guard |
| --- | --- | --- |
| Long-form explanations, headings, FAQs and ordinary internal editorial links | Normal Gutenberg heading/paragraph/list blocks on a **new draft**; keep copy order and link labels, and review dated claims | Page `content` via WPGraphQL; sanitize/allowlist blocks. No Beaver wrapper in replacement. |
| Intro, two featured guide links and optional related-page callouts | Core blocks for editorial prose; use WordPress page references for links where possible | Exact internal URL resolver, never hard-coded `/pilot/` or staging URLs. |
| Sport/tipster directory groups | Named WordPress menu with parent headings/child pages, or a small ACF repeater of group title plus post/page references if menu hierarchy cannot express layout | Query typed menu/ACF data, validate exact paths and hide missing destinations. Avoid copying the large directory into raw page HTML. |
| Seymour and John feature banners | Existing WordPress user-profile name, image and archive relationship (optional ACF featured-author order) | Author data, not duplicated image URLs or biographies in page body. |
| Offer-news cards | Replace `[et_offer_news]` with a typed latest/curated published-post relationship and date; editorial titles/paths only | Fail closed on stale/unavailable feed and distinguish historical article from current offer approval. The existing five-post query is a proof of read, not final curation. |
| Current daily selections | **Separate dated tip-feed contract**, never copied into evergreen Gutenberg body | Trusted upload ID/date/source hash with stale/absent state; independent Dark Horse/Ninja source rules. |
| Featured Betfred placement and seven-bookmaker ladder/sidebar | Existing central ACF `et_offer` records plus `acf/everytip-offer-slot` for an inline placement; ordered ACF references for the seven-card ladder if editorial ordering is needed | Resolve approved title, compact terms, eligibility, geography, dates and affiliate target centrally; CTAs stay inert until verification. No copied terms in blocks. |
| Page title, description, canonical and robots | Yoast fields on the new draft, then preserved on original at controlled switch | WPGraphQL/REST readback and exact `/free-betting-tips` SEO comparison. Preview stays noindex. |

## Draft path without touching the published page

**Yes, a separate staging draft can be created without overwriting page 76939**, once the owner authorizes a staging write. Create a *new* WordPress page with `status=draft` and a unique internal slug such as `free-betting-tips-gutenberg-pilot`; store the original page ID/slug and raw/Yoast backup, and never `PUT`/`POST` to `/pages/76939` during the pilot. Use the standard editor, not Beaver/Thrive. Populate core blocks and typed ACF references, then read back raw blocks, rendered text/link order, ACF IDs and Yoast fields. Keep the draft noindex/unpublished and point a **local-only** Astro pilot at its new ID for side-by-side QA. A draft alone will not occupy `/free-betting-tips`, so the published staging URL remains unchanged. A final content swap, if chosen later, is a separate controlled operation requiring fresh live-content reconciliation, exact-route parity and approval.

The immediate blocker is the **live-versus-staging 13 October news delta**, not Gutenberg itself. Start with a current source inventory and agreement on whether the news module should be latest-by-rule or Eric-curated; then build the draft contract. Do not copy the 30 September staging news to live, enable commercial CTAs or call this launch-ready.

## Staging draft receipt — later on 13 October

With explicit staging-only authorization, a **new** page draft was created; published page 76939 was not updated:

| Check | Receipt |
| --- | --- |
| New draft | ID **91010**, slug `staging-free-tips-evergreen-gutenberg-2026-10-13`, `status=draft` |
| Source backup | `data/raw/free-tips-source-76939-2026-10-13.json` (ignored from Git), exact staging raw/rendered body, title, modified time and Yoast identity |
| Published source lock | ID 76939, `publish`, modified `2026-09-30T11:11:04`, raw SHA-256 `09ad858b6a0ffaa25cff76488e59354712972f28529b2501ef47851b342ba84f` |
| Draft content | 34 core Gutenberg blocks from 34 long-form editorial nodes; no active links, current tips, offer slots, `[et_offer_news]` or Beaver shortcode |
| Write/readback | Raw draft SHA-256 `4d4b314d68a23a0f9c4072df09915ac681c6ef15a3169743bcd1491126a127e4`; rendered visible-text SHA-256 `03cab1d52800b8cead2a0ced20a4d4924fb91aa3921f04077c445138fd230af9` matched planned text exactly |
| Source-after check | Published page raw, modified time, title and Yoast title/description/canonical/robots still matched the pre-write backup |

The guarded writer is `scripts/seed-free-tips-evergreen-draft.mjs`: dry-run by default; `--apply` checks the published source and SEO before writing, refuses an occupied or changed draft slug, and never updates an existing draft or page 76939. This draft contains **only the extracted editorial section**, not the full hub, and its present-tense operational/editorial claims still require Eric’s review before publication. It deliberately does not clone the published page’s indexable SEO/canonical intent to the new draft. Live remains ahead of staging for the 13 October news cards. No deployment or live WordPress write occurred.
