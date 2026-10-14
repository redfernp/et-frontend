# October columnist archive overlay — 13 October 2026

Local-only, opt-in enhancement for the **noindex exact** weekly archive previews. The 2 October staging inventory lacked the October live John and Seymour columns. With `MIGRATION_LIVE_WEEKLY_ARCHIVE_OVERLAY=1` during a local build, the two archive inventories can append only these source-locked exact articles:

| Archive | Live post ID | Exact article preview |
| --- | ---: | --- |
| John Newsome | `91110` | `/epl-game-week-7-2026-27-season-premier-league-tips-john-newsome.html` |
| John Newsome | `90942` | `/epl-game-week-6-2026-27-season-premier-league-tips-john-newsome.html` |
| Seymour Biz | `90999` | `/saturdays-horse-racing-preview-tips-10th-october-2026-seymour-biz.html` |
| Seymour Biz | `90836` | `/saturdays-horse-racing-preview-tips-3rd-october-2026-seymour-biz.html` |

The overlay defaults **off**. It reads the dedicated dated local article snapshots where available (or their separately opted-in, exact public REST readers). John GW6 is a strict SHA-256-locked live public REST read. It validates ID, slug, live path, author/date/body contract and source-specific commercial-block filtering, then requires the matching safe exact `.astro` source file before it creates a link. A source identity/filter mismatch or missing exact route fails the build. Duplicate ID/path merges fail closed; if a later staging snapshot already includes an identical exact post, it is not added twice. Existing staging archive registry validation remains in place before the overlay.

The archive copy still calls these **dated records**, never current tips. Preview marker, `noindex`, disabled commercial links, existing desktop/mobile template and per-page pagination are unchanged. The source provenance line now identifies the two separately validated October article sources per archive. This is **not** a public launch/indexing approval and does not synchronize WordPress content. A production cutover still needs the current columnist feed, SEO decisions for archive pages, safe exact article assets across the history, and a fresh URL/SEO crawl.

Verification: `node --test tests/weekly-column-archive.test.mjs` passed 6/6, including default-off behavior, exact route requirement, source-locked IDs, duplicate avoidance and historical-advice labels. The default test suite is network-free; a separate read-only live source check validates John GW6's hash/filter. No WordPress/deploy write occurred.
