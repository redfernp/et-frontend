# Seymour Biz staging Gutenberg batch — 13 October 2026

Three existing published Seymour Biz posts were converted from classic HTML to core Gutenberg blocks on **staging only**:

| WordPress ID | Column date in URL | Blocks | Original visible characters | Verification |
| --- | --- | ---: | ---: | --- |
| `88048` | 2 May 2026 | 13 | 5,234 | Passed |
| `87957` | 25 April 2026 | 13 | 5,675 | Passed |
| `87789` | 18 April 2026 | 13 | 6,348 | Passed |

Each post passed a fresh, guarded dry run; the single-post apply script re-read and checked the snapshot ID, slug, status, modified time, source body and visible-text parity before writing. Ignored pre-conversion backups are in `data/raw/wp-preconversion-{id}-2026-10-13.json`. Each write's immediate readback confirmed exact block content, text, metadata and Yoast parity. A separate verifier then checked the published WordPress render and all those invariants again. All three returned `verified: true`; no uncertain write remains in this batch.

The read-only top-of-family planner showed that the ten newest Seymour records had changed since the 2 October snapshot, mostly from earlier conversions. It correctly ruled them out. ID `90616` also has a modified-time mismatch and was not written. This batch instead selected three untouched records from the local snapshot and relied on the apply script's fresh checks. A larger read-only scan timed out once during staging instability; it made no writes. Subsequent small reads and these three bounded writes succeeded.

This work converts editor structure only. It does not validate historical tip claims, activate any offer/CTA, change robots policy, update Astro, or touch live WordPress. The Seymour-specific increase is **3 verified posts**; the previously recorded overall baseline was 33/983 published posts, but this lane does not assert a new sitewide total because other work may be concurrent.
