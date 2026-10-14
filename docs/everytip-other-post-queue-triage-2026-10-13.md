# “Other” Gutenberg queue triage — 13 October 2026

Local-only classification of the queue produced by `run-staging-post-conversion-queue.mjs --family=other`: **141** published posts from the 2 October snapshot. The queue excludes posts with dated preconversion backups, exact `*-seymour-biz.html`/`*-john-newsome.html` paths, all 15 posts in the authenticated raw Ninja audit, and bodies rejected by the strict converter with linked-image rejection. This is a structural snapshot screen, **not** a current staging read or approval to write. No WordPress change was made here.

| Group | Count | Treatment |
| --- | ---: | --- |
| Historical recurring racing/football prediction columns | 92 | 32 racing (including ID `54012`, whose generic slug hides Seymour) and 60 football. Verify WP author before assigning these to the Seymour/John lanes. They are dated records, not current daily-tip feeds; many contain legacy bookmaker-review links. |
| Other tips/tipster-labelled hubs | 15 | Mostly old country/sport hubs; several contain direct `/go/` or external affiliate links. Only the short priority list below lacks direct affiliate links in the saved body. |
| Reviews, money pages, offer/legal/guide features | 34 | Do not feed into an indiscriminate “daily tips” batch. Includes bookmaker/tipster reviews, country betting guides, streaming and festival content, legal claims and general sports features. |

**There is no recent ordinary daily-tip post in this 141-record queue.** Its nine 2026-dated records are reviews, money/guide pages, strategy or streaming content; the active tips hubs with Ninja placements were explicitly excluded. The apparent top candidate is Paddy Power review `11315`, not a daily tip.

## Smallest low-risk daily-tip candidates

1. `12743` — `/malaysia-horse-racing-tips.html` (2020): short prose, one internal related-tips link, no direct affiliate destination in the saved body.
2. `3908` — `/canada-horse-racing-tips.html` (2014): prose and internal related/money-page links, no direct affiliate destination in the saved body.
3. `1474` — `/usa-horse-racing-tips.html` (2019): longer prose and internal related/money-page links, no direct affiliate destination in the saved body.

These are **conversion candidates only**, not verified current tips or launch-ready pages. Their staging-host links still need exact-path normalization, and their factual/currentness claims need editorial review. For each, the sole staging writer should run the existing dry-run guard against current `content.raw`/`modified`, save an exclusive before-state, convert one at a time, and independently verify raw/rendered text, links, metadata and Yoast. If current content differs, stop.

`4003` (`/betdaq-tips.html`) has no links in the saved body but is bookmaker-branded and very old; hold for brand/currentness review. The other sport/country tips hubs are not clean candidates: for example rugby `17877` links directly to a Bet365 affiliate URL; Macau `1540`, golf `4037`, Germany `6767`, Mysore `14927`, Trav `16193`, Turkey `7573`, Happy Valley/Sha Tin `12719` and Meydan `12682` contain `/go/` destinations or old promotional copy. Tennis `4138` also has external affiliate links. Do not treat the absence of `/go/` alone as commercial clearance.

The 92 historical column-like posts are a separate, larger conversion pool after author attribution and legacy-review-link audit. Their published-body conversion may be mechanically safe after current readback, but their aged tips and commercial references must remain clearly dated and cannot be treated as current predictions or current offers. The 34 other pages require page-family/editorial decisions before bulk conversion.
