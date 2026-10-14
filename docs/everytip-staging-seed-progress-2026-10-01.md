# Staging offer seed progress — 1 October 2026

Update, 2 October 2026: REST inventory resolved the previously uncertain Betway and BetWright drafts as **90853** and **90855**. Title-only NetBet **90872** and 10Bet **90873** bookmaker drafts were then created on staging and read back. All seven bookmaker identities now exist as drafts; none has been approved for publication. The existing offer-group Post Object picker now includes Published and Draft bookmaker statuses. Six saved offer→bookmaker relationships were independently verified via authenticated WPGraphQL: Betfred 90846→90840, QuinnBet 90848→90842, Spreadex 90849→90844, Betway 90850→90853, NetBet 90851→90872 and 10Bet 90852→90873. The staging ACF Offer Type field now also has `ongoing_rewards : Ongoing or rewards`, verified after reload. BetWright remains a bookmaker draft without an offer record because its rewards programme is not a Welcome offer and its approved copy has not been supplied. The table below records the earlier 1 October state for audit history.

Scope: the cloned **staging** WordPress application only (`wordpress-159231-2098144.cloudwaysapps.com`). No live WordPress changes and no Astro publication.

| Record | Staging post ID | State | Notes |
| --- | ---: | --- | --- |
| Betfred bookmaker | 90840 | Saved draft | No evergreen USP added: the live line is an offer-card highlight. |
| QuinnBet bookmaker | 90842 | Saved draft | No evergreen USP added. |
| Spreadex bookmaker | 90844 | Saved draft | Confirmed in staging bookmaker list. |
| Betway bookmaker | ID pending | Save submitted; not yet list-verified | Title only; no USP, logo or review URL. |
| BetWright bookmaker | ID pending | Save submitted; not yet list-verified | Title only; no USP, logo or review URL. |
| NetBet and 10Bet bookmakers | — | Not created | Staging browser timed out while opening the next editor. |
| Betfred offer | 90846 | Saved and reopened draft | Exact JP-supplied headline/short terms and live-card highlight stored; full terms, URL, country, dates and bookmaker relation blank. ACF status remains Draft. Anonymous editorial REST returned 403. |
| QuinnBet offer | 90848 | Saved draft | Confirmed in staging offer list after transient connection warning. |
| Spreadex offer | 90849 | Saved draft | Short terms copied from live page; unverified. |
| Betway offer | 90850 | Saved draft | Short terms copied from live page; unverified. |
| NetBet offer | 90851 | Saved draft | Source wording needs particular editorial/compliance review. |
| 10Bet offer | 90852 | Saved draft | Euro-denominated terms; market and country mapping still unknown. |

The offer admin's `Bookmaker` Select2 field stayed on “Searching…” when selecting a draft bookmaker. Do not publish bookies merely to make the selector work. Resolve the relationship after testing the ACF query/status behaviour or add an editorial relationship mechanism that supports drafts.

The existing offer-type choices are Welcome, Existing-customer and Event. BetWright's Bangers N' Cash is a rewards programme and should not be inserted as Welcome merely to fill the seven-card ladder. Add a suitable `ongoing/rewards` classification and test it before seeding that record.

The staging admin intermittently timed out. Six offer drafts are confirmed in its list. The missing bookmaker drafts were created only after a REST identity check avoided duplicates. Every imported short term is source copy, not current bookmaker verification. Full approved terms, affiliate destinations, eligibility and geo checks are still required before any record can be activated or rendered on a public page.
