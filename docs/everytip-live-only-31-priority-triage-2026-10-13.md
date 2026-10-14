# Remaining 31 live-only posts: priority and safe-preview decision

Read-only public WordPress REST audit on 13 October 2026, using `scripts/audit-live-only-priority-candidates.mjs`. The current `scripts/audit-live-staging-content-delta.mjs` confirms **36** posts absent from the 2 October staging snapshot, **31** still without an exact local asset after five bounded noindex previews, and **0** new pages. No live/staging write, offer activation, deployment or new exact route was made in this pass.

| Family | Routes still missing | Current source shape | Decision |
| --- | ---: | --- | --- |
| Ordinary racing-tip / extra-place hybrids | **13** | 13/13 have a table, `/go/` anchors, offer mechanics, odds/price mentions and current-day wording. | Do not copy as current free tips. A dated table importer needs row-level source/date validation, then editorially reviewed handling of odds and offer terms. |
| Offer-led news / event stories | **18** | 18/18 have `/go/` anchors, offer mechanics and odds/price mentions; 17/18 say today/tonight/this weekend, and 3 include tables. | Do not feature as live news or email hooks until a verified central ACF offer and historical-event treatment exist. |

## Best candidates and why they were not fabricated now

1. **Free-tips/racing archive:** `/extra-place-races-today-tips-12-october.html` (ID 91093) is the newest missing ordinary article, with a 14-row race table and 3,206 visible characters. It also has four `/go/` links, 39 odds/price mentions, 15 offer-mechanic mentions and six current-day references. Its central paragraphs depend on forecast/tissue prices, operator place rules and a Lucky 15 promotion. Withholding those leaves a thin title/table stub, not a faithful editorial post.
2. **Free-tips/racing archive:** `/extra-place-races-today-tips-11-october.html` (ID 91076) has seven table rows, 2,252 visible characters, two `/go/` links, 23 odds/price mentions, 15 offer-mechanic mentions and seven current-day references. The same issue applies. These two could reuse the existing 13 October *historical* table design only after a dated source lock and explicit row/claim selection; they must not populate the current tips feed.
3. **Offer-news template test:** `/champions-league-bet-builder-refund-arsenal-v-lille-13-october.html` (ID 91115) has 3,338 characters and no table, but five affiliate links and 14 offer-mechanic mentions. It is an expired match/offer story, not a safe homepage or newsletter hook without central offer verification.
4. **Offer-news template test:** `/money-back-if-2nd-leicester-1324-13-october.html` (ID 91111) has no table but two affiliate links, seven odds/price mentions and 12 offer-mechanic mentions in 2,077 characters. Withholding the event/offer detail would remove the article's point.

The other 27 routes follow the same family pattern: 11 additional dated racing-tip table hybrids and 16 event/offer stories. Their IDs/paths remain enumerated in `docs/everytip-live-only-posts-audit-2026-10-13.md`; the executable audit validates every current live ID/status/exact `.html` path and reports structural risk signals, without writing full source copy to the repository.

## Scope and next safe step

**Zero new routes** were built here. This is intentional, not an overlooked migration task: creating a page with only its dated headline and no claim-bearing body would inflate route coverage without usable content or editorial parity. Keep the already-built five live-only previews noindex and inert. For the other 31, first export authenticated raw source and Yoast fields, then model dated tip tables separately from central ACF offer references. Use explicit historical labels, no active affiliate destinations, and exact slug/date/hash checks. Only publish a complete route when its noncommercial substance survives those omissions and its responsive table/SEO are checked.
