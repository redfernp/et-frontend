# Ninja Tables content migration plan — 13 October 2026

This is a **local-only** plan. Staging REST was timing out during this pass, so no staging/live request or write was made. Evidence is the authenticated raw-shortcode audit captured 13 October (`artifacts/staging-ninja-shortcodes/audit-2026-10-13T19-51-32.541Z.json`) and the older public rendered snapshot from 2 October. The local comparison can be repeated with `node scripts/audit-local-ninja-table-parity.mjs`.

## Inventory and conversion boundary

- The raw audit inspected **1,188** published snapshot post/page IDs. It found **15 posts and 29 pages** with Ninja shortcodes, **96 placements** across **49 table IDs**. This supersedes the earlier estimate of 30 pages.
- One of the 15 posts is the PayPal roundup (ID `58743`, table `59016`), which belongs to the roundup lane. The daily-tip lane therefore contains **14 posts and 37 placements**. The 29 racing pages contain **58 placements** (two per page).
- Every one of the 29 racing pages pairs table `72501` with a course filter and a different course-specific table. Table `72501` also occurs unfiltered on the Dark Horse hub (ID `72421`) and Templegate page (ID `171`): **31 placements** in all. Preserve the filter exactly; the raw Brighton value contains trailing whitespace (`"BRIGHTON "`) and must not be silently rewritten until its matching behaviour is checked.
- In the older rendered snapshot, all **96** Ninja table IDs occur in exactly the same order as the raw shortcode references across all **44** records. This proves the location mapping is feasible; it does **not** prove current table data, filters, freshness, row visibility, or frontend equivalence. The snapshot contains expanded Ninja HTML rather than shortcode text. A rendered snapshot alone must never be used to declare a post safe for prose conversion.

The converter currently rejects `[ninja_tables]` in the **current raw** WordPress body, correctly stopping accidental flattening. It also rejects unsupported wrapper/layout markup found in many of these posts. Do not broaden the converter to accept a rendered `<table>` or strip the shortcode. No shortcode-bearing post or racing page should be overwritten by the generic batch.

## Priority order

1. **Horse value tips reference**: model table `72501` first. The Dark Horse hub is the clean single-table pilot; Kempton page `45270` is the filter-plus-secondary-table pilot (`72501` with `KEMPTON`, then `86633`). This exercises the shared data feed, exact placement order, mobile `+` disclosure and a course filter before touching the other 28 pages. The 29 secondary table IDs need schema/export review individually; do not assume they are the same table shape or the same underlying tip dataset.
2. **Four shared football feeds**: `66322` (1X2), `65526` (over 2.5), `65527` (BTTS), `65364` (over 1.5). Each appears in five posts, including the accumulator hub. UEFA and World Cup pages apply a competition filter to all four; the unfiltered pages and the English Premier League hub do not. Validate the exact Ninja filter semantics before reproducing them in Astro. These four table references account for **20** post placements.
3. **Correct scores and specific daily feeds**: `67299` appears on the correct-score hub and filtered World Cup page. Then handle Lucky 15 `83380`, racing treble `72084`, and the three NAP tables `83235`/`83239`/`83242`. They have different columns and should not be forced into the horse-value schema.
4. **Historical statistics**: eight 2021/22 league-stat tables (`56582`–`56586`, `56590`–`56593` as present in the audit) appear in the over-1.5 and over-2.5 pages. Review whether to retain them as labelled archive data or replace them editorially; do not present them as current-season statistics. The PayPal table `59016` remains with the roundup family.

## Implementable content model

Use a dedicated ACF Pro Gutenberg **tip-table reference block** for placement, not an ACF repeater of every row. Its saved fields should be a validated table/feed key, an optional **exact raw filter string**, and a presentation variant selected from supported schemas. A heading stays as an ordinary editable Gutenberg heading above the block. The block's WordPress render callback should emit a small, stable marker containing only the reference and filter; it must not paste table rows into `post_content`. WPGraphQL can carry that marker with the article, while Astro resolves it through a typed tips data feed. The input-file upload/upsert path is REST, separate from WPGraphQL reads, as already agreed for the migration.

Keep the underlying tip records in a structured WordPress store or validated import service, with stable row identity, source date, publication date, course/league, selections, displayed odds/forecast fields and import provenance. Preserve previous tips separately for a later history view; results are explicitly out of scope for now. ACF controls the page placement and optional editorial labels, not the high-volume tip rows. Do not introduce Cloudflare D1 just to mirror Ninja Tables unless volume or freshness tests show WordPress unsuitable.

The Astro renderer needs a schema per feed family, mobile rows that expose secondary columns via the agreed `+` control, accessible table headers, and a clear stale/unavailable state. Apply course or competition filtering to the **typed rows** and assert the filtered result against Ninja output. The older expanded snapshot showed unfiltered row counts even on filtered pages, so counting its HTML rows is not a filter-parity test.

## Exact safe sequence when staging responds

1. Capture a new authenticated `content.raw` and modified timestamp for pilot IDs `72421` and `45270`, plus table exports/schema and representative filtered results for `72501`/`86633`. Save originals locally before any write. Confirm whether other builder wrappers surround the shortcode positions.
2. Build and test the ACF block plus a read-only typed table adapter in a **new staging draft/copy**. Verify one article's WP REST body, WPGraphQL marker, Astro rendering, mobile behaviour, row/filter parity and rollback. Do not alter the published original during this test.
3. Convert the pilot original only after exact raw-body tokenization preserves prose, links, image/module order, table references and SEO fields. The one-post write guard must compare ID, slug, status, modified time and raw shortcode sequence, then save a before-state and independently read back the edited body and rendered output.
4. Roll out by feed family in small batches; stop on any mismatch. Do not delete or disable Ninja Tables while any retained page still references it. Keep offer/legal and claims review as separate launch gates.

Current blocker: the raw audit gives table IDs and filters but not table schemas/rows or exact shortcode offsets in the current raw body; the staging API is presently timing out. The next safe action is **read-only** export and pilot parity work once staging is responsive, not a bulk content write.
