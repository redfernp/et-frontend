# EveryTip launch progress

Updated 14 October 2026, evening section 0 override. Authority: CODEX-HANDOFF-RESCOPE.md. Earlier lanes and dated gates are superseded. D1-D6 are answered.

## Done
- Baseline committed (0928025) and pushed to redfernp/et-frontend/main. Explicitly using the existing redfernp GitHub credential resolves the default-account 403.
- Created this single progress file with sections 4 and 5 as checklists.
- Default Astro entry point now reads fresh paginated staging WPGraphQL through WPGRAPHQL_ENDPOINT. No October snapshot fallback or live-only overlays; section 0 permits resumable local response caching. Shared layout retained; old pilot routes are outside the default build.
- Removed per-article live modules, their snapshot scripts and obsolete overlay tests. Stopped classic post conversions and general live/staging drift work.
- Generic builder cleanup strips builder wrappers/styles and retains prose, headings, images, tables, links and ACF slot markers. Applied by markup detection; fixed tier inventory is in data/builder-tiers.json.
- Rendered affiliate links retain existing www.everytip.co.uk/go paths and receive sponsored/nofollow. All 79 distinct /go paths in the source were checked against current redirects without visiting partners: 79 resolved, zero failures. Worker routing preserves their observed status and destination; network preview verification pending.
- Sitemap uses source robots. Added a section 4 gate for built assets, Yoast parity, sitemap membership, affiliate relations and unresolved offer slots.
- Preview packaging preserves source Yoast meta and adds HTTP X-Robots-Tag noindex. No remote upload performed.
- Latest Astro check: zero errors/warnings/hints. Eight focused content-source, pagination, cleanup and archive tests passed.

## In progress
- Task 3 COMPLETE: sequential five-record GraphQL pages with exponential backoff and atomic on-disk caching. Full staging build: 1,188 pages, 983 exact .html routes, 15m 11s. Cached rebuild: 1,188 pages in 5.91s. Final launch still requires cache bypass.
- Task 5 COMPLETE: 10 random Tier B pages plus all 27 fixed Tier A routes passed 74 mobile/desktop render checks. Visual mobile sample inspected. Fixed conditional asset responses incorrectly becoming 404; regression test passes.
- Task 8: new entry point covers posts/pages only. Fresh taxonomy/author/blog archives and pagination remain to implement. No complete coverage claim.
- Task 9 COMPLETE: cutover checklist and scoped differences below; exact offer-copy match and all prior timeout cases resolved.

## Current section 0 instructions
- Fixed Tier A: homepage, /free-betting-tips, /bookie-free-bets-bonus-offers, every bookmaker review and sign-up offer page. Every other builder page is Tier B. No GSC ranking or Tier C list.
- Single-record authenticated staging REST writes are authorised; read each back once. Only fields genuinely inaccessible over REST need SSH.
- Small sequential WPGraphQL pages, backoff and completed-page disk cache are authorised for local builds. Final launch check must bypass cache with WPGRAPHQL_FRESH=1.
- Task 3 completed with resumable five-record pages, six-attempt exponential backoff and atomic cache writes. Cache resume, endpoint isolation, fresh bypass and sequential-request tests pass.

## Blocked
- D2 / tasks 6–7: authenticated OPTIONS /wp-json/wp/v2/et_offer/90846 exposes acf as an object with zero properties; authenticated edit read returns acf []. ACF offer fields need SSH (or an explicitly exposed write route). Do not publish incomplete draft offers. Exact D2 headline/terms and UK/date field plans are committed in data/approved-offer-copy.json; eligibility retains the complete source terms. Central slot rendering is implemented and tested, ready for published ACF records. Generic Tier A Gutenberg converter and 27 local content plans are prepared; CMS replacement and ACF slot wiring remain pending this dependency. Evidence: outputs/staging-writes/offers-schema.json and 90846-read.json.
- Rebuild automation: preview-only GitHub workflow (manual, save-dispatch and 30-minute fallback) plus debounced WordPress save hook prepared locally. GitHub currently has no repository Actions secrets. Needs EVERYTIP_PREVIEW_CLOUDFLARE_API_TOKEN, EVERYTIP_PREVIEW_CLOUDFLARE_ACCOUNT_ID and EVERYTIP_PREVIEW_BUILDS_ENABLED=true; SSH deployment of rebuild-hook.php and EVERYTIP_PREVIEW_DISPATCH_TOKEN in wp-config.php. No webhook or scheduled build has been verified. PHP CLI is unavailable locally, so PHP lint also remains pending.
- Full launch checks, archives, offers and tracking remain unfinished work, not approved launch gates.

## Launch checklist (section 4)
- [ ] Fresh staging WPGraphQL build with one endpoint variable. Complete 1,188-route build passed; final fresh-cache-bypass check remains.
- [ ] Every staging 200 URL returns 200 at its exact Workers path, including archives.
- [ ] Existing 301s retain targets. Worker map retained; network parity unverified.
- [ ] Indexable title/description/canonical/robots match staging Yoast; zero unexplained differences.
- [ ] Sitemap contains all indexable URLs and no noindexed URLs.
- [ ] All /go links resolve to existing destinations and use sponsored/nofollow.
- [ ] Homepage, free tips, free bets and every review use current ACF offers.
- [ ] Ninja tables render without withheld rows. HTML is retained; JS-populated tables need browser verification.
- [ ] Analytics and tracking fire on preview.
- [ ] Save webhook and scheduled fallback rebuild work.
- [ ] Thirty-page QA at 375px and desktop, including required families.

## Decisions (section 5)
- [x] D1: staging WPGraphQL comes across with cutover; no separate live installation.
- [x] D2: seven offers approved, UK only, checked 14 Oct 2026. Copy exact headlines/terms from 56315, derive eligibility from terms, publish on staging. Full terms and official terms URL already optional in the local display model. CMS publication and slot wiring pending.
- [x] D3 COMPLETE: page 87553 staging Yoast description changed from GBP 30 to GBP 20 via authenticated REST; one readback verified description, identity and status. Related GraphQL cache invalidated.
- [x] D4: migrate free bets as supplied. Flag risk-free/win-win only outside offer blocks. No extra offer-claim approval gate.
- [x] D5 COMPLETE: staging post 70985 set to noindex via the authenticated Yoast ability; one readback verified noindex and preserved title, description, canonical, nofollow and publish status. Related GraphQL cache invalidated.
- [x] D6: superseded by section 0: no Tier C list for now; no redirects created.

## Order of work
1. [x] Commit and push baseline.
2. [x] Create PROGRESS.md.
3. [x] Resilient staging build and cached rebuild completed.
4. [x] Fixed tiers committed in data/builder-tiers.json: 27 Tier A routes; 87 Tier B pages. Another 227 classic posts contain embedded builder fragments and receive render cleanup only, never Gutenberg conversion.
5. [x] Generic cleanup applied; 37 sampled routes passed at both viewport sizes.
6. [ ] Tier A Gutenberg + ACF: authorised through single-record staging REST. Use staging; user's no-live-write instruction overrides section 3a's live wording.
7. [ ] Publish seven offers and wire slots through single-record staging REST.
8. [ ] Workers launch checklist: not passed.
9. [x] Cutover checklist and scoped differences completed; Paul must apply the listed pre-push changes.

## Cutover morning checklist for Paul
1. Before pushing, re-apply only desired live edits to staging. Check exact offer texts on 56315, the eight owner rewrites and the unpublished records below. For Paddy Power 34795, ensure rewritten post_content renders instead of the old Thrive content; use page SEO from ../legacy-rewrites/manifest.json where needed.
2. Early morning before daily tips, push staging to live through Cloudways.
3. Set WPGRAPHQL_ENDPOINT=https://www.everytip.co.uk/graphql in the build environment. Point the save webhook at the Workers build and verify the scheduled fallback. Ensure the WordPress GraphQL origin remains reachable after DNS cutover; www/graphql must not resolve to a static-asset 404.
4. Rebuild and pass the complete section 4 checklist. Smoke-test homepage, hubs, reviews, five posts and /go links on Workers preview. Do not cut over while any launch gate is open.
5. Paul switches DNS/routing. Codex makes no DNS or Cloudflare production changes.
6. Add that morning's tips normally; confirm the rebuild updates rendered tables. Retain prior deployment and WordPress backup for rollback.

## Narrow cutover differences (14 October verified results)
Scope is only section 4a; no general live/staging sync was performed.
- Free bets 56315: all seven offer headlines and compact terms match live word for word. Wrapper HTML differs but the approved offer copy does not. Evidence: outputs/cutover-offer-copy.json.
- All eight owner rewrites (56061, 72881, 60150, 12138, 7945, 10754, 1482, 34795) have different rendered body text on staging. All eight live public reads succeeded; previous timeout unknowns are resolved. Paul should re-apply the intended rewrites before push, using ../legacy-rewrites/manifest.json for page SEO. For Paddy Power 34795, disable Thrive so post_content is used.
- Confirmed meta-description differences on posts 12138 (old RaceBets promotion), 7945 (old full-time earnings pitch), 10754 (old GBP 100/week claim), and 1482 (old daily tips wording). Live has the owner's replacement descriptions; stage those before push.
- Fourteen records identified as unpublished by the owner are still published in the complete staging source: 59675, 59683, 88734, 89134, 37819, 5438, 11716, 11710, 11708, 20902, 19627, 11057, 89061, 89063. Record 33064 is absent from the published source. Paul must align these statuses before cutover.
- Existing redirect sources still published in staging create a conflict between retaining the known 301s and returning 200 for every staging page. Existing 301 behavior is retained; do not claim launch parity until the statuses are aligned.
- D4 prose-only flags outside the seven offer blocks: ?free bets are a win-win?; the ?Risk-Free Bets? section says ?you?re in a win-win situation?; the comparison text uses ?risk-free bet?; final thoughts says ?a risk-free way to enjoy your favourite games?. Flagged for Paul, not rewritten or used to block approved offers.
- Evidence: outputs/cutover-final-scope.json. No changes made to live WordPress or to these staging records.

## Boundaries
No DNS, Cloudflare production settings, live WordPress writes, Tier C redirects, new dated reports, classic post conversions or general drift audits. Existing dated docs remain historical, not current instructions.

## Active checkpoint
Tasks 3–5 complete. Tasks 6–7 have a concrete ACF REST field blocker; conversion/exact-copy extraction code prepared. Moving to independently accessible launch checks. Prior timeout stop checkpoint is superseded by section 0. Only D3/D5 staging SEO writes completed; no remote deployment this turn. Archive membership fetch and pagination implementation in progress.
