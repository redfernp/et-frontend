# Seven central offers — read-only release gate (14 October 2026)

Scope: the staging ACF `et_offer` drafts linked to EveryTip's seven live free-bets ladder partnerships. This compares the ignored local capture `data/raw/staging-seven-offer-copy.json` (authenticated staging read, 3 October), the 13 October authenticated UID/field audit receipts, and the live [free-bets ladder](https://www.everytip.co.uk/bookie-free-bets-bonus-offers) read on 14 October. It makes **no** staging/live edit and does not validate current operator promotions or legal compliance.

| Partner | Staging offer ID | Captured/live displayed headline | Stable UID | Specific editorial check |
| --- | ---: | --- | --- | --- |
| Betfred | 90846 | Bet £10 Get £50 in Free Bets | `betfred-welcome-001` | £30 sports + £20 Bet Builder wording; seven-day free-bet expiry is **not** a promotion end date. |
| QuinnBet | 90848 | Get 50% Back In Free Bets Up To £25 | Missing | The displayed disclosure says new **UK** customers; confirm territory and first-day-loss mechanics before setting eligibility. |
| Spreadex | 90849 | Bet £10, Get £60 in Free Bets | Missing | Keep fixed-odds and spread components separate; preserve the spread-loss warning. |
| Betway | 90850 | Bet £10, Get £40 in Free Bets | Missing | Confirm debit-card restriction, token conditions and expiry with the operator. |
| BetWright | 90889 | Bangers N' Cash Rewards | `betwright-bangers-n-cash` | `ongoing/rewards`, **not** an assumed welcome offer; confirm current opt-in and reward mechanics. |
| NetBet | 90851 | Up to £30 in Sports & Casino Bonuses | Missing | The live wording includes casino spins and wagering conditions; review the sports/casino split and country applicability. |
| 10Bet | 90852 | Up to £50 Welcome Bonus | Missing | The displayed title uses **£** while the compact terms use **€** amounts and code `PLAY10`; resolve market/currency before UK placement. |

All seven captured staging records have `public_headline` and `compact_terms` populated from the owner's approved **space-restricted** wording on the live ladder. They remain WordPress `draft` with editorial `et_offer_status=draft`; copying the approved wording is **not** proof the promotions are still available. A display-specific `et_offer_full_terms_url` and copied `full_terms` are blank for 7/7; the owner explicitly chose central space-restricted copy, so those are optional enhancements, not a reason to demand pasted operator legal text.

The latest authenticated field inventory found these mandatory release-data gaps: `et_offer_eligibility`, `et_offer_countries_include`, and `et_offer_last_checked` are blank on **7/7**; `et_offer_uid` is blank on the five marked above. The 13 October inventory did not independently verify the optional CTA label, highlight, exclusion countries or start/end dates. Empty start/end fields must not be filled by guessing; expiry inside compact terms may describe token validity, not offer availability. The private `et_offer_source_url`, `et_offer_checked_by`, compliance notes and existing ACF `affiliate_url` are **unknown/unverified**, not proven blank, because the capability-checked read route intentionally omits them and public GraphQL excludes the destination. Live `/go/` links show a legacy path exists but do not prove its current target or the staging relationship.

## Required before commercial activation

1. Eric/JP confirm each operator's current promotion, territory, customer eligibility and qualifying mechanics against a dated source, then fill the central offer record's eligibility, included-country and last-checked fields. Review the four specific exceptions above (Spreadex, BetWright, NetBet, 10Bet) separately; do not infer one shared UK welcome-offer rule.
2. Choose permanent UID names for the five missing records, then use a specifically authorised guarded staging write/readback path or the ACF editor. The local v0.7 UID endpoint is **not** installed on staging; do not treat the older v0.6 upload approval as v0.7 approval.
3. Through a privileged, non-public check, verify each `affiliate_url` or internal `/go/` resolution, destination ownership, sponsored/nofollow handling and geo routing. Keep raw affiliate destinations out of public WPGraphQL and copied article blocks. Record verification without printing secrets or tracking links in an audit log.
4. Read back offer→bookmaker/type relations, exact headline and compact terms from staging REST and WPGraphQL; verify the seven live-ladder placements, sidebars, reviews and free-bets references resolve one central record. Only after an explicit activation decision should WordPress publication/editorial status or Astro commercial CTA flags change.

This gate intentionally separates **copy captured**, **fields populated**, **operator verification**, and **permission to activate**. As of this audit, only the first is supported; all commercial CTAs remain withheld.
