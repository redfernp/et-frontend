# Live-only posts absent from staging snapshot — 13 October 2026

Read-only source: live WordPress public REST, compared with the 2 October staging snapshot using `scripts/audit-live-staging-content-delta.mjs`. Exactly **36 published posts** and **0 pages** are absent from that snapshot; **36/36 lack an exact local static asset** in the current build. All are dated 1–13 October. This is not an authorization to copy live bodies to staging or deploy them.

The public REST `content.rendered` was inspected for all 36. **36/36 contain `/go/` affiliate anchors.** No rendered body exposed Beaver/Thrive markers, a literal Ninja shortcode or an iframe, but public rendered HTML cannot prove the underlying `post_content` has no shortcode or builder markup. **17/36 render HTML tables** (all 14 ordinary-tip posts and three offer-news posts). No body is safe to import or publish **as-is**. Editorial text can be considered for a dated, inert preview only after source-locking, sanitising links, and reviewing the claims.

## Columnist articles — 4

These have substantial conventional-looking editorial copy (John roughly 30–31k visible characters, Seymour roughly 4–6k) and no rendered tables. They are the clearest candidates for **dated, noindex, links-inert editorial previews**, while preserving the original weekly date and author. The affiliate links and any quoted odds/offer claims still need a separate pass. A full Gutenberg conversion requires authenticated raw-content and Yoast readback checks; the public REST is insufficient.

| ID | Exact path |
| ---: | --- |
| 91110 | `/epl-game-week-7-2026-27-season-premier-league-tips-john-newsome.html` |
| 90942 | `/epl-game-week-6-2026-27-season-premier-league-tips-john-newsome.html` |
| 90999 | `/saturdays-horse-racing-preview-tips-10th-october-2026-seymour-biz.html` |
| 90836 | `/saturdays-horse-racing-preview-tips-3rd-october-2026-seymour-biz.html` |

## Ordinary racing-tip / offer-tip hybrid posts — 14

Each renders a table and `/go/` links. The dated race selections and odds are historical, not current tips. These need a table/source-date model and affiliate-offer separation; do not flatten rendered tables into Gutenberg or call the tips “today” in an undated preview. Public REST showed no literal Ninja shortcode, but **raw shortcode status remains unknown**.

| ID | Exact path |
| ---: | --- |
| 91113 | `/extra-place-races-today-tips-13-october.html` |
| 91093 | `/extra-place-races-today-tips-12-october.html` |
| 91076 | `/extra-place-races-today-tips-11-october.html` |
| 91055 | `/cesarewitch-extra-places-tips-10-october.html` |
| 91018 | `/extra-place-races-today-tips-9-october.html` |
| 90995 | `/extra-place-races-today-tips-8-october.html` |
| 90976 | `/extra-place-races-today-tips-7-october.html` |
| 90959 | `/extra-place-races-today-tips-6-october.html` |
| 90940 | `/extra-place-races-today-tips-5-october.html` |
| 90900 | `/lucky-15-tips-triple-odds-4-october.html` |
| 90898 | `/extra-place-races-today-tips-4-october.html` |
| 90875 | `/extra-place-races-today-tips-3-october.html` |
| 90852 | `/extra-place-races-today-tips-2-october.html` |
| 90833 | `/extra-place-races-today-tips-1-october.html` |

## Offer-led news / event posts — 18

All contain `/go/` links and date-specific promotion or refund mechanics; three (`90978`, `90925`, `90816`) also render tables. Even if the prose is structurally simple, the offer headline, eligibility, terms and destination need to come from a verified central ACF offer record or remain withheld. Event articles are historical once their match/race date passes. These are **not safe evergreen editorial imports**.

| ID | Exact path |
| ---: | --- |
| 91115 | `/champions-league-bet-builder-refund-arsenal-v-lille-13-october.html` |
| 91111 | `/money-back-if-2nd-leicester-1324-13-october.html` |
| 91095 | `/coventry-v-newcastle-bet-5-get-5-12-october.html` |
| 91091 | `/money-back-if-2nd-yarmouth-1454-12-october.html` |
| 91074 | `/money-back-if-2nd-chepstow-1512-11-october.html` |
| 91057 | `/liverpool-v-man-city-builder-bonus-11-october.html` |
| 90978 | `/free-bet-builder-premier-league-10-october.html` |
| 91053 | `/money-back-cash-2nd-3rd-york-1330-10-october.html` |
| 91016 | `/money-back-cash-2nd-3rd-chepstow-1543-9-october.html` |
| 90993 | `/money-back-if-2nd-bath-1515-8-october.html` |
| 90974 | `/money-back-if-2nd-nottingham-1629-7-october.html` |
| 90957 | `/money-back-if-2nd-leicester-1331-6-october.html` |
| 90925 | `/england-v-czech-republic-bet-builder-refund-6-october.html` |
| 90938 | `/money-back-if-2nd-pontefract-1550-5-october.html` |
| 90816 | `/croatia-v-england-bet-builder-bonus-3-october.html` |
| 90874 | `/money-back-cash-2nd-3rd-ascot-1500-3-october.html` |
| 90851 | `/money-back-if-2nd-ascot-1500-2-october.html` |
| 90832 | `/money-back-if-2nd-nottingham-1358-1-october.html` |

## Priority implication

The four columnist routes are the best first local preview candidates because the editorial substance is substantial and their archive templates already exist. The 14 table-driven tip hybrids should follow only after a dated selection/table contract; the 18 offer-led stories require terms/offer verification and should stay inert. None of these 36 should be filled from the older staging snapshot, because they are absent from it. The local exact-URL coverage audit must be rerun against a refreshed live inventory before any launch claim.
