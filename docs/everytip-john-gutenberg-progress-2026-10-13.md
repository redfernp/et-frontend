# John Newsome Gutenberg staging batch — 13 October 2026

Scope: John Newsome individual posts only, on the EveryTip staging WordPress application. No live WordPress, Cloudflare, offer, or Yoast SEO setting was changed.

The existing 2 October staging snapshot lists 198 John posts. A prior structural screen found 192 potentially convertible with the columnist-specific retired portrait rule. These are candidate counts, not completed conversions. Four John IDs (`90485`, `90255`, `90101`, `89999`) had already been converted and verified in the 4 October batch.

Today **one additional John post** was converted and independently verified:

| ID | Exact post path | Blocks | Result |
| --- | --- | ---: | --- |
| `88415` | `/epl-game-week-38-2025-26-season-premier-league-tips-john-newsome.html` | 36 | Published staging post; exact raw and rendered text, metadata, URL identity, and Yoast values verified |

The guarded dry-run matched the current classic body to the dated snapshot and found exact visible-text parity. The apply step wrote only Gutenberg body content via authenticated staging REST after saving `data/raw/wp-preconversion-88415-2026-10-13.json` locally. Its immediate readback passed content, text, metadata, and SEO parity. The independent verifier then passed `rawEqual`, `rawTextEqual`, `renderedContainsOriginal`, `seoStable`, and `statusStable`; source/rendered text lengths were both 33,105 characters. This makes **five recorded John posts converted and verified** across the earlier and current batches. The previously recorded sitewide count was 33/983 published posts, so this adds one to that count; other teams are working concurrently and should reconcile any new overall total separately.

Staging reads were initially intermittent and slow: a broad read-only John planner timed out after 30 seconds, a single-item retry succeeded, and another eight-item planner timed out. No write was attempted on an uncertain post. At the root coordinator's request, further John writes and broad scans were paused while the separate Seymour batch ran.

## Five-post continuation

After the coordinator confirmed staging had recovered and reserved a single staging write lane, five more John posts were individually dry-run, backed up, updated, and independently verified. The verifier confirmed exact raw Gutenberg source and visible source/rendered text, plus published status, URL identity, and unchanged Yoast values for every ID:

| ID | Exact post path | Blocks | Source/rendered text length | Backup |
| --- | --- | ---: | ---: | --- |
| `88286` | `/epl-game-week-37-2025-26-season-premier-league-tips-john-newsome.html` | 40 | 37,018 | `data/raw/wp-preconversion-88286-2026-10-13.json` |
| `88138` | `/epl-game-week-36-2025-26-season-premier-league-tips-john-newsome.html` | 43 | 35,208 | `data/raw/wp-preconversion-88138-2026-10-13.json` |
| `88021` | `/epl-game-week-35-2025-26-season-premier-league-tips-john-newsome.html` | 40 | 29,096 | `data/raw/wp-preconversion-88021-2026-10-13.json` |
| `87915` | `/epl-game-week-34-2025-26-season-premier-league-tips-john-newsome.html` | 41 | 54,633 | `data/raw/wp-preconversion-87915-2026-10-13.json` |
| `87568` | `/epl-game-week-32-2025-26-season-premier-league-tips-john-newsome.html` | 40 | 36,236 | `data/raw/wp-preconversion-87568-2026-10-13.json` |

**Six John posts were converted today, bringing the recorded John total to ten.** These five continuation posts were not changed beyond their Gutenberg body content. No live WordPress, Cloudflare, offer, or Yoast SEO setting was changed. The overall published-post count should be reconciled centrally with concurrent Seymour and daily-tip work; adding this lane's six to the pre-batch 33/983 alone would make 39/983.

Untouched recent John candidates in the old snapshot include `87202` and `87034`. ID `90351` appears between already-converted recent posts; its convertibility is unknown. Re-read each candidate and require the guarded dry-run/apply/verifier sequence before any later write.

## Recent-post recheck, late 13 October

The coordinator requested up to two of the most recent John posts, with no forced write. A read-only staging planner inspected the three newest snapshot posts and found **zero eligible**:

| ID | Current staging state | Decision |
| --- | --- | --- |
| `90485` (game week 5) | Modified 4 October after the 2 October snapshot; recorded as converted in the prior 4 October batch | No write; snapshot-modified guard correctly rejects it |
| `90351` (game week 4) | Published, current raw body 47,810 characters with **280 Gutenberg block markers**; current modified time matches snapshot | Already block content; never run the classic converter over it |
| `90255` (game week 3) | Modified 4 October after the snapshot; recorded as converted in the prior 4 October batch | No write; snapshot-modified guard correctly rejects it |

The remaining game-week 2 and 1 posts (`90101`, `89999`) are also recorded as converted in the earlier batch. Thus there are no safe, untouched, recent 2026/27 John posts to convert under the current strict snapshot guard. The `90351` raw inspection is read-only; it does **not** prove that its 280 existing blocks are editorially or visually launch-ready. No staging write, backup, or Yoast change was made in this recheck.
