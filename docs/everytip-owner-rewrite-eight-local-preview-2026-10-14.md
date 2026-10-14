# Owner-rewritten legacy routes — local review only (14 October 2026)

The eight still-live URLs in `../legacy-rewrites/CODEX-HANDOFF.md` are now backed by exact-path local preview records. Their handoff HTML and editorial SEO metadata were copied without altering the owner source into `data/owner-rewrites/`; each HTML file is SHA-256 locked in `src/lib/owner-rewrite-preview.mjs`. The route generator requires the corresponding dated live-crawl 200 path, no verified redirect and the exact old-snapshot exclusion (builder markup, active embed or empty content) before it will build a page.

| WordPress ID | Exact route |
| --- | --- |
| 56061 | `/betfred-pick-your-punt` |
| 72881 | `/quinnbet-bonus-code` |
| 60150 | `/which-countries-is-bet365-available` |
| 34795 | `/acca-insurance/paddy-power` |
| 12138 | `/bet-on-horse-racing-from-india.html` |
| 7945 | `/learn-how-to-make-money-trading-on-betfair-without-any-experience-and-a-50-bankroll.html` |
| 10754 | `/free-horse-racing-system.html` |
| 1482 | `/steve-mullens-tips.html` |

The renderer removes legacy Beaver layout shortcodes and entire source lines containing `/go/`, then uses the existing allowlist sanitizer, which disables remaining links. A prominent dated warning says that legal, country, offer and promotion claims are **not reverified or approved for publication**. All pages remain `noindex,nofollow` previews, not public replacements; the source was the 4 October owner handoff, not a fresh staging Gutenberg conversion. WordPress post/page status, current body, Yoast metadata, media and responsive layout still need a fresh readback before release. The Paddy Power live Thrive rendering caveat in the handoff also remains unresolved.

The eight routes close only the dated crawl's local-asset gap. They do not address the separate newer-live 31-post queue or remove the site's preview robots and commercial safeguards. No WordPress, Cloudflare or DNS change was made.
