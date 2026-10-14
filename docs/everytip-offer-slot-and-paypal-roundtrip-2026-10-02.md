# Staging offer-slot and PayPal roundup roundtrip — 2 October 2026

Scope: staging WordPress and the local Astro pilot only. No live WordPress edit, launch or active commercial link.

## Offer slot

- Staging plugin `EveryTip Content Model` v0.3.0-dev is active. Gutenberg lists `EveryTip Offer Slot`.
- Draft post **90867** (`staging-only-offer-slot-roundtrip`) stores an ACF Gutenberg block referencing draft offer **90846**. Its source read back byte-for-byte through authenticated REST.
- The rendered marker `data-everytip-offer-slot="90846"` read back through both authenticated REST and WPGraphQL. Anonymous access to the separate editorial offer route remained 403; authenticated access was 200.
- Local `/pilot/offer-slot-roundtrip/` parses the WPGraphQL capture, recognises the offer reference and deliberately withholds the unapproved offer. No terms, destination or CTA are embedded in the post.
- `approvedOfferForSlot` now also requires a published WordPress offer post, in addition to explicit approved-ID input, ACF active status, verified copy, country and date checks. A commercial CTA still needs a separately verified destination rule before launch.

## PayPal roundup conversion

- Published source **58743**, exact legacy path `/best-paypal-betting-sites.html`, was **not edited**. A separate staging draft **90868** (`staging-gutenberg-conversion-paypal-roundup-2026`) was created for review.
- The current rendered source became **200 Gutenberg blocks**. Its global Beaver offer ladder became four ACF references to staging offer drafts 90846, 90850, 90849 and 90852. The Ninja payment table became a core table, and five images became image blocks.
- Editorial visible-text parity was **25,349 / 25,349 characters** after whitespace normalisation, excluding the replaced Beaver offer ladder. Source links were stripped in the draft to avoid active affiliate destinations. REST and WPGraphQL returned four markers, one table and five images with no active links or Beaver/Ninja wrapper markup.
- Local `/pilot/paypal-gutenberg-roundtrip/` displays the actual WPGraphQL draft content inside the Astro roundup layout, with no active offers and a noindex warning. The 37-row, nine-column legacy payment table now has the Dark Horse-style mobile expander: bookmaker, deposit time and withdrawal time remain visible, while each row’s other six fields open behind a “+”. Every figure still needs dated verification.
- ACF field group **90831** (`EveryTip Roundup Guide (Pilot)`) is attached by the `Betting Guides` category, which the draft now inherits from its source. Its Post Object picker filters to `EveryTip Offer` and accepts both **Published** and **Draft** records, so editors can stage a roundup before an offer goes live. The group is exposed in REST as well as WPGraphQL.
- Draft **90868** now has four staging-only ranked entries in ACF, in Betfred / Betway / Spreadex / 10Bet order, linked to draft offers **90846 / 90850 / 90849 / 90852**. Their `best_for` and `editorial_verdict` text is an editable design fixture and makes no approved payment or offer claim. Authenticated REST and WPGraphQL returned the same four entries and IDs; the Gutenberg body and draft status stayed unchanged. The local roundup cards use those ACF fields for order and copy. Logo/brand identity remains a preview-only local mapping pending a reliable WordPress bookmaker data adapter; terms, link and CTA remain withheld. The four in-body offer-slot markers back the ranked cards and are not rendered a second time.

## Not ready for publication

The old editorial body still contains many dated PayPal availability, payment-limit, licensing, welcome-bonus and financial statements. Text parity is not factual approval. The table, in particular, has a known contradiction in 10Bet values. Eric needs a content review, the 37-row payment dataset needs dated verification, and inline promotional paragraphs must be replaced or reconciled with central offer records. Confirm the 200 blocks in a normal Gutenberg browser session: the Codex in-app browser shows a blank editor canvas even though REST, WPGraphQL and the local preview render correctly. Keep both staging drafts unpublished.

Repeatable probes: `node --env-file=.env.local scripts/probe-offer-slot-roundtrip.mjs`, `node scripts/preview-paypal-roundup-conversion.mjs`, `node --env-file=.env.local scripts/seed-paypal-roundup-pilot.mjs`, `node --env-file=.env.local scripts/probe-paypal-roundup-render.mjs`, and the read-only `node --env-file=.env.local scripts/probe-roundup-acf.mjs`. They are restricted to the staging hostname. Their local captures under `data/raw/` and credentials in `.env.local` are ignored by Git.
