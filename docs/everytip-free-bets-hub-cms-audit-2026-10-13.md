# Free-bets hub CMS assessment — 13 October 2026

Scope: live and staging WordPress page **56315**, `/bookie-free-bets-bonus-offers`, seven central ACF offer drafts, and the existing exact-path Astro preview. This was a read-only audit. No staging draft was created and neither published page nor offer record was changed.

## Source and extraction

- Both WordPress pages report `publish`, the same slug and modification time `2026-07-23T11:23:59`.
- Staging raw editor content is **9,747 characters**, SHA-256 `a790201cbc8b6de18705d124e64bda7e2f2819ccf794b3b037bf57bfcd5efc13`. It is a Beaver Builder wrapper, not an independently editable Gutenberg body. A full raw source backup is still required immediately before any replacement or separate-draft write.
- Rendered HTML differs at the byte level between live and staging (46,337 vs 47,070 characters), but their **full visible-text SHA-256 matches**: `f928e8d9128c21818c4341dd540c80e32484c3e1ad247e8303a6603f081ae079`.
- The existing `extractFreeBetsEditorial` boundary at **“What Are Free Bets?”** yields the same 9,146-character HTML on both, SHA-256 `4635430158718f303c4d680917dd175346b854ddfb64c2dbcbb322355cf53483`: 20 headings and 46 paragraphs. It excludes links, images, `/go/` affiliate paths and the seven card modules. Its visible text survives a mechanical 66-block core Gutenberg conversion exactly.
- The exact Astro path already renders the seven branded cards from central draft-offer references as inert previews, plus this dated editorial extraction. This is design/content presentation, not a verified active offer hub.

## Why no draft was created

The extracted copy is **not uniformly safe evergreen copy**. It contains a “Risk-Free Bets” section saying readers are in a “win-win situation,” receive money back if a bet loses, and can try bets they would otherwise avoid. It includes hypothetical **€20/€30** promotions and describes deposit matches as extending playtime “without additional out-of-pocket expenses.” It also calls some offers “without the immediate risk.” These are substantive gambling and offer-mechanics claims, not formatting noise. Mechanical conversion would make them easier to publish without correcting them. There are no named partners in this extracted long-form portion, but that does not make its claims accurate or appropriate.

The seven staging central offers remain WordPress drafts and all seven lack eligibility, included-country and last-checked fields. Five also lack permanent offer UIDs. The approved space-restricted headlines and compact terms are separate ACF records; they should not be duplicated inside the Gutenberg page body. No sign-up destination or CTA activation was inferred.

## Safe next CMS step

1. Preserve a source-locked backup of staging page 56315's complete raw, rendered and SEO fields, with independent hashes; re-read immediately before a write and abort on drift.
2. Have Eric/JP decide whether to retain, rewrite or omit the risk-free, deposit-match, strategy and historical sections. Keep the stable explanatory sections as core Gutenberg headings/paragraphs, but do not silently transform offer examples into asserted facts.
3. Create a **new uniquely slugged, unpublished staging page** for the reviewed editorial body. Never update page 56315 as part of the first pass. Its offer comparison should be an ordered reference to the seven central ACF offers, not copied terms or affiliate links.
4. Compare core-block source and rendered visible text to the approved source-lock, confirm zero active affiliate links and unchanged published page 56315, then preview the draft through WPGraphQL/Astro at a noindex local path.
5. Treat country, eligibility, checked date, current offer approval, SEO and live-route cutover as separate gates. Do not turn on commercial CTAs as a consequence of a successful Gutenberg roundtrip.

Repeat the read-only structural check with `node --env-file=.env.local scripts/audit-free-bets-source.mjs`. Optional `--headings` and `--risk-lines` expose headings and flagged paragraphs for editorial review; the default output contains only counts, dates and hashes.
