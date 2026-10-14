# Live columnist noindex audit — 13 October 2026

The owner's rule is to keep John Newsome and Seymour Biz tip posts live for records but set posts **older than 12 calendar months** to `noindex,follow`. The Europe/Rome cutoff on 13 October 2026 is publication date **before 13 October 2025**.

A read-only live WordPress REST audit by exact post ID, slug, public path and publication date checked all **434** qualifying records in the 2 October staging snapshot. **237** are already `noindex`; **197** remain `index,follow`; **0** identity/response exceptions were found. The staging copy separately has **434/434** qualifying posts noindexed. The per-post live list is in the ignored `artifacts/live-columnist-noindex/` audit output; rerun `node scripts/audit-live-columnist-noindex.mjs` to refresh it.

This is a live SEO gap, not a content-conversion count. No live Yoast field has been changed by the audit. Any live update should use small guarded batches, re-read each ID/date/slug/current robots before mutation, preserve `follow` and all other Yoast fields, and verify each readback. If the owner does not authorize live changes, keep this as a launch/cutover item rather than reporting the live rule as complete.

## Corrected slug coverage, 14 October 2026

The original family selector omitted duplicate `-2.html` slugs and Seymour's `-lucky-15.html` variant. The shared columnist matcher now recognises all **522/522** author-suffixed posts in the dated snapshot. With the Europe/Rome cutoff before **14 October 2025**, a fresh read-only live audit found **439** qualifying older posts: **241** already noindex and **198** still indexable, with **zero identity exceptions** (John 92, Seymour 106 need noindex). This supersedes the 434/197 counts above. No live Yoast write was made.

The corrected staging read-only plan found **438/439** already noindex and one indexed duplicate, John post `70985` at `/epl-game-week-35-2023-24-season-premier-league-tips-john-newsome-2.html`. No staging Yoast write was made in this follow-up. The local Astro source SEO resolver now enforces noindex for older columnist paths even when WordPress metadata is still indexable; the frontend remains noindex-only preview and this does not alter WordPress search settings.
