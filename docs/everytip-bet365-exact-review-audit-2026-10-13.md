# Exact Bet365 review migration audit — 13 October 2026

This is a local, noindex preview audit, not approval to publish the review or enable an offer. Source: live `/bet365-review` read-only on 13 October, cross-checked with the 2 October staging WordPress snapshot (page 87553, modified 1 September 2026). No WordPress or Cloudflare writes.

## Exact URL and SEO

| Item | Source | Local exact preview |
| --- | --- | --- |
| Path | `/bet365-review` (live 200, indexable in September crawl) | `/bet365-review`, 200 |
| Title | `Bet365 Review 2026 \| Up to £30 in Free Bets \| EveryTip.co.uk` | `Bet365 Review 2026 \| EveryTip` while offers are disabled |
| Meta description | `Looking for an honest bet365 review in 2026? We gave our feature horse racing writer Seymour Biz £30 to test drive Bet365. What did he think?` | Neutral dated-review description |
| Robots | Source `index,follow` | `noindex,nofollow` **preview only** |
| Canonical | Source snapshot points to staging host; September crawl reports live self-canonical | No canonical in preview |

The source meta description says **£30 bankroll**, but its first-hand method says **£20**. This is an editorial inconsistency to resolve before launch; do not carry the source meta text over blindly. The exact public URL is intended to remain indexable on production once the release gate passes. `/bet365-review.html` is a separate 301 to `/bet365-review` in the crawl and must stay a redirect.

## Identity and body retention

The staging admin title `bet365 review PPC` is misleading. Identity is the exact slug and page ID 87553, not that title. The owner says a separate PPC/noindex version exists, but its exact slug is still unconfirmed. Snapshot pages `/bet365-review-redesign` (89169) and `/bet365-review-old` (43135) are distinct records; neither is silently merged into this route.

The live source and dated snapshot agree on the H2 `Bet365 Review 2026`, Seymour’s £20 testing method, all ten numbered review areas, pros/cons and two first-person final-verdict paragraphs. The exact preview now preserves the full noncommercial text of areas **2–10**, method, six source-written pros and three cons, and both verdict paragraphs. The offer-led area 1, repeated welcome headlines, compact/full terms, sign-up prompts and affiliate destinations remain withheld until central ACF offer data is verified. The first pro (welcome-offer claim) and last pro (specific withdrawal timing/minimum) are also withheld. It does not copy the pilot’s placeholder section summaries.

Source-specific claims still need factual checks before indexable launch: regulatory/licensing numbers, sports/streaming conditions, Best Odds Guaranteed, withdrawal methods/times, promotions, and the 4.8/5 rating. The old rating widgets reportedly exposed 3.9/5 to assistive technology, and the displayed category scores do not average to 4.8. The exact preview therefore makes no score/schema claim. The visible source date and noindex banner keep this distinction clear.

Validation: review extractor unit tests, `npm run check`, and offline build output checks confirmed the exact route, noindex robots, retained Seymour method/verdict, no active `/go/` link, and no £30 offer amount. Fresh live/staging SEO and claim verification remains a launch gate.
