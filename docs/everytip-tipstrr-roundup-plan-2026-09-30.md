# EveryTip paid-tipster roundup — migration plan

Research and local template snapshot: 30 September 2026. Route: `/pilot/professional-winning-tipsters-comparison-table/`. The existing live page contains retired Betting Gods services and dated performance claims; do not import those cards or claims into the new frontend. Preserve the established URL when replacing the page.

## Shortlist status

The pilot includes [TheBanker](https://tipstrr.com/tipster/thebanker), [eachwaymornigtips](https://tipstrr.com/tipster/eachwaymornigtips), [The Least Expected](https://tipstrr.com/tipster/the-least-expected), and [Javier Rey](https://tipstrr.com/tipster/javier-rey). Each profile showed an established history and recent result activity at the research date. This is a candidate shortlist, not a verified ranking of net subscriber returns. Tipstrr's displayed ROI and profits use its own assumptions; real outcomes vary with achievable odds, stakes, subscription fees and losing runs. No greyhound or cricket endorsement is shown until an active paid profile and meaningful history can be checked.

Every outbound profile URL is generated as `https://tipstrr.com/tipster/{slug}?via=everytip` and marked `rel="sponsored nofollow noopener noreferrer"`. The parameter follows the owner's instruction. Before production, confirm a test click appears in the Tipstrr affiliate dashboard; a correctly formed URL alone does not prove attribution. Affiliate disclosure must remain prominent.

## WordPress model for monthly maintenance

Create a `tipster` custom post type with ACF Pro fields exposed to WPGraphQL, then relate selected tipsters to the roundup page using an ordered ACF relationship field. Suggested fields: platform, canonical profile URL, affiliate parameter/URL, sport, tip style, date first active, frequency note, reader caveat, membership status, date last checked, last result date, price checked and currency, source URL, editorial status (`candidate`, `approved`, `needs_review`, `retired`), and internal review notes. Keep factual snapshots and editor-only notes distinct from public copy. Eric can edit intro, verdict and caveat fields without touching layout or affiliate-link construction. The frontend should render only `approved` entries whose check date is current; if a sport has none, show an honest empty state.

Monthly checklist: re-open every profile; confirm active premium membership, recent tips, subscription price/trial and cancellation terms; assess all-time and last-12-month records with settled-tip count and drawdowns; check tip timing and odds availability; verify the affiliate redirect/tracking; update `last_checked`; retire inactive entries. Escalate any performance statement for editorial review. Suggested screening threshold is at least 12 months and 200 settled tips, not a guarantee of quality. Never auto-promote by a short-term ROI sort. This is a workflow proposal, not a scheduled automation.

## Launch gates

1. Owner confirms the page and sport scope, and Tipstrr confirms tracking for `via=everytip`.
2. Eric completes the dated monthly review and signs off the four initial candidates.
3. Implement the CPT/ACF Pro fields, WPGraphQL query, draft/retired filtering and preview fallbacks.
4. Replace old page content at its current permalink, validate internal links, mobile layout, disclosure and no stale performance claims.

Source pages: [Tipstrr horse-racing category](https://tipstrr.com/horse-racing), [Tipstrr football category](https://tipstrr.com/football), [Tipstrr affiliate programme](https://tipstrr.com/affiliates).
