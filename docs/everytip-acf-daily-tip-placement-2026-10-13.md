# ACF daily-tip placement contract — 13 October 2026

Local implementation only. No WordPress/plugin upload, Cloudflare write, or publication occurred in this pass.

The v0.6 content-model plugin's `acf/everytip-tip-table` block emits a typed table reference, not rows. For the two exact tips pages the only accepted placements are:

| Exact route | Ninja table ID | Exact filter | Data shape |
| --- | ---: | --- | --- |
| `/value-bet-tips-dark-horses.html` | 72501 | absent | All rows in one validated dated upload |
| `/racecourses/kempton-racing-tips` | 72501 | `KEMPTON` | Rows with normalized `courseId === 'kempton'` |

Table 86633 is a separate fixtures table and cannot be treated as the seven-column tips feed. `src/lib/value-tip-placement.mjs` now validates the exact ACF reference against the route and an already imported dated snapshot; wrong ID/filter, missing snapshot and stale day cannot produce rows. `KEMPTON ` (with a trailing space) is intentionally not silently normalized. The seven source columns map in order to time, course, horse, forecast, jockey, trainer and tissue; the imported manifest supplies the publication day. A fresh day with no Kempton selections is a distinct empty-course state, never a reason to show another course's rows.

This mapper is a contract for later CMS integration, **not** a live connection. The exact local pages retain noindex and their fail-closed unavailable state unless an explicit local upload-ID opt-in selects a fresh validated import. Existing historical Ninja shortcodes in WordPress remain intact; a replacement draft must keep a source backup and be compared against the original before any change to a published page. Do not place rendered Ninja rows in Gutenberg/ACF or infer a race date from the undated Google Sheet.

Next required input: one trusted export from the existing daily processing tool with `feed_date` (Europe/London race day), immutable `upload_id`, `generated_at`, source hash and the seven-column CSV, plus confirmation of the editor-facing placement on *new* staging drafts. A public production feed, expiry behavior, and editorial/SEO review remain separate launch gates. The current undated Google CSV is insufficient.

`../ukhr-app/app.py` is a possible source tool, but its current TSV exports `Min BSP` where the Astro table needs `Tissue Value Price`, even though `Tissue` exists in its input. It also drops the race date. See `everytip-existing-race-tool-discovery-2026-10-13.md`; do not wire its output into the tips feed until the owner confirms this is the correct daily workflow and selection algorithm.

Focused verification: `node --test tests/value-tip-placement.test.mjs tests/value-tip-feed.test.mjs tests/daily-tip-import.test.mjs tests/opted-in-daily-tip-preview.test.mjs tests/tip-table-reference.test.mjs` (19 passed); `npm run check` (0 errors, 0 warnings; 2 unrelated hints).
