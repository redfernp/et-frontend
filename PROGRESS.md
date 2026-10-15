# EveryTip launch progress

Updated 15 October 2026. Authority: CODEX-HANDOFF-RESCOPE.md, including section 0. Earlier lanes and dated gates are superseded. D1-D6 are answered.

## Done
- Baseline committed and pushed to redfernp/et-frontend/main; this single progress file is maintained in place. Completed work and preparation checkpoints have been committed and pushed separately.
- Task 3: the default Astro entry point reads staging WPGraphQL through one WPGRAPHQL_ENDPOINT. Five-record pages, sequential requests, backoff and atomic on-disk response caching are implemented. No October snapshot fallback or live-only overlays. Initial complete content fetch/build passed; the latest archive-inclusive cached build produced 1,230 pages in 35.04 seconds, including 983 exact .html paths.
- Removed the per-article live modules and their snapshot scripts. Stopped classic-column conversions and general live/staging drift work.
- Task 4: fixed inventory in data/builder-tiers.json: 28 Tier A routes, 87 Tier B pages. Another 227 classic posts contain builder fragments and receive render cleanup only, never Gutenberg conversion. ComeOn sportsbook review 25354 is included; casino-only and tipster reviews are excluded. No GSC tiering or Tier C list.
- Task 5: generic builder cleanup retains text, headings, images, tables, links and ACF slot markers. Ten random Tier B pages and the initial 27 Tier A routes passed 74 mobile/desktop render checks; added ComeOn was checked in the final sample. Fixed a Worker bug that turned valid cached 304 responses into 404s.
- Archives: 42 archive/pagination routes added from fresh category/tag/author membership and WordPress's 100-post page size. Generic redirected archive landing pages reconstruct query-loop lists omitted from GraphQL content. Rendered archive metadata preserves actual pagination SEO. Eleven observed archive redirects are retained.
- D3: page 87553 staging Yoast description changed from GBP 30 to GBP 20. One authenticated readback verified description, identity and status; affected source cache invalidated.
- D5: staging post 70985 set to noindex. One authenticated readback verified noindex while preserving title, description, canonical, nofollow and publish status; affected source cache invalidated.
- All 79 /go paths in the source were checked against current redirects without visiting partners. Worker routing preserves their status and destination; rendered links have sponsored/nofollow.
- Workers preview uploaded: https://everytip-review-everytip-astro-preview.jpredfern1979.workers.dev (version 77a08685-03bd-435f-88a5-fc1b0c8b072c). Preview responses have HTTP noindex protection while retaining staging Yoast meta. Refreshed after all 28 Tier A replacements and the dynamic Ninja-table correction.
- Local parity: all 1,230 assets passed SEO/sitemap checks. All 3,105 rows in 97 Ninja tables retain the source row text. All 76 central-offer placements match the resolved ACF content and CTA paths. Sitemap omits noindexed and redirected paths.
- Remote parity: 1,217 HTML responses matched source metadata with zero differences. Two additional paths correctly match staging 301s. All 104 redirect checks passed (79 affiliate, 14 legacy, 11 archive). All 76 central-offer placements passed remote content checks. One transient fetch failure passed a byte-for-byte retry against the verified asset. The 11 remaining HTTP-status failures are the confirmed staging conflicts below, not unexplained metadata differences.
- Refreshed browser QA: all 28 Tier A pages plus ten random rendered Tier B pages, and one sampled redirect, at 375px and desktop: 39 paths, 78 passing checks. All 56 Tier A viewport checks contain the expected central offer cards. Selected mobile/desktop offer screenshots visually inspected. Earlier classic/columnist/archive sampling also passed.
- Tracking: existing GTM-TJ4SSH4 loaded in all 72 browser checks. GA4 collection requests were observed on mobile and desktop after a seven-second settling period. Existing tracking configuration was retained.
- Task 9: cutover checklist and narrowly scoped differences completed below. All seven approved offer headlines and compact terms match live word for word; previous timeout unknowns are resolved.
- Validation: Astro check covers 367 files with zero errors/warnings/hints. Twenty-two focused cache, source, archive, offer and routing tests passed; affected archive/routing tests were rerun after implementation. Workflow YAML parses successfully. Fourteen focused source/cache/converter/offer tests pass after the final changes, including WPGraphQL status arrays and dynamic Ninja shortcode preservation.

- Synced Paul's staging change: only the Offer Publishing ACF group is exposed through REST in the repo plugin. Other field groups retain their existing settings.

- D2: all seven central offers published on staging, one record at a time with one authenticated readback each. GB, 2026-10-14, active status and eligibility from the complete approved terms verified. Existing headline/terms already matched word for word; Betway and Betwright have ordinary spaces where source has NBSP, with identical wording/punctuation. Stable IDs assigned where absent.

- Tasks 6-7 CMS work: all 28 fixed Tier A records rebuilt as core blocks plus ACF offer slots, sequential authenticated REST writes with one readback each. Every raw-content, identity and slot-render check passed. All existing prose retained, accounting only for removed CSS, whitespace and WordPress smart punctuation. Hubs have all seven offers; matching-brand reviews have their central offer; other reviews have a labelled comparison section. Existing embedded promotions remain as supplied. WordPress revisions and ignored before/after evidence support rollback.

- 15 October: fourteen owner-unpublished records changed from publish to draft with status-only authenticated REST writes, sequentially, one readback each. Before/after snapshots saved under outputs/staging-writes/<ID>-draft-20261015-{before,after}.json. Raw content, raw titles and stored REST metadata are unchanged. Draft preview URLs and generated Yoast schema timestamps changed naturally; no SEO fields were submitted.

## In progress
- Task 8: 15 October full WPGRAPHQL_FRESH=1 build and fresh launch gate are running following the fourteen status corrections. Archive redirect edits require server access; rebuild automation remains unverified.

## Blocked / required next inputs
- Rebuild automation: preview-only GitHub workflow (manual, save-dispatch and 30-minute fallback) and debounced WordPress save hook are committed. Repository Actions secrets are empty and EVERYTIP_PREVIEW_BUILDS_ENABLED is unset. Needs EVERYTIP_PREVIEW_CLOUDFLARE_API_TOKEN, enabling that flag, and SSH deployment of the complete content-model plugin folder plus EVERYTIP_PREVIEW_DISPATCH_TOKEN in wp-config.php. The preview account is already pinned in wrangler.preview.jsonc. No save-trigger or scheduled rebuild has been verified. PHP CLI is unavailable locally; lint the hook on the server before activation. This workflow targets previews only; Paul must configure the production build target at cutover.
- The eleven staging-200/legacy-301 conflicts are cleared: all fourteen drafted source URLs now return staging 404. Their established preview redirects are retained; full fresh preview parity is running.
- Archive redirect correction requires Paul/Cloudways access. All 48 Redirection rules (both groups) and all six Code Snippets were inspected via authenticated REST; none contains this rule. Free Yoast has no redirect manager. Responses have no X-Redirect-By and concatenate the path suffix, suggesting a server-level prefix redirect (inference; exact configuration file is not REST-visible). Observed prefix behaviour: /john-newsome/ -> /john-newsome-football-betting-tips, omitting the joining slash. No REST-editable rule was found, so no override was created.
  - /john-newsome/page/2: current /john-newsome-football-betting-tipspage/2; correct /john-newsome-football-betting-tips/page/2.
  - /john-newsome/page/3: current /john-newsome-football-betting-tipspage/3; correct /john-newsome-football-betting-tips/page/3.
  - /john-newsome/page/4: current /john-newsome-football-betting-tipspage/4; correct /john-newsome-football-betting-tips/page/4.
  - /john-newsome/page/5: current /john-newsome-football-betting-tipspage/5; correct /john-newsome-football-betting-tips/page/5.
  - The corrected destination prefix already 301s onward to /english-premier-league-predictions-for-saturday/page/N; all four final destinations return 200. Paul should inspect the staging Cloudways/nginx/Apache .htaccess redirect configuration and restore the joining slash. Evidence: outputs/staging-writes/redirects-{page0,groups,snippets,john-http,john-chain}.json.

## Launch checklist (section 4)
- [ ] Final fresh staging build with one endpoint variable. Source integration and complete resumable builds pass; final cache bypass is still required by section 0.
- [ ] Every staging 200 URL returns 200 at its exact Workers path. Eleven confirmed legacy status conflicts remain.
- [x] Existing 301s retain targets: 14 legacy and 11 archive redirect checks passed.
- [ ] Complete indexable SEO parity. All 1,217 served HTML responses match source Yoast; the 11 status conflicts prevent the complete gate passing.
- [x] Sitemap includes indexable served routes and excludes noindexed/redirected paths.
- [x] All 79 /go paths retain current destinations; sponsored/nofollow verified in rendered HTML.
- [x] Homepage, free tips, free bets and every Tier A review use current ACF offers: seven published records, 28 pages, 76 placements, verified on preview.
- [x] Ninja tables render without withheld rows: 97 tables, 3,105 matching rows.
- [x] Analytics and tracking fire on preview; GTM and GA4 requests verified.
- [ ] Save webhook and scheduled fallback rebuild work. Code prepared; activation and verification pending.
- [x] Thirty-page minimum QA at 375px and desktop exceeded: refreshed sample has 39 paths, 78 passing checks; earlier classic/columnist/archive checks retained.

## Decisions (section 5)
- [x] D1: staging WPGraphQL comes across at cutover; no separate live installation.
- [x] D2: seven offers approved, UK only, checked 14 Oct 2026. Exact source copy and field plans prepared; full terms and official terms URL are optional in the display model. CMS publication and slot wiring complete and preview verified. Country code is GB per Paul's latest instruction.
- [x] D3: GBP 20 description implemented and verified on staging page 87553.
- [x] D4: migrate free bets as supplied. General-prose flags below; no additional offer-claim gate.
- [x] D5: staging post 70985 noindex implemented and verified; no live noindex work.
- [x] D6: section 0 supersedes Tier C; no Tier C list or redirects created.

## Order of work
1. [x] Commit and push baseline.
2. [x] Create PROGRESS.md.
3. [x] Resilient staging build and complete cached rebuild.
4. [x] Fixed Tier A/Tier B inventory.
5. [x] Generic cleanup and rendered sampling.
6. [x] Tier A Gutenberg + ACF: all 28 CMS replacements and slot readbacks passed.
7. [x] Publish seven offers and wire ACF slots: all seven published and all 28 pages wired; preview verified.
8. [ ] Workers launch checklist: checks run, remaining blockers documented.
9. [x] Cutover morning checklist and scoped difference list.

## Cutover morning checklist for Paul
1. Before pushing, apply the desired owner rewrites and unpublished statuses listed below to staging. Recheck the seven offer texts on 56315; they matched live in this run. Use ../legacy-rewrites/manifest.json for page SEO. Disable Thrive on Paddy Power 34795 so post_content renders.
2. Tier A/ACF publication is complete. Activate/test the save hook and scheduled fallback. Resolve the status conflicts. Run the full WPGRAPHQL_FRESH=1 build and launch gate without reused responses.
3. Early morning before daily tips, push staging to live through Cloudways.
4. Set WPGRAPHQL_ENDPOINT=https://www.everytip.co.uk/graphql in the build environment and point the webhook/fallback at the production Workers build. Keep WordPress origin routes (/graphql, /wp-json, /wp-admin and /wp-content) reachable after frontend routing changes; GraphQL and existing media must not become static-asset 404s.
5. Rebuild and smoke-test homepage, hubs, reviews, five posts, archive pagination and /go links on preview. Re-run the full checklist. Do not cut over with launch gates open.
6. Paul switches DNS/routing. Codex makes no DNS or Cloudflare production changes.
7. Add that morning's tips normally and confirm the rebuild updates rendered tables. Retain the previous deployment and WordPress backup for rollback.

## Narrow cutover differences (section 4a only)
- Free bets 56315: all seven offer headlines and compact terms match live word for word. Wrapper HTML differs. Evidence: outputs/cutover-offer-copy.json.
- All eight owner rewrites have different rendered body text on staging: 56061, 72881, 60150, 12138, 7945, 10754, 1482, 34795. All eight live reads succeeded. Re-apply intended rewrites before push; use the manifest for page SEO. Paddy Power 34795 needs Thrive disabled to render the rewritten post_content.
- Confirmed meta-description differences on 12138 (old RaceBets promotion), 7945 (old full-time earnings pitch), 10754 (old GBP 100/week claim), and 1482 (old daily-tips wording). Live has the owner's replacement descriptions.
- Fourteen owner-unpublished records are now verified draft in staging (15 October): 59675, 59683, 88734, 89134, 37819, 5438, 11716, 11710, 11708, 20902, 19627, 11057, 89061, 89063. Record 33064 is absent from the published source and its staging public path returns 404.
- Eleven of those published records are legacy redirect conflicts: 59675, 59683, 88734, 89134, 37819, 5438, 20902, 19627, 11057, 89061, 89063. Their staging paths now return 404 following the authorised draft changes; the preview retains established 301s. The two older aliases /free-betting-tips-old and /live-streaming-top-bookmakers already 301 on staging and match preview.
- D4 flags outside the seven offer blocks: "free bets are a win-win"; the "Risk-Free Bets" section says "you're in a win-win situation"; comparison text uses "risk-free bet"; final thoughts says "a risk-free way to enjoy your favourite games". Flagged for Paul; not rewritten and not used to block approved offers.
- Evidence: outputs/cutover-final-scope.json, outputs/staging-legacy-http.json and outputs/launch-network-parity.json. No live writes or broad drift audit performed.

## Boundaries and stopping checkpoint
Tasks 3-7 and 9 are complete. Seven offers are published on staging with GB, active status, 14 October 2026 last-checked date and eligibility from the approved terms. Existing headlines/terms were retained word for word; only Betway/Betwright differ from the original source in ordinary versus non-breaking spaces. All 28 Tier A pages have core blocks and functioning ACF slots; their existing prose/promotions were retained. Betfred table 57082 remains a dynamic Ninja shortcode. The full build, local parity, 76 preview offer placements and 78 browser checks pass.

Task 8 remains open for the existing 11 staging/legacy redirect conflicts, four malformed archive redirects, rebuild automation credentials/plugin activation, and the final uncached launch check after those blockers are resolved. No new permission or copy decision is blocking offers/Tier A. The Offer Details field group is still not REST exposed; it was unnecessary to change its existing approved wording. Only Offer Publishing show_in_rest was changed in the repo plugin.

All requested staging changes, implementation fixes and this checkpoint are committed and pushed. No DNS, Cloudflare production or live WordPress writes; no classic-column conversions, Tier C redirects or new dated reports. Preview: https://everytip-review-everytip-astro-preview.jpredfern1979.workers.dev.
