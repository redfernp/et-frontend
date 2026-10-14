# PayPal roundup original-replacement verdict — 13 October 2026

**Verdict: do not replace published staging post `58743` with draft `90868` yet.** The draft proves Gutenberg/ACF rendering, but it is not a lossless CMS replacement for the original or a publication-ready guide. This was a read-only audit: no staging or live WordPress write, offer activation, or deployment was made.

Read-only authenticated staging REST `context=edit` and public live REST were fetched for the same WP post IDs. Repeatable audit: `node --env-file=.env.local scripts/audit-paypal-staging-replacement.mjs` (a nonzero exit is expected while gates fail). The script requires the named staging hostname, checks ID/status/slug identity and does not print credentials or full HTML.

| Item | Published staging `58743` | Draft `90868` | Current live `58743` |
| --- | --- | --- | --- |
| Identity | `/best-paypal-betting-sites.html`, published | Different staging-review slug, draft | Same exact original slug, published |
| Modified | 25 Sep 2026 | 2 Oct 2026 | **9 Oct 2026** |
| Editor body | One Gutenberg wrapper around Beaver/Ninja, not a true section conversion | 200 core/ACF blocks; four ACF offer-slot references | Public render only |
| Rendered text | 27,097 characters, including staging-only “Edit Table” admin control | 25,349 characters | 27,086 characters |
| Headings | 43 | 43, but three visibly contain literal `&amp;` or `&#8211;` | 43; same heading text as staging original |
| Payment table | 38 rows, 342 cells; text hash `1c8bab7c59fd6f3ca2f6` | Same structure and text hash | Same structure and text hash |
| Rendered images / links | 9 / 22, including one staging-only Ninja admin link | **5 / 0** | 9 / 21 |
| ACF ranked entries | None | Four central offer relationships (`90846`, `90850`, `90849`, `90852`), all review fixtures/draft offers | Not exposed in public REST |
| Yoast | Source title and description, index/follow, exact-path canonical | Staging review title; no source description; draft `?p=90868` canonical | Source title/description, index/follow, live exact-path canonical |

The live post has a later modified timestamp, but **its current visible editorial text, headings, payment table and editorial links match the published staging source** once the staging-only “Edit Table” control and staging-vs-live hostnames are excluded. This does not prove all invisible metadata or offer state is equal, so the current live page must still be re-read before cutover. The 37 body rows of the PayPal table survive the draft conversion, but their old payment limits, fees and 10Bet discrepancy remain unverified.

The draft intentionally removes the global Beaver offer ladder and its four image instances, replacing them with central offer references. It also strips **all** source links, including editorial review, explainer and PayPal links, not just commercial `/go/` URLs. Five images remain as ordinary body blocks, but brand-image replacement through the unpublished ACF offer relationships is not yet a verified WordPress-to-Astro mapping. The literal entities in three draft headings are an actual copy/render defect even though the local Astro pilot previously applied presentation cleanup.

## Safe replacement plan

1. Rebase the conversion from the **current** published staging source and reconcile any live changes by comparing rendered editorial text, links, tables, media and Yoast immediately before write. The present audit shows editorial parity but not identical modified timestamps.
2. Correct the three double-encoded headings in the Gutenberg source. Keep the exact original ID/slug, title, author, date, categories, featured media, template and Yoast title/description/robots/canonical rather than copying the draft identity or SEO.
3. Restore mapped internal and factual outbound editorial links; replace `/go/` links only through the separately approved central offer/CTA model. Verify logo/brand media resolve from CMS relationships, and keep inactive or unknown offers withheld.
4. Have Eric review dated availability, limits, fees, welcome-offer claims and the known 10Bet contradiction. A matching table hash is content-preservation evidence, **not** current factual approval.
5. Save original raw content, ACF, metadata and Yoast locally before any guarded staging-only write. Then update one post by exact ID with a current-modified guard; independently re-read raw/rendered blocks, all 38 table rows, headings, links, media, ACF relationships, original slug/SEO and Astro exact-path/mobile render. Stop and restore from the backup on any mismatch.

Until these gates are met, keep `90868` as an unpublished migration test and leave `58743` untouched. No live WordPress modification is authorized by this audit.

## Same-day staging draft repair — 23:39 Europe/Rome

The table above records the **pre-repair** state. With the original still untouched, the separate unpublished staging draft `90868` was repaired in one guarded batch. Before the body write, its full raw body, ACF values, identity, date and Yoast response were saved in ignored `data/raw/wp-paypal-draft-90868-pre-repair-2026-10-13T21-35-00.518Z.json`. The write was allowed only while the original remained at its audited modified time and the draft retained its exact review identity, 200 blocks and four specified ACF offer references.

The revised draft fixes the three literal HTML-entity headings and restores **exactly seven allowlisted editorial links** (Bet365/Betfred reviews, the Betfair explainer/review and PayPal). No `/go/` link was restored. The 38-row/342-cell payment table, five body images, 200 Gutenberg blocks, four unpublished offer-slot references and ranked ACF entries remain unchanged. WordPress advanced the draft's date on content edit; the original 2 October draft date was restored and independently rechecked. A separate revision-guarded SEO update copied the source Yoast title and description to the draft while keeping its staging-review slug, draft status and `?p=90868` canonical. Both authenticated REST and WPGraphQL independently returned the same seven editorial links, table, media and ACF relations. The refreshed ignored local WPGraphQL capture now feeds the Astro preview; only those seven editorial destinations are allowed through its sanitizer.

Verification: `node scripts/preview-paypal-roundup-conversion.mjs` passed semantic editorial-text parity and affiliate-link checks; `node --env-file=.env.local scripts/repair-paypal-roundup-draft.mjs --apply` saved the backup and checked body/ACF/table/link readback (its first run returned nonzero **only** because WordPress auto-advanced the draft date); `node --env-file=.env.local scripts/reconcile-paypal-draft-date.mjs` restored and verified that date; `node --env-file=.env.local scripts/staging-editorial-seo.mjs 90868 data/raw/wp-paypal-draft-90868-seo-edit-2026-10-13.json --apply` verified SEO readback; `node --env-file=.env.local scripts/probe-paypal-roundup-render.mjs` verified REST/WPGraphQL agreement; `npm run check` reported zero diagnostics and `npm run test:content` passed 121/121.

**The published original is still not replaceable.** The draft deliberately excludes the old Beaver ladder's four images and all commercial links. Its ACF offers are unpublished fixtures; current payment/eligibility facts, 10Bet discrepancy, media/identity relationships, final link destinations and any legal/commercial approval remain unresolved. The source modified timestamps still differ between staging and live even though rendered editorial text and links match after removing the staging-only Ninja admin control. No public release or original-post rewrite followed this repair.
