# Staging content contract — 1 October 2026

## Plugin deployment — 2 October 2026

With the owner's explicit approval, `EveryTip Content Model` `0.3.0-dev` replaced `0.2.0` on **staging only**. WordPress reported a successful update; the Plugins screen showed version `0.3.0-dev` with a Deactivate action (active). Gutenberg's block inserter found `EveryTip Offer Slot`, and the block could be inserted into an unpublished auto-draft. The authenticated offer read route returned 200 for staging offer 90846 and 403 anonymously after the update. This supersedes the older v0.2/declined-upload notes below. Offer-block field entry, saved-block GraphQL output and Astro resolution are **not yet verified**; do not use the block for published content. Live was not changed.

## Gutenberg editor check — 2 October 2026

### REST-authenticated article conversion pilot — 2 October 2026

After the owner confirmed that the two draft conversions looked good in a normal browser, the **staging-only** Writing Settings were changed to make the Block Editor the default for all users. “Allow users to switch editors” remains **Yes**, so legacy Beaver/Thrive content can still be opened with Classic where needed. The saved setting was read back in the admin with Block Editor selected. Live WordPress was not changed. This default-editor change does **not** convert old post content by itself.

The owner supplied a **staging-only** WordPress Application Password in a Git-ignored `.env.local`; no credential is stored in this repository. `npm run probe:editor-auth` returned HTTP 200 for `/wp/v2/users/me?context=edit`, and `scripts/probe-editor-write.mjs` updated and read back the existing test post 90857 while it remained a draft. This proves authenticated REST editing on staging. It does not prove that the Gutenberg UI is reliable, nor does REST bypass a database outage.

A first historic article conversion is staged as **draft 90861** (`staging-gutenberg-conversion-seymour-2024-12-07`). Its source is the published 7 December 2024 Seymour Biz post 77061; the published original and exact legacy URI remain unchanged. The converter emits 33 core paragraph, quote and list blocks from the snapshot's rendered HTML. A local visible-text comparison matched all 6,476 characters after whitespace normalization, while the retired monochrome portrait was omitted so author photos can come from the verified user profile. REST read-back confirmed the block source and Draft status. The in-app browser's Gutenberg visual canvas is blank, so **a normal-browser visual check for invalid blocks is still required** before applying the conversion to an existing post. Historic affiliate links and staging-host URLs in the draft are unverified source copy; do not publish this pilot.

A second columnist pilot is **draft 90862** (`staging-gutenberg-conversion-john-newsome-2026-gw4`), sourced from published John Newsome post 90351. It has 280 core blocks and all 27,836 visible characters matched the source after whitespace normalization; the retired portrait was omitted. REST read-back confirmed the draft and exact block source. Both pilot drafts need normal-browser visual validation for block warnings and editorial layout before any conversion of the original published records.

The owner subsequently confirmed the pilot drafts look good in a normal browser. Guarded REST conversion was then applied to the **two original staging posts only**: Seymour 77061 and John 90351. Their pre-conversion raw bodies and metadata are saved under ignored `data/raw/wp-preconversion-{id}.json`. Each post's block source read back exactly; status remained Published, and slug, date, title, author, categories/tags and sampled Yoast title/description/canonical/robots stayed unchanged. Both exact staging URLs returned HTTP 200 with article content and without the retired portrait. No other originals were bulk-converted, no live content was touched, and this does not complete Astro content/SEO parity checks. The draft copies 90861/90862 remain as review fixtures and must not be published.

The converter currently rejects builder markup, active embeds, known shortcodes, unknown images and unsupported top-level structures. This is intentionally a narrow article-family pilot, not permission for bulk conversion. The owner declined uploading local plugin v0.3; staging still runs v0.2.

On staging, Classic Editor remains the default. With the owner's approval, **Allow users to switch editors** was enabled and its saved state verified in Writing Settings. No live setting was changed. Test post 90857 opened through the block-editor switch; the owner confirmed that the normal Chrome Gutenberg canvas worked, but the in-app browser displayed an empty `editor-canvas` iframe. The test post was saved, briefly published by the owner despite a hanging UI spinner, then returned to Draft and list-verified. Do not make Gutenberg the default for everyone until a normal-browser save/reopen and converted-block visual check pass reliably. The owner declined uploading the local v0.3 offer-slot plugin for now; staging still runs v0.2.

The WPGraphQL probe against `wordpress-159231-2098144.cloudwaysapps.com` is read-only and fetched no authenticated content. Re-run with `npm run probe:wp`; `npm run probe:wp -- --strict` fails until the missing production-contract pieces exist. The probe reports capabilities, not post copy, terms or affiliate URLs. Separate staging-admin actions in this pass installed/activated the Yoast GraphQL extension and removed the affiliate URL field from the public GraphQL schema; live was not touched.

| Contract item | Observation | Next action |
| --- | --- | --- |
| Posts and pages | Public WPGraphQL queries return IDs, slugs and exact `uri` values. | Preserve those URIs during migration; expand the typed data layer for templates. |
| Offer custom type | `everytipOffers` and `everyTipOfferDetails` fields are queryable. | Complete/verify the ACF model and create a small approved staging dataset. |
| Offer records | The public offer connection returns no records. Six unpublished staging offer drafts were confirmed in the admin list; BetWright is deliberately deferred for classification. | Do not connect the preview cards to live commercial links or terms yet. See `everytip-staging-seed-progress-2026-10-01.md`. |
| Offer/bookmaker extension | `EveryTip Content Model` v0.2.0 is active on **staging only**. Offer-publishing and optional bookmaker-USP fields are queryable in WPGraphQL; an explicit REST request returned its custom route response. | Three bookmaker drafts and six offer drafts are list-verified; two more bookmaker saves need list verification. See the seed-progress note. The offer route returned 403 anonymously, but authenticated read and guarded writes remain untested. |
| Yoast in WPGraphQL | The `Add WPGraphQL SEO` plugin (WPGraphQL Yoast SEO Addon 5.1.0) was installed and activated on **staging only**. Public queries now return title, description, canonical and robots values for posts/pages. | Test Yoast **writes** separately through authenticated REST; the default REST response exposing Yoast data does not prove write access. Audit exact values and production-domain canonical mapping before launch. |
| Introspection | Public `__schema` requests are blocked. | Use explicit contract queries or authenticated schema access; do not enable public introspection solely for the migration. |

### Menus

Staging WPGraphQL exposes one menu assigned to `PRIMARY`: `ET v3.0 Main Navigation` (ID 37), with 50 ordered items and nested submenus. The local `/pilot/cms-menu/` page reads it directly and displays the exact labels and URIs without activating unfinished destinations. `src/lib/wordpress-menu.ts` maps the GraphQL menu tree and rejects unexpected external/unsafe paths or broken hierarchy. Astro's eventual header should consume this menu at build time; a WordPress menu edit appears after a successful rebuild, not instantly on an already-deployed static page. Before launch, validate every menu URI against the built route registry, then replace the pilot-only header links. No footer menu is assigned in staging, so legal footer links remain explicit for now.

The sampled Yoast canonicals currently use the Cloudways staging hostname. That is expected for a site copy but must not be copied into production output. The production template needs a verified canonical mapping to `www.everytip.co.uk` while preserving each exact legacy path and its indexability policy.

## ACF admin inspection

The staging admin currently has three active pilot field groups, all exposed to GraphQL but with **Show in REST API off**:

| Group | Current fields | Contract gap |
| --- | --- | --- |
| EveryTip Offer Details | `offer_type`, `public_headline`, `full_terms`, `compact_terms`, `affiliate_url`, `bookmaker` | Existing UI group remains as-is. The PHP plugin now adds stable ID, CTA, eligibility/countries, dates, status and private review fields; uniqueness, validation and approval workflow remain open. |
| EveryTip Bookmaker Details | `logo`, `review_url` | Missing brand colours, licensing/compliance facts, default offer and active state. |
| EveryTip Roundup Guide | `ranked_entries` repeater, `guide_intro` | Needs its final guide structure and placement relationships; its current location rule is the Betting Guides category, not a dedicated guide template/type. |

Do **not** simply enable ACF's REST switch on the current Offer group: it includes `affiliate_url`, and ACF REST exposure can make opted-in field-group values readable on the public REST endpoint for a published post. The editorial bridge can instead use a narrow authenticated REST route with a `permission_callback`, field allowlist and read-back. Public-facing content should resolve a safe internal destination, with the actual affiliate URL handled server-side. The `affiliate_url` field was switched off in the public GraphQL schema on staging and saved; a follow-up public query correctly reports that `affiliateUrl` is unavailable. Keep that guard in the contract probe.

The other field groups and their REST switches were inspected but not changed. Subsequent staging-only draft seeding is recorded in `everytip-staging-seed-progress-2026-10-01.md`; no public offer content was added.

The staging plugin source is `wordpress-plugins/everytip-content-model/`. It registers three ACF groups in PHP, not in the ACF Field Groups screen. Version 0.2 adds optional bookmaker USPs (maximum three) and a separate offer-specific highlight; neither is a term or eligibility field. Its only REST method is `GET /wp-json/everytip/v1/offer/{id}` with an `edit_post` permission check and an allowlisted editorial response. It does not expose `affiliate_url` and has no write route. A request with a non-offer ID returned its custom `everytip_offer_not_found` response, proving the route is active; that is **not** a substitute for testing authentication against an actual draft offer. No Application Passwords were created.

The Astro read adapter now has a typed `getOfferRecords()` method and a minimum-copy completeness check. That check is intentionally **not** an approval or publishing rule: status, dates, country eligibility, destination, full terms and human verification must be modelled and checked before any offer becomes active. Existing `/pilot/` routes stay dated/noindex preview fixtures.

The next staging implementation slice is to finalise ACF offer/bookmaker/placement fields and relationships, verify the Yoast GraphQL and REST **write** contracts, then add one approved example offer and its placements. The editorial MCP bridge still needs per-person Application Passwords and a staging-only draft/edit/read-back test before production credentials are created. Neither a shared app credential nor a locally saved team-wide secret is part of this contract.
