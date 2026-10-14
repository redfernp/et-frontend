# Local-only live columnist feed preview — 14 October 2026

The default/static build is unchanged. No WordPress page, CTA, offer, DNS or deployed site was changed.

Fresh public WordPress REST inspection after 30 September found recent ordinary-post listings dominated by updated evergreen tips hubs and dated bookmaker-offer news. For example, the 13 October newest list contains John Newsome post 91110, offer-news posts 91115/91113/91111, and frequently updated evergreen tips hubs. The offer-news items are not suitable for an unverified current-content feed. Seymour's latest local-safe columns are dated 8 and 1 October; John has columns dated 13 and 5 October. No unrelated or offer-story item was inferred into the preview.

The opt-in `MIGRATION_EXACT_PREVIEW=1` plus `MIGRATION_LIVE_EDITORIAL_FEED_READ=1` uses the existing independently source-checked October weekly-column overlay. It reads four exact live public REST posts (John 91110/90942; Seymour 90999/90836), validates their identity and body filters, and requires corresponding inert exact local `.astro` article assets. The homepage's columnist cards and free-tips editorial list then show only these dated records, clearly labelled as live REST review data; links go only to their exact local article previews. Neither page presents them as current picks, odds, offer stories or commercial CTAs. Both exact pages remain `noindex,nofollow`.

The staging WPGraphQL feed flags are mutually exclusive with this live-review opt-in on the corresponding page. If the four source checks, exact assets, or live REST reads fail, the opt-in build fails rather than silently reverting to stale data.

Fresh live REST readback of **all four** posts at 22:02:22 UTC on 13 October (00:02:22 Europe/Rome, 14 October) returned all four IDs and exact paths in order. Latest publication was 13 October; source freshness was one day as of 14 October. This is a **review timestamp**, not approval to republish the underlying predictions.

Checks: `node --test tests/live-editorial-preview-feed.test.mjs` passed 2/2; `npm run check` passed with 0 errors and warnings. The parent agent will run integrated opt-in compilation after this receipt.
