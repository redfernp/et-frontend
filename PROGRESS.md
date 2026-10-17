# EveryTip launch progress

Updated 15 October 2026. Authority: CODEX-HANDOFF-RESCOPE.md, including section 0. Earlier lanes and dated gates are superseded. D1-D6 are answered.

## Latest completed work: owner approval, 15 October
- Worker: /john-newsome/page/2 through /page/5 now 301 directly to /english-premier-league-predictions-for-saturday/page/N. Persistent overrides are shared by the Worker and parity gate. All four final destinations return 200 without a chain. Staging server rules were left unchanged. Regression tests cover GET and HEAD; all ten routing tests pass. Commit 5395c9f was pushed after this task.
- Owner rewrites: all eight supplied HTML files and manifest titles/SEO copied to staging sequentially, with local original/SEO backups and one readback per write. IDs: 56061, 72881, 60150, 12138, 7945, 10754, 1482, 34795. All content/title/SEO checks pass; statuses and slugs preserved. QuinnBet's old builder insert was replaced with its existing ACF slot 90848, with all supplied prose retained. No SEO fields are blocked.
- Rebuilt 1,220 pages after invalidating affected cache entries: 499 receipts, 489 reused and 10 fetched again. This is a resumable-local build, not another full fresh run; the preceding fully uncached baseline is recorded below. Local and remote parity both pass with zero failures: 1,218 served HTML pages plus two matching redirects, 104 redirect checks, 76 offer placements, 97 Ninja tables and 3,105 rows.
- Redeployed preview e9e5f20c-e016-4cb5-ae8e-974d2401a5c3. Every supplied word on all eight pages is present in the preview; four archive redirects verified again. Both the immutable deployment and named preview alias passed these checks. The alias briefly served older responses during propagation before passing exact-path verification.
- Browser QA: all eight changed pages plus ten randomly selected pages, at 375px and desktop, passed 36 checks. Paddy Power/mobile and QuinnBet/desktop screenshots inspected; rewritten content and the QuinnBet ACF card render. Evidence: outputs/owner-rewrite-preview-verification.json, owner-rewrite-qa-paths.json, owner-rewrite-render-qa.json, launch-network-parity.json. Original backups: outputs/staging-writes/<id>-owner-rewrite-20261015-before.json.
- Remaining manual step: Paddy Power's public WordPress template still uses its old Thrive layout despite accepted REST metadata updates. GraphQL and Astro correctly show the rewrite. Instructions for Paul are below. No task is currently running.

## Done
- Baseline committed and pushed to redfernp/et-frontend/main; this single progress file is maintained in place. Completed work and preparation checkpoints have been committed and pushed separately.
- Task 3: the default Astro entry point reads staging WPGraphQL through one WPGRAPHQL_ENDPOINT. Five-record pages, sequential requests, backoff and atomic on-disk response caching are implemented. No October snapshot fallback or live-only overlays. Final 15 October WPGRAPHQL_FRESH=1 build passed: 1,220 pages in 37m 8s, including 979 exact .html paths. All 499 source receipts are uncached: 979 published posts, 195 pages and 46 archive/pagination routes. All fourteen drafted records are absent.
- Removed the per-article live modules and their snapshot scripts. Stopped classic-column conversions and general live/staging drift work.
- Task 4: fixed inventory in data/builder-tiers.json: 28 Tier A routes, 87 Tier B pages. Another 227 classic posts contain builder fragments and receive render cleanup only, never Gutenberg conversion. ComeOn sportsbook review 25354 is included; casino-only and tipster reviews are excluded. No GSC tiering or Tier C list.
- Task 5: generic builder cleanup retains text, headings, images, tables, links and ACF slot markers. Ten random Tier B pages and the initial 27 Tier A routes passed 74 mobile/desktop render checks; added ComeOn was checked in the final sample. Fixed a Worker bug that turned valid cached 304 responses into 404s.
- Archives: 46 archive/pagination routes served from fresh category/tag/author membership and WordPress's 100-post page size. Generic redirected archive landing pages reconstruct query-loop lists omitted from GraphQL content. Rendered archive metadata preserves actual pagination SEO. Eleven archive redirects are served, including the four subsequently approved direct-target corrections. Empty terms/authors are discovered too: eight empty archives still return staging 200 and retain their noindex SEO; empty routes returning 404 are omitted. This generic correction prevents drafted posts from making still-public tag archives disappear.
- D3: page 87553 staging Yoast description changed from GBP 30 to GBP 20. One authenticated readback verified description, identity and status; affected source cache invalidated.
- D5: staging post 70985 set to noindex. One authenticated readback verified noindex while preserving title, description, canonical, nofollow and publish status; affected source cache invalidated.
- All 79 /go paths in the source were checked against current redirects without visiting partners. Worker routing preserves their status and destination; rendered links have sponsored/nofollow.
- Workers preview uploaded: https://everytip-review-everytip-astro-preview.jpredfern1979.workers.dev (current version e9e5f20c-e016-4cb5-ae8e-974d2401a5c3). Preview responses have HTTP noindex protection while retaining staging Yoast meta. The fully uncached 15 October baseline was followed by the latest owner-rewrite rebuild described above.
- Local parity with --fresh: all 1,220 assets passed SEO/sitemap checks, with zero reused-response receipts. All 3,105 rows in 97 Ninja tables retain the source row text. All 76 central-offer placements match the resolved ACF content and CTA paths. Sitemap omits noindexed and redirected paths.
- Final remote parity with --fresh: 1,218 HTML responses match source metadata with zero differences; two further source paths match staging 301s. All 104 redirect checks pass (79 affiliate, 14 legacy, 11 archive), with zero failures. All 76 central-offer placements pass remote content checks. These historical checks preceded the owner-approved Worker correction; the four targets now intentionally differ from the malformed staging rule.
- Refreshed browser QA: 48 paths at 375px and desktop, 96 passing checks. Includes all 28 Tier A pages, five Tier B pages, five classic posts, five columnist posts and five archive routes. All 56 Tier A viewport checks contain central offer cards. Empty-tag/mobile and paginated-archive/desktop screenshots visually inspected.
- Tracking: GTM-TJ4SSH4 and GA4 collection requests verified again on the final preview, on mobile and desktop after seven seconds. These two additional tracking checks also passed; existing tracking configuration retained.
- Task 9: cutover checklist and narrowly scoped differences completed below. The scoped 14 October comparison found all seven approved offer headlines and compact terms matched live word for word; previous timeout unknowns were resolved.
- Validation: Astro check covers 367 files with zero errors/warnings/hints. Twenty-two focused cache, source, archive, offer and routing tests passed; affected archive/routing tests were rerun after implementation. Workflow YAML parses successfully. Fourteen focused source/cache/converter/offer tests pass after the final changes, including WPGraphQL status arrays and dynamic Ninja shortcode preservation. Five archive regression tests pass after the empty-archive fix, including staged HTTP 200 versus 404 behaviour and fresh metadata receipts.

- Synced Paul's staging change: only the Offer Publishing ACF group is exposed through REST in the repo plugin. Other field groups retain their existing settings.

- D2: all seven central offers published on staging, one record at a time with one authenticated readback each. GB, 2026-10-14, active status and eligibility from the complete approved terms verified. Existing headline/terms already matched word for word; Betway and Betwright have ordinary spaces where source has NBSP, with identical wording/punctuation. Stable IDs assigned where absent.

- Tasks 6-7 CMS work: all 28 fixed Tier A records rebuilt as core blocks plus ACF offer slots, sequential authenticated REST writes with one readback each. Every raw-content, identity and slot-render check passed. All existing prose retained, accounting only for removed CSS, whitespace and WordPress smart punctuation. Hubs have all seven offers; matching-brand reviews have their central offer; other reviews have a labelled comparison section. Existing embedded promotions remain as supplied. WordPress revisions and ignored before/after evidence support rollback.

- 15 October: fourteen owner-unpublished records changed from publish to draft with status-only authenticated REST writes, sequentially, one readback each. Before/after snapshots saved under outputs/staging-writes/<ID>-draft-20261015-{before,after}.json. Raw content, raw titles and stored REST metadata are unchanged. Saved before/after responses also confirm unchanged Yoast titles, descriptions, robots and social snippets. Draft preview URLs and generated Yoast schema timestamps changed naturally; no SEO fields were submitted.

## In progress
- Task 8: all executable fresh-build, content, HTTP/SEO/sitemap, redirect-retention, offer/table, browser and tracking checks pass. Launch approval remains open for the two external blockers below. No build or staging write is still running.

## Blocked / required next inputs
- Rebuild automation: preview-only GitHub workflow (manual, save-dispatch and 30-minute fallback) and debounced WordPress save hook are committed. Repository Actions secrets and variables were rechecked on 15 October: secrets are empty and EVERYTIP_PREVIEW_BUILDS_ENABLED is unset. Needs EVERYTIP_PREVIEW_CLOUDFLARE_API_TOKEN, enabling that flag, and SSH deployment of the complete content-model plugin folder plus EVERYTIP_PREVIEW_DISPATCH_TOKEN in wp-config.php. The preview account is already pinned in wrangler.preview.jsonc. No save-trigger or scheduled rebuild has been verified. PHP CLI is unavailable locally; lint the hook on the server before activation. This workflow targets previews only; Paul must configure the production build target at cutover.
- Paddy Power 34795: public WordPress Thrive override must be removed manually; see the exact staging-only step below. All eight rewrites already render on Astro.

## Historical staging redirect investigation (resolved in Worker)
- Historical staging-rule investigation (superseded for cutover by the approved Worker override): archive redirect correction originally required Paul/Cloudways access. All 48 Redirection rules (both groups) and all six Code Snippets were inspected via authenticated REST; none contains this rule. Free Yoast has no redirect manager. Responses have no X-Redirect-By and concatenate the path suffix, suggesting a server-level prefix redirect (inference; exact configuration file is not REST-visible). Observed prefix behaviour: /john-newsome/ -> /john-newsome-football-betting-tips, omitting the joining slash. No REST-editable origin rule was found. The later owner-approved Worker override resolves frontend routing.
  - /john-newsome/page/2: current /john-newsome-football-betting-tipspage/2; correct /john-newsome-football-betting-tips/page/2.
  - /john-newsome/page/3: current /john-newsome-football-betting-tipspage/3; correct /john-newsome-football-betting-tips/page/3.
  - /john-newsome/page/4: current /john-newsome-football-betting-tipspage/4; correct /john-newsome-football-betting-tips/page/4.
  - /john-newsome/page/5: current /john-newsome-football-betting-tipspage/5; correct /john-newsome-football-betting-tips/page/5.
  - The corrected destination prefix already 301s onward to /english-premier-league-predictions-for-saturday/page/N; all four final destinations return 200. Per the subsequent 15 October approval, leave the staging server rule alone; the Worker now targets the final 200 paths directly. Evidence: outputs/staging-writes/redirects-{page0,groups,snippets,john-http,john-chain}.json.

## Launch checklist (section 4)
- [x] Fully fresh baseline completed 15 October: WPGRAPHQL_FRESH=1, 499 uncached receipts, 1,220 pages. The latest owner-rewrite build refreshed affected entries using the permitted local cache. Repeat the final fresh gate after remaining manual/cutover changes.
- [x] Every discovered staging 200 content/archive URL returns 200 at its exact Workers path. Fresh parity has zero failures. All fourteen drafted paths return staging 404; preview preserves eleven established 301s and returns 404 for the remaining three.
- [x] Redirect gate: 14 legacy and 11 archive checks pass, with the four explicitly approved direct final archive targets replacing the malformed origin targets.
- [x] Complete indexable SEO parity: 1,218 served HTML responses match fresh staging Yoast, with zero differences.
- [x] Sitemap includes indexable served routes and excludes noindexed/redirected paths.
- [x] All 79 /go paths retain current destinations; sponsored/nofollow verified in rendered HTML.
- [x] Homepage, free tips, free bets and every Tier A review use current ACF offers: seven published records, 28 pages, 76 placements, verified on preview.
- [x] Ninja tables render without withheld rows: 97 tables, 3,105 matching rows.
- [x] Analytics and tracking fire on preview; GTM and GA4 requests verified.
- [ ] Save webhook and scheduled fallback rebuild work. Code prepared; activation and verification pending.
- [x] Thirty-page minimum QA at 375px and desktop exceeded: final 48-path sample, 96 passing checks across every required family.

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
3. [x] Resilient staging build and final complete uncached rebuild.
4. [x] Fixed Tier A/Tier B inventory.
5. [x] Generic cleanup and rendered sampling.
6. [x] Tier A Gutenberg + ACF: all 28 CMS replacements and slot readbacks passed.
7. [x] Publish seven offers and wire ACF slots: all seven published and all 28 pages wired; preview verified.
8. [ ] Workers launch checklist: checks run, remaining blockers documented.
9. [x] Cutover morning checklist and scoped difference list.

## Cutover morning checklist for Paul
1. The eight supplied owner rewrites, manifest titles/SEO and fourteen unpublished statuses are applied on staging. Resolve Paddy Power's remaining public WordPress Thrive rendering issue using the manual step below. Recheck the seven offer texts on 56315; they matched live in the scoped 14 October comparison.
2. Tier A/ACF publication is complete. Activate/test the save hook and scheduled fallback. The four archive targets are corrected in the Worker; leave the staging server rule unchanged. The final fresh build/gate passed on 15 October; repeat after remaining server/cutover changes.
3. Early morning before daily tips, push staging to live through Cloudways.
4. Set WPGRAPHQL_ENDPOINT=https://www.everytip.co.uk/graphql in the build environment and point the webhook/fallback at the production Workers build. Keep WordPress origin routes (/graphql, /wp-json, /wp-admin and /wp-content) reachable after frontend routing changes; GraphQL and existing media must not become static-asset 404s.
5. Rebuild and smoke-test homepage, hubs, reviews, five posts, archive pagination and /go links on preview. Re-run the full checklist. Do not cut over with launch gates open.
6. Paul switches DNS/routing. Codex makes no DNS or Cloudflare production changes.
7. Add that morning's tips normally and confirm the rebuild updates rendered tables. Retain the previous deployment and WordPress backup for rollback.

## Narrow cutover differences (section 4a only)
- Free bets 56315: all seven offer headlines and compact terms match live word for word. Wrapper HTML differs. Evidence: outputs/cutover-offer-copy.json.
- All eight owner rewrites are now saved on staging from ../legacy-rewrites/<id>.html: 56061, 72881, 60150, 12138, 7945, 10754, 1482, 34795. Titles and both Yoast fields match manifest.json. QuinnBet's old builder insert was replaced with its existing ACF offer slot 90848, retaining all supplied prose. Paddy Power's GraphQL content renders the rewrite, but its public WordPress page still needs Thrive disabled manually.
- The previous meta-description differences on 12138, 7945, 10754 and 1482 are resolved using the supplied manifest; all eight records have verified replacement SEO titles and descriptions.
- Fourteen owner-unpublished records are now verified draft in staging (15 October): 59675, 59683, 88734, 89134, 37819, 5438, 11716, 11710, 11708, 20902, 19627, 11057, 89061, 89063. Record 33064 is absent from the published source and its staging public path returns 404.
- Eleven drafted records were the former legacy redirect conflicts: 59675, 59683, 88734, 89134, 37819, 5438, 20902, 19627, 11057, 89061, 89063. Their staging paths now return 404 following the authorised draft changes; the preview retains established 301s. The two older aliases /free-betting-tips-old and /live-streaming-top-bookmakers already 301 on staging and match preview.
- D4 flags outside the seven offer blocks: "free bets are a win-win"; the "Risk-Free Bets" section says "you're in a win-win situation"; comparison text uses "risk-free bet"; final thoughts says "a risk-free way to enjoy your favourite games". Flagged for Paul; not rewritten and not used to block approved offers.
- Evidence: outputs/cutover-final-scope.json, outputs/staging-legacy-http.json and outputs/launch-network-parity.json. No live writes or broad drift audit performed.

## Paddy Power staging manual step for Paul
REST accepts the exposed Thrive fields but does not persist either tcb_editor_enabled=0 or an empty tve_updated_post. Three narrowly scoped attempts (combined content/flag, flag-only, then flag plus empty legacy layout) each had a saved pre-state and one independent readback. All retained flag 1 and the legacy layout; no further retries. Content, title and manifest SEO are saved correctly, and public GraphQL returns the new content. The public WordPress HTML still contains the old "Accumulator bets have grown increasingly popular" layout.

On STAGING only, switch page 34795 back to the default WordPress editor, retaining its already saved post_content. If using WP-CLI in the staging WordPress directory, remove the legacy Thrive override after retaining the saved backup:
```
wp post meta update 34795 tcb_editor_enabled 0
wp post meta delete 34795 tve_updated_post
```
Purge the staging page cache, then verify /acca-insurance/paddy-power contains "Terms that have varied" and no longer contains the old opening quoted above. Do not re-paste or overwrite the new post_content. Original REST/SEO backups are outputs/staging-writes/<id>-owner-rewrite-20261015-before.json; Paddy correction evidence is 34795-thrive-{disable,content-disable}-{before,after}.json. No SEO fields require manual entry.

## Post-launch backlog
- Columnist hubs (Paul, 15 October): keep `/john-newsome` -> `/english-premier-league-predictions-for-saturday` and `/seymour-biz` -> `/saturday-horse-racing-tips` as they are for launch. After launch, review how those keyword pages perform, then choose between making the category archives the hubs (index them, 301 the Thrive pages to them) or keeping the keyword URLs and rebuilding those two pages in Gutenberg plus ACF. See CODEX-HANDOFF-RESCOPE.md section 4b.

## Boundaries and stopping checkpoint
Completed: the four Worker redirects, regression test, both preview rebuilds/deployments, eight staging owner rewrites with all manifest SEO fields, per-write backups/readbacks, full local/remote parity and rendered sampling. All eight rewritten texts and all four direct redirects are verified on the named preview and deployment e9e5f20c-e016-4cb5-ae8e-974d2401a5c3. The earlier fourteen draft changes remain intact. Latest build used permitted cache resumption after targeted invalidation; it is not represented as a second fully uncached run.

In progress: no scripts or writes remain running. Launch task 8 stays open for automation activation/testing and the Paddy Power public WordPress manual correction. The four archive redirects no longer require a server change; leave that staging rule alone as instructed.

Blocked: REST did not persist the Paddy Power Thrive controls, so Paul must perform the staging manual step above. Rebuild webhook/scheduled fallback still need the documented credentials and plugin deployment. No SEO fields are blocked. Repeat final fresh verification after those changes and at cutover.

All completed work and this checkpoint are committed and pushed. No DNS, Cloudflare production or live WordPress writes; no broad drift work, classic-column conversion or new dated reports. Preview: https://everytip-review-everytip-astro-preview.jpredfern1979.workers.dev. Immutable verified deployment: https://e9e5f20c-everytip-astro-preview.jpredfern1979.workers.dev.
