# Priority tips routes: local launch audit — 13 October 2026

Scope: local Astro source and dated staging snapshots only. No WordPress, Cloudflare, or live writes. Counts below are snapshot/rendering observations, **not current tips**.

## Decision

The exact-path Dark Horse and 13 other Ninja-backed tips posts are **not launch-ready**. Before the local fix, `planExactRoutePreview` included all 14 and generic `previewHtml()` preserved 40 legacy rendered tables and 1,358 `<tr>` elements from the dated snapshot. Those were static historical rows, not a refreshed feed. The local preview now excludes each entire table subtree while retaining prose and displays an explicit feed-unavailable status. It remains `noindex,nofollow`, carries a preview warning, and disables links. Removing those safeguards or promoting the route still requires a verified fresh feed. The approved mobile `+` detail expansion is not yet wired to these exact routes.

Highest-priority example: `/value-bet-tips-dark-horses.html` (WordPress post 72421) contained one dated table with 32 `<tr>` elements, now withheld from the exact preview. The polished `/pilot/value-bet-tips-dark-horses/` instead uses **fictional** `Example Runner` rows from `src/lib/pilot-data.ts`. Neither is suitable as a live feed. The pilot's seven desktop columns and mobile expansion in `src/components/TipsTable.astro` are reusable once a verified structured feed exists.

The exact `/racecourses/kempton-racing-tips` route is safer today: `RacecoursePreview.astro` intentionally omits the old Ninja table and displays “Racecourse tips feed pending” under `noindex,nofollow`. The pilot Kempton route has the same fictional sample source as Dark Horse. Authenticated raw audit found two Kempton references: table **72501**, filter **`KEMPTON`**, and table **86633** without a filter. Both references must be mapped to the intended content roles before replacing the pending state; the ID alone does not prove which table is today's tips versus history/other selections.

## Local evidence

- Raw reference source: `artifacts/staging-ninja-shortcodes/audit-2026-10-13T19-51-32.541Z.json` — 15 posts and 29 pages, 96 Ninja shortcode placements, 49 distinct IDs. Fourteen of the 15 posts are tips-related; the other is the PayPal roundup.
- Current public HTML source: `src/pages/[...legacyPath].astro` calls `previewHtml(record)` for generic exact routes. Every one of the 14 tips posts passes `assessContent()` and is included by `planExactRoutePreview()`; `previewHtml()` now removes table subtrees only for the audited 14 URIs, and the route renders the feed-unavailable note.
- Racecourse route: `src/pages/racecourses/[course].astro` / `src/components/RacecoursePreview.astro` removes old tables and clearly withholds feed. It is preview-only and noindex.
- Pilot source: `src/lib/pilot-data.ts` explicitly contains fictional examples. Do not point exact launch paths at the pilot data.
- New isolated parser: `src/lib/tip-table-reference.mjs` splits the ACF block's rendered marker into `{tableId, filter}` while preserving adjacent prose and rejecting unknown/malformed markers; tests are in `tests/tip-table-reference.test.mjs`. It does not copy, fetch, or invent rows. Integrating it into shared rendering requires coordinated changes and a verified feed.

## Launch blockers and next safe sequence

1. Define an authoritative structured current-tips source and refresh contract (likely existing daily input tool/Sheets export), including selection ID, date, course, time, runner, forecast SP, jockey, trainer, tissue/value price, publication state, and last-updated timestamp. WordPress/Ninja may remain editorial references, but static WordPress `content.rendered` must not be treated as today's table feed.
2. For each of the 49 table IDs, document source, column schema, filter semantics, expiry/history rules and owner. Preserve exact shortcode filter strings on migration; e.g. Brighton has meaningful trailing whitespace in the raw audit, so do not normalize silently. Prioritize 72501 and 86633 for Dark Horse/Kempton.
3. Consume the ACF tip-table reference marker from fresh Gutenberg/WPGraphQL content **before** the generic HTML sanitizer (which strips data attributes), resolve it only against the verified feed, and fail closed to an explicit unavailable state. Keep a dated archive behind an accordion only after its rows and dates are verified.
4. Render verified rows through the approved `TipsTable` responsive pattern; test desktop seven columns, mobile first columns plus `+` details, empty/loading/error states, filters and no cross-course leakage. A feed outage must not expose old snapshot rows or fictional pilot runners.
5. Only then remove preview robots/CTA restrictions for each exact route after separate editorial, SEO, URL and legal checks. Do not use this audit alone as publication approval.

Tests run: `node --test tests/tip-table-reference.test.mjs` — 5 passed; `node --test tests/ninja-tip-preview-safety.test.mjs tests/migration-preview.test.mjs` — 11 passed; `npm run check` — 0 errors/warnings.
