# Seymour Biz Gutenberg backlog — local audit, 13 October 2026

This is a **local-only** planning audit. Staging was timing out, so no WordPress read or write was attempted for this report. Source: `data/raw/staging-wordpress-public-2026-10-02T17-36-37-050Z.json`, existing `data/raw/wp-preconversion-*.json` backups, the strict `classicHtmlToBlocks` converter with Seymour portrait-removal options, and the 13 October authenticated raw Ninja Tables audit at `artifacts/staging-ninja-shortcodes/audit-2026-10-13T19-51-32.541Z.json`. Snapshot content is rendered GraphQL HTML, **not current raw editor content**; all candidates require a fresh authenticated staging read and the existing guarded one-post writer/verifier when staging recovers.

## Inventory and priority

| Cohort | Snapshot posts | Existing conversion backups | Locally parseable, no backup | Local blocker |
| --- | ---: | ---: | ---: | ---: |
| 2026 | 37 | 37 | 0 | 0 |
| 2025 | 49 | 1 | 48 | 0 |
| 2024 | 51 | 1 | 48 | 2 |
| 2023 | 48 | 0 | 45 | 3 |
| 2022 | 51 | 0 | 51 | 0 |
| 2021 | 53 | 0 | 51 | 2 |
| 2020 | 26 | 0 | 14 | 12 |
| **Total** | **315** | **39** | **257** | **19** |

The backup count means only that a pre-conversion file exists; the earlier batch logs identify verified writes. Do not treat the 39 backups alone as a fresh staging completion check. The current raw shortcode audit lists **zero Seymour posts** with Ninja Tables placements. Its 15 post placements are in other families.

Prioritize the ten unbacked 2025 posts published from 9 October through 11 December, because they are the newest remaining Seymour columns and likely to remain indexable under the owner's 12-month rule. Their IDs in descending publication order are `84996`, `84857`, `84735`, `84618`, `84496`, `84382`, `84242`, `84131`, `84020`, `83897`. All ten parse locally as core blocks. Start with a 1–3 post staged batch, re-read raw content and `modified` against the 2 October snapshot, save exclusive backups, and verify exact raw/rendered text, identity and Yoast state after **each** write. Never derive permission to write from this local screen alone.

The next oldest locally parseable cohort begins `83733`, `83532`, `83407`, `83287`, `83125`, `82942`, `82770`. These are published before 13 October 2025, so they are historical records under the approved rolling noindex policy; converting them remains useful for CMS editing, but less urgent than the ten newer columns. Specifically, `83897` was published 9 October 2025: it falls outside the 4 October noindex pass yet is now more than 12 months old as of this audit. Its **current** Yoast state must be checked and, if needed, handled by the separate SEO lane. Gutenberg conversion must preserve whatever Yoast state exists at write time.

No page-view or Search Console metrics were present in these local sources. Priority is a recency/indexing proxy, **not** a measured traffic ranking.

## Blocker categories

- **15 unsupported quote structures:** `66158`, `64121`, `46784`, `44193`, `42349`, `42050`, `41849`, `41668`, `41461`, `41266`, `41036`, `40931`, `40821`, `40747`, `40637`. These need a dedicated lossless quote rule or manual editorial conversion; do not flatten quotations.
- **3 nested lists in inline markup:** `76483`, `68280`, `67259`. The current inline converter rejects `ul` within its context; preserve list hierarchy in a supported block transform before touching these.
- **1 top-level div:** `41136`. Inspect the div's meaning and possible layout/active markup before designing a block mapping.

The 2 October snapshot is stale for posts already converted and may also be stale for other editorial updates. `90616` has a prior conversion backup but a later modified time than that snapshot; earlier batch planning correctly refused it. Staging instability is a separate operational blocker: stop on any timeout or incomplete readback, and reconcile before starting the next post. Live WordPress, Cloudflare, offers and Astro were untouched by this audit.
