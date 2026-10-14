# Dark Horse / Kempton feed contract — 13 October 2026

Read-only staging/API investigation; no WordPress, Cloudflare or live changes.

## What is accessible today

- Staging Ninja Tables REST `GET /wp-json/ninjatables/v2/settings/72501` returns the seven expected display columns and says table 72501 is `google-csv`. Its stored source is a published Google Sheets HTML URL. Requesting the CSV representation of the same published sheet succeeds without exposing the URL.
- At 20:45 UTC on 13 October, that CSV had **30 rows**, all exactly seven columns and with no empty cells. Its header is Time, Course, Horse Name, Forecast SP, Jockey, Trainer, Tissue Value Price. The Kempton alias filter matched **zero** rows in this capture. Zero can be a legitimate no-selection day; it must not be filled with other-course selections.
- The CSV has **no publication/race date column** and its response supplied **no `Last-Modified`** header. Ninja table post metadata was last modified in 2024, which describes table configuration, not today's tip upload. A fetch timestamp proves only when we read the file, not when Eric updated it.
- Table 86633 is a separate `default` source with Date, Weekday, Time, Code and Surface columns: fixtures, not the Dark Horse selection feed. It cannot supply missing dates for table 72501 without an independently verified row-level join.
- The Ninja Table Google Sheets sync model is documented by the [Ninja Tables Google Sheets guide](https://docs.ninjatables.com/guide/data-sources/google-sheets-integration). The staging results above come from direct authenticated settings reads and the linked published CSV, not from that documentation.

`scripts/audit-priority-tip-sources.mjs` repeats this read-only metadata check. It refuses other WordPress hosts and Google source hosts, limits response size, validates CSV shape, and prints **no selections, source URL or credentials**. Run with `node --env-file=.env.local scripts/audit-priority-tip-sources.mjs`. No CSV is saved locally.

## Why the exact pages cannot show the feed yet

`/value-bet-tips-dark-horses.html` and `/racecourses/kempton-racing-tips` are static Astro route assets today. Embedding a build-time CSV would keep showing the same tips after their race day until the next successful deploy. A request-time fetch of the current CSV would still have no trustworthy day stamp. Neither pattern can distinguish today's data from an unchanged, stale sheet. The routes therefore remain noindex previews with table-feed-unavailable notices by default, rather than promoting snapshot rows or fictional pilot examples. A later local-only upload-ID opt-in can show a validated dated artifact through a browser-date-gated table, but it is not a production feed.

The local `validateValueTipFeed()` contract in `src/lib/value-tip-feed.mjs` requires a separately trusted `feedDate` equal to the requested `targetDate`; it validates exact seven-column schema, row width, nonempty/plain-text cells and 24-hour times, and maps `Kempton (AW)` to the `KEMPTON` filter. It rejects unknown filters and stale/missing dates. The exact pages read only explicitly selected local import artifacts, fail closed by default, and do not fetch the undated Google Sheet. Tests: `tests/value-tip-feed.test.mjs`, `tests/daily-tip-import.test.mjs`, and `tests/opted-in-daily-tip-preview.test.mjs`.

## Minimal safe source change

Have the existing daily processing/upload tool send an explicit `feed_date` (race day in Europe/London) with its input file, a generated/imported timestamp, an immutable upload ID and the seven tip fields. The backend should publish one atomic, validated snapshot; a read endpoint should return that snapshot only for its declared day. If an import is absent, stale, malformed or unavailable, the frontend shows “Tips feed unavailable” (or a verified “No Kempton selections today” for a fresh empty filter), never yesterday's rows. Keep the existing Ninja/Google Sheets path running in parallel until row counts, course filters and seven columns match over several days. A historical accordion needs separately archived dated snapshots; it must not infer dates from the current sheet.

For Astro/Cloudflare, use a request-time feed or a timed rebuild that is guaranteed before publication and expires at UK race-day rollover; static HTML alone has no expiry mechanism. Preserve table ID 72501 and filter `KEMPTON` in the ACF reference block; handle fixture table 86633 separately. Only after the dated feed exists should the exact pages use the approved `TipsTable` mobile `+` pattern and pass editorial/SEO launch checks.
