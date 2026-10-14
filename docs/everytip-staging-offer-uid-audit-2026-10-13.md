# Staging offer UID audit — 13 October 2026

This is a read-only identity and write-capability audit of the seven central offer drafts on EveryTip staging. No offer field, post status, destination, CTA, live WordPress record or Cloudflare deployment was changed.

| Staging offer ID | Partner | Current `et_offer_uid` |
| --- | --- | --- |
| 90846 | Betfred | `betfred-welcome-001` |
| 90848 | QuinnBet | missing |
| 90849 | Spreadex | missing |
| 90850 | Betway | missing |
| 90851 | NetBet | missing |
| 90852 | 10Bet | missing |
| 90889 | BetWright | `betwright-bangers-n-cash` |

All seven remain WordPress drafts. The authenticated `everytip/v1/offer/{id}` endpoint exposes `et_offer_uid` but is registered as read-only in the current content-model plugin. The native `wp/v2/et_offer/{id}?context=edit` response exposes no ACF fields, including `et_offer_uid`; the local ACF field group explicitly has `show_in_rest` disabled. Therefore the current REST surface does not support a guarded single-field UID update. A generic post update cannot reliably set this field, and an optimistic-concurrency/readback workflow cannot be completed through these routes.

Potential names such as `quinnbet-welcome-001` would be consistent with Betfred's UID, but the other existing UID is descriptive, and a UID must be permanent. Do not assign guessed values merely to remove the missing-field flag. Decide and document the naming convention, then add a capability-checked, exact-field write path with a revision token (or use the ACF editor), back up each full offer record, and verify each individual write. No commercial CTA should be enabled by this UID housekeeping.

Repeat the read-only audit with `node --env-file=.env.local scripts/audit-staging-offer-uids.mjs`; it prints only IDs, partner labels, statuses, UIDs and REST field exposure, not offer copy, destinations or credentials. Staging was slow but responded on this run.
