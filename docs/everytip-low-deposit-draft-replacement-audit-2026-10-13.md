# Low-deposit roundup replacement audit — 13 October 2026

Read-only comparison of the approved **Astro roundup design** and staging Gutenberg/ACF **draft 90880** with published staging **post 33470** and live public post 33470. No WordPress write, deployment, offer activation or replacement was attempted. The design approval does not imply content/offer approval.

## Identity and editorial body

| Check | Published source 33470 | Draft 90880 | Result |
| --- | --- | --- | --- |
| Slug/status | `low-or-no-minimum-deposit-betting-sites`, published, exact live `.html` path | `staging-gutenberg-conversion-low-deposit-roundup-2026`, draft | Separate pilot, **not** URL/identity parity |
| Date/modified | 25 Sep 2026, staging and live match | 2 Oct 2026 | Original publication dates must remain with 33470 |
| Editor body | 12,627 raw chars, no core blocks | 15,317 raw chars, **67** core blocks | Structure converted in separate draft only |
| Rendered visible text | 9,783 normalized chars | 9,783 normalized chars | **Exact match** under whitespace normalization |
| Raw visible text | 9,726 chars | 9,783 chars | Not byte/text-identical: source raw has entity/typographic differences; rendered parity is the supported claim |
| Internal/commercial anchors | Betfred review and one `/go/betfred` affiliate link | Betfred review only | **Link destination lost**; cannot declare replacement parity |
| Images | Four media placements, same four upload paths as live | Same four upload paths | Placement/path parity, after staging-host normalization |

The published live post and published staging source have the same WordPress ID, slug, title and modified timestamp. Live `content.rendered` matches the draft’s rendered visible text; the legacy body has not gained a newly observed editorial paragraph since the staging copy. This does **not** prove that all builder metadata, author/category settings and Yoast fields would survive a write. A follow-up authenticated metadata read timed out after 30 seconds; no retry/write was made.

## Ranked card and deposit/payment facts

The source does **not** contain a semantic HTML `<table>` despite saying “table” in its copy. It has one detailed Betfred profile, two Betfred logo placements, and paragraph-form facts: **£5 minimum deposit**, **£/€5** deposit, **“All Methods”** payment option, **£/€0.01** minimum bet and **£/€10** minimum withdrawal. All remain in the draft’s Gutenberg body (hence rendered text parity). The draft’s ACF `ranked_entries` contains only **one** Betfred entry, linked to offer **90846**, with `best_for` and a cautionary editorial verdict. It does **not** structurally encode those four deposit/payment facts or convert the repeated legacy offer/terms paragraphs into a single central-offer reference. The published source has no ranked entries.

The repeated legacy body copy says `BETFRED50`, **3 × £10 sports plus 2 × £10 Acca free bets within 10 hours**. The user-approved space-restricted Betfred copy captured in offer 90846 instead says **£30 sports plus £20 Bet Builder free bets within 24 hours** of settlement. This is a real offer-terms mismatch, not a formatting difference. Draft 90880 still contains the old copy twice. The current staging offer 90846 is itself a **draft** and its authenticated field-presence read still shows no eligibility, included countries, last-checked date or full terms. Its approved short copy should be the central source when those publication checks are completed; do not simply re-enable the old body CTA.

Several other source claims also need current checking before indexable use: “no minimum deposit” positioning, debit/credit-card wording, PayPal/Neteller/Skrill fee and processing assertions, old bookmaker minimums, and hypothetical jackpot/payout examples. Rendered-text equality does not validate those facts.

## SEO and replacement decision

The published source’s Yoast title is `No Minimum Deposit / Low Deposit Betting Sites [2026 UK Guide]`; description says the page lists low/no deposit bookmakers; robots is `index,follow`, and the live canonical is the exact `.html` URL. Draft 90880 has a **staging-only title**, no matching description, a `?p=90880` canonical, and its own draft status. Copying/publishing it as a second URL would create duplicate/incorrect SEO; replacing post 33470’s body alone would still leave legacy claims and the dropped commercial link problem.

**Decision: no write.** The current draft is an excellent Gutenberg-to-Astro layout and text round-trip proof, but not a complete Gutenberg+ACF replacement of post 33470. Next safe sequence: map each displayed bookmaker/deposit fact to typed, editor-owned fields or explicitly retain it as dated editorial; remove repeated obsolete offer copy and insert the single ACF offer reference; verify exact media/link destination intent; resolve current offer eligibility/terms and factual claims; then perform a one-post staging-only guarded backup/write/readback of **33470** preserving its ID, slug, status, author/date/categories and Yoast. A fresh live/staging check is required immediately before any eventual production migration.

## Unpublished draft repair later on 13 October 2026

The table and no-write verdict above describe the **initial audit**. A bounded cleanup was subsequently made to **draft `90880` only**, not published original `33470`. The current live and staging originals still shared post ID/slug, modified time and 9,783-character rendered text before the cleanup. A full pre-repair staging source/draft copy was saved under ignored `data/raw/wp-low-deposit-draft-90880-pre-repair-2026-10-13T21-47-03.980Z.json` before any POST.

Four discrete old-offer Gutenberg paragraphs—block indexes 6, 8, 22 and 23—were removed. They contained the old `BETFRED50` headline, two identical space-restricted terms paragraphs and a repeated welcome-offer claim. Every other block remained byte-identical, taking the private draft from 67 to **63** Gutenberg blocks. An independent REST readback confirmed **18 headings, four source image paths, the non-commercial Betfred review link, one ACF ranked offer relationship to draft `90846`, unchanged categories/author/title, and no `/go/` link**. The old `BETFRED50`, 3 × £10 sports / 2 × £10 Acca and £10/£50 offer claims are absent from the repaired draft. The original `33470` remained published with unchanged slug, body and modified timestamp. WordPress advanced the draft's date during the content write; the pre-repair 2 October draft date was restored and checked again.

The source Yoast title and description were copied to the unpublished draft through the revision-guarded staging editorial-SEO endpoint. Its staging-only draft slug and `?p=90880` canonical remain deliberately separate; no published URL or robots rule was changed. REST and authenticated WPGraphQL still return the one ACF ranked entry and draft body. The ignored local Astro capture was refreshed. `scripts/repair-low-deposit-roundup-draft.mjs`, `scripts/reconcile-low-deposit-draft-date.mjs`, `scripts/staging-editorial-seo.mjs` and `scripts/probe-low-deposit-roundup-render.mjs` contain the reproducible guards/readbacks. Focused low-deposit tests passed; `npm run test:content` passed 121/121. `npm run check` at this moment reports two diagnostics in a concurrently edited generic route (`src/pages/[...legacyPath].astro` lines 29 and 32), unrelated to this draft repair; the owning agent was notified.

**Still not a published-original replacement:** the remaining guide contains unverified low/no-deposit, payment method, minimum-bet, withdrawal and generic bonus claims. The single draft ACF offer reference has not been approved for commercial use, the reviewed Betfred terms must resolve centrally before any CTA, and the original's affiliate image link was intentionally not restored. The frontend still withholds the old Betfred profile. Eric's claim review and a final live/staging SEO/media/link comparison are required before touching post `33470` or enabling indexability.
