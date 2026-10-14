# Bet365 review: bounded staging Gutenberg draft — 13 October 2026

This is a CMS editing proof, **not a replacement** for the published review, an approved offer, or an indexable launch page.

## Fresh source comparison

- The exact page is WordPress **page 87553**, slug `/bet365-review`, despite its admin title `bet365 review PPC`. Live and staging were both published and last modified `2026-09-01T13:57:27` at the time of this run. Their visible rendered text matched exactly (SHA-256 `5eb61d1a685a283c136a68dec58293194400d4c8db667c97f105288b67f0d4b1`). The rendered HTML hashes differed because the host-specific output differs.
- The staging raw body was 19,484 characters with **one `fl-builder/layout` block**, not an independently editable set of core Gutenberg sections. It was backed up unchanged to ignored local `data/raw/staging-bet365-review-original-87553-2026-10-13.json` immediately before draft creation.
- The article says Seymour tested with a **£20** bankroll; live/staging Yoast meta description says he was given **£30**. Its £30 welcome-offer headline is a separate claim. No £30 amount, free-bet terms, operator CTA, odds, current payment/streaming or regulation claims were copied to the draft.

## Staging-only write and readback

- Created unpublished **page 91012**, slug `migration-draft-bet365-review-editorial-20261013`, with four core Gutenberg blocks: two headings and two paragraphs. The body contains only the original dated description of Seymour's £20 test and the first paragraph of his historical first-person verdict. This is deliberately incomplete, not a rewritten review.
- Authenticated readback: draft ID/slug/status matched; raw Gutenberg body matched byte-for-byte and contained four block openers; no £30, free-bet, `/go/`, ad, or hyperlink appeared. The published page 87553's slug, status, modified time, raw-body hash and Yoast JSON were independently re-read and unchanged.
- Anonymous REST read of draft 91012 returned **401**; anonymous page-path request returned **404**. Yoast's computed metadata for the draft still reports `index,follow`, which is not exposed while unpublished, but must **not** be accepted as launch SEO. It has no copied Yoast description; it must be authored and verified before any publication.
- An authenticated staging WPGraphQL query returned page `91012` with `status: draft` and rendered content containing the £20 first-hand method. This proves the bounded Gutenberg draft is retrievable for a preview; it does **not** prove Astro has switched its published review source.
- No live WordPress write, published staging-page update, ACF offer update, CTA activation, or deploy occurred.

## Remaining editorial/CMS work

Resolve the £20 test/£30 meta inconsistency with the owner. Decide which dated first-hand observations can remain in a current review, and independently verify licensing, customer/employee counts, payment timings, Best Odds Guaranteed, streaming access and ratings before adding them. Model the approved welcome offer as a linked central ACF offer slot, not duplicated prose. Compose the full review in Gutenberg/typed ACF sections, verify WPGraphQL output and Astro rendering against the approved template, preserve the exact `/bet365-review` URL and Yoast intent, then consider replacing the published builder page only with a backed-up, reversible, owner-reviewed cutover.

Read-only audit: `node --env-file=.env.local scripts/audit-bet365-cms-draft.mjs`. Bounded writer: `node --env-file=.env.local scripts/create-staging-bet365-editorial-draft.mjs --apply`; **do not rerun** because its unique slug and exclusive backup path intentionally fail closed.
