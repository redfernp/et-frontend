# John Newsome conversion backlog — local audit, 13 October 2026

This is **local planning only**. Staging REST was timing out when this audit was requested, so no WordPress request or write was made. Sources: the published staging GraphQL snapshot captured 2 October, the dated preconversion backups, the verified 13 October migration run log, and the authenticated raw Ninja Tables inventory captured 13 October. The snapshot body is rendered HTML, **not the current editable raw body**. A structural pass is therefore only a candidate screen; the existing guarded single-post dry-run, write, and independent rendered readback remain mandatory.

## Current accounting

| Measure | John posts |
| --- | ---: |
| Individual John paths in the snapshot | 198 |
| Structurally convertible with the exact columnist portrait rule | 192 |
| Independently verified Gutenberg conversions recorded so far | 21 |
| Written with immediate readback but independent check still outstanding | 1 (`85181`) |
| Structurally convertible without a dated conversion backup | 170 |
| Rejected by the strict converter | 6 |

The 21 verified posts are the four 4 October pilots, six John-lane conversions on 13 October, and eleven later serialized conversions recorded in `everytip-content-migration-run-2026-10-13.md`. The six rejected posts are included in the 198, not the 170. A dated backup is evidence of a saved original/write attempt, not proof of independent verification; `85181` must stay out of verified totals until readback succeeds. The 13 October raw Ninja audit found **no John post** among its 15 shortcode-bearing posts. Recheck current raw content before each write nonetheless.

## Priority queue when staging recovers

1. **Reconcile, do not rewrite, `85181`.** The coordinator's batch log says its write and immediate readback passed, but the independent verifier timed out. Run the verifier against its saved original first. If it fails or remains inconclusive, stop this lane and inspect the exact mismatch/state.
2. **Read-only resolve `90351`** (`/epl-game-week-4-2026-27-season-premier-league-tips-john-newsome.html`, published 7 September 2026). This is the newest remaining John gap, but the coordinator recorded it as *stale* against the 2 October snapshot and skipped the write. An undated `wp-preconversion-90351.json` also exists. Do not force the generic writer past its modified-time guard; determine the current raw body, whether it is already blocks, and whether a new approved baseline is needed.
3. **Guarded one-at-a-time conversion of the remaining 2025–26 league columns published after the approved 4 October 2025 noindex cutoff.** These are the highest-priority ordinary candidates because their Yoast treatment was left indexable by that dated rule; this is a publication-date prioritization, **not traffic data**. In descending date order:

   | ID | Published | Path suffix | Snapshot block screen |
   | --- | --- | --- | ---: |
   | `85080` | 16 Dec 2025 | `epl-game-week-17-2025-26-season-premier-league-tips-john-newsome.html` | 266 |
   | `84932` | 9 Dec 2025 | `epl-game-week-16-2025-26-season-premier-league-tips-john-newsome.html` | 397 |
   | `84862` | 5 Dec 2025 | `epl-game-week-15-2025-26-season-premier-league-tips-john-newsome.html` | 270 |
   | `84826` | 2 Dec 2025 | `epl-game-week-14-2025-26-season-premier-league-tips-john-newsome.html` | 297 |
   | `84703` | 25 Nov 2025 | `epl-game-week-13-2025-26-season-premier-league-tips-john-newsome.html` | 271 |
   | `84332` | 4 Nov 2025 | `epl-game-week-11-2025-26-season-premier-league-tips-john-newsome.html` | 278 |
   | `84211` | 28 Oct 2025 | `epl-game-week-10-2025-26-season-premier-league-tips-john-newsome.html` | 260 |
   | `84099` | 21 Oct 2025 | `epl-game-week-9-2025-26-season-premier-league-tips-john-newsome.html` | 290 |
   | `83992` | 16 Oct 2025 | `epl-game-week-8-2025-26-season-premier-league-tips-john-newsome.html` | 257 |

   These large block counts are **rendered-snapshot estimates**, not expected raw Gutenberg counts. The historic 2026 John conversions produced roughly 36–43 blocks after current-raw conversion. The fresh raw body/modified timestamp may differ, and any change or timeout must stop the single-post write.
4. **Older noindex archive candidates** after the above: `83689`, `83497`, `83376`, `83247`, `82894`, `82715`, `82568` (early 2025–26 league season), then the 2025 Club World Cup series `81932`, `81869`, `81777`, `81680`, `81610`, `81523`, `81337`. Their order can be adjusted by actual search/traffic evidence if supplied; none is present in this local audit. Keep historical text intact and retain noindex/SEO parity.

## Blocked or separate treatment

- `71714`, `67093`, `47943`, and `47821`: top-level `<div>` wrappers are rejected. They require a separate extraction rule or editorial migration and proof that all visible text, links, and structure survive. Do not turn the whole body into a single paragraph.
- `57978` and `57880`: rejected by the converter's builder/active-markup guard. They need a manual source inspection and a dedicated conversion decision; the current generic writer should not be relaxed merely to increase throughput.
- `90351`: stale current-state/snapshot mismatch despite its rendered snapshot passing the structural screen; treat as a read-only reconciliation, not a generic safe candidate.
- `85181`: write made but independent verification outstanding; do not repeat the write or count it as complete.
- Staging instability: repeated REST timeouts make blind batches unsafe. Serialize reads/writes across agents, use one post per invocation, and stop immediately on timeout or failed parity.

No traffic analytics were available locally. This queue uses recency, publication-date SEO treatment, and documented conversion readiness; it is not a claim about page traffic or launch readiness. No live or staging content was changed by this audit.
