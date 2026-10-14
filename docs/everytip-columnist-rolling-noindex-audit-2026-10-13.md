# Rolling columnist noindex boundary — local audit, 13 October 2026

Scope: John Newsome and Seymour Biz **individual tips posts** only. This audit made no staging or live WordPress request or write. It compares the 2 October published-post snapshot with the 4 October staging noindex pass and its saved receipts; current Yoast state remains unverified while staging is unavailable.

The previous staging rule covered WordPress publication dates **before 4 October 2025**. Its verified result was 433/433 qualifying posts returning `noindex,follow` on 4 October 2026. As of 13 October 2026, an exact date-based 12-month boundary covers publication dates **before 13 October 2025**. The newly elapsed interval is therefore **4–12 October 2025 inclusive**. Snapshot inspection finds exactly **one** John/Seymour individual post in that interval:

| Family | WP ID | Published | Exact path | 4 October pass |
| --- | ---: | --- | --- | --- |
| Seymour Biz | `83897` | 9 October 2025, 15:32:43 | `/saturdays-horse-racing-preview-tips-11th-october-2025-seymour-biz.html` | Not included (too new then) |

There are **zero newly qualifying John Newsome posts** in this interval. The adjacent posts corroborate the boundary: John `83689` (1 October) and Seymour `83733` (2 October) were within the earlier cohort; the next John `83992` (16 October) and Seymour `84020` (17 October) remain outside today's date-based cohort. This uses **WordPress publication date**, as did the approved 4 October rule, not the fixture/race date in a slug. The existing 4 October planner hardcodes `2025-10-04`, so re-running it unchanged would not include `83897`.

## Safe staging action when available

1. Authenticated **read only** for `83897`: confirm ID, exact slug, `publish` status, original publication timestamp, and current Yoast robots. If any differs from the snapshot or is unknown, stop and investigate.
2. If it already emits `noindex,follow`, record that result and make **no SEO write**. If it emits `index,follow`, save a complete before-state and update **only** Yoast's noindex flag through the existing guarded SEO ability. Preserve follow, SEO title, meta description, canonical, content, date, slug, and publication status. Independently read back both the Yoast ability and rendered REST robots; stop on any mismatch.
3. Do not rewrite the post body as part of this SEO step. Its Gutenberg conversion is a separate Seymour lane and must preserve whatever Yoast state exists at that time. Do not touch archive hubs, newer columns, other authors, or live WordPress.

The historical snapshot/live crawl labelled `83897` indexable, and no 4 October before/receipt file exists for it. Neither fact proves its **current staging** Yoast state; the next action is a fresh read, not a blind write. This is one newly eligible candidate, not evidence that other Yoast settings need changing. A truly rolling policy should compute its date boundary per run (with a documented timezone/date convention), while keeping the audit and per-post verification safeguards.
