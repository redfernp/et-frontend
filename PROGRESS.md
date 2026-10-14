# EveryTip launch progress

Updated 14 October 2026. Authority: CODEX-HANDOFF-RESCOPE.md. Earlier lanes and dated gates are superseded. D1-D6 are answered.

## Done
- Baseline committed (0928025) and pushed to redfernp/et-frontend/main. Explicitly using the existing redfernp GitHub credential resolves the default-account 403.
- Created this single progress file with sections 4 and 5 as checklists.
- Default Astro entry point now reads fresh paginated staging WPGraphQL through WPGRAPHQL_ENDPOINT. No snapshot fallback or live-only overlays. Shared layout retained; old pilot routes are outside the default build.
- Removed per-article live modules, their snapshot scripts and obsolete overlay tests. Stopped classic post conversions and general live/staging drift work.
- Generic builder cleanup strips builder wrappers/styles and retains prose, headings, images, tables, links and ACF slot markers. Applied by markup detection; final Tier B membership awaits GSC.
- Rendered affiliate links retain existing www.everytip.co.uk/go paths and receive sponsored/nofollow. Workers /go routing remains outstanding.
- Sitemap uses source robots. Added a section 4 gate for built assets, Yoast parity, sitemap membership, affiliate relations and unresolved offer slots.
- Preview packaging preserves source Yoast meta and adds HTTP X-Robots-Tag noindex. No remote upload performed.
- Latest Astro check: zero errors/warnings/hints. Eight focused content-source, pagination, cleanup and archive tests passed.

## In progress
- Task 3 implementation is committed; full verification failed after fetching 983 posts because staging page requests timed out. A smaller five-page probe also exhausted retries. No successful final build or new Workers deployment.
- Task 5 cleanup is implemented; random-ten and traffic-page rendered sampling remains outstanding.
- Task 8: new entry point covers posts/pages only. Fresh taxonomy/author/blog archives and pagination remain to implement. No complete coverage claim.
- Task 9: cutover checklist and scoped difference inventory recorded below. Exact offer-text reconciliation and timeout cases remain open.

## Blocked
- Tasks 4/6, D6 implementation: missing 12-month GSC URL-click export and referring-domain inventory. Requested location. Missing data cannot establish zero clicks or zero referring domains; no Tier C classification or redirects invented.
- Tasks 6/7, D2/D3/D5 implementation: SSH keys exist but Cloudways username and staging application directory were not found. Requested details. No bulk REST fallback or WordPress writes.
- Tasks 3/8: repeated staging GraphQL timeouts block complete build, SEO/URL parity and rendered/Workers QA. The archive-schema probe also timed out.
- Task 8: analytics configuration, save-trigger webhook and scheduled fallback are not connected. These are implementation/configuration gaps, not new approval requests.

## Launch checklist (section 4)
- [ ] Fresh staging WPGraphQL build with one endpoint variable. Code implemented; full build failed.
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
- [x] D3: GBP 20 in Bet365 staging Yoast description; CMS change pending.
- [x] D4: migrate free bets as supplied. Flag risk-free/win-win only outside offer blocks. No extra offer-claim approval gate.
- [x] D5: no live noindex work; fix staging post 70985. CMS change pending.
- [x] D6: suggest Tier C targets only; Paul creates redirects.

## Order of work
1. [x] Commit and push baseline.
2. [x] Create PROGRESS.md.
3. [ ] Fresh staging build: implementation committed, verification blocked by timeouts.
4. [ ] GSC tiers: blocked by missing exports.
5. [ ] Generic cleanup: implemented; rendered sampling/final membership pending.
6. [ ] Tier A Gutenberg + ACF: blocked by SSH details and GSC ranking. Use staging; user's no-live-write instruction overrides section 3a's live wording.
7. [ ] Publish seven offers and wire slots: blocked by SSH details.
8. [ ] Workers launch checklist: not passed.
9. [ ] Cutover checklist and scoped difference inventory prepared; exact offer-text comparison and timeout cases remain incomplete.

## Cutover morning checklist for Paul
1. Before pushing, re-apply only desired live edits to staging. Check exact offer texts on 56315, the eight owner rewrites and the unpublished records below. For Paddy Power 34795, ensure rewritten post_content renders instead of the old Thrive content; use page SEO from ../legacy-rewrites/manifest.json where needed.
2. Early morning before daily tips, push staging to live through Cloudways.
3. Set WPGRAPHQL_ENDPOINT=https://www.everytip.co.uk/graphql in the build environment. Point the save webhook at the Workers build and verify the scheduled fallback.
4. Rebuild and pass the complete section 4 checklist. Smoke-test homepage, hubs, reviews, five posts and /go links on Workers preview. Do not cut over while any launch gate is open.
5. Paul switches DNS/routing. Codex makes no DNS or Cloudflare production changes.
6. Add that morning's tips normally; confirm the rebuild updates rendered tables. Retain prior deployment and WordPress backup for rollback.

## Narrow cutover differences (14 October read results)
Scope is only section 4a; HTML inequality is a signal for review, not proof every text passage differs.
- 56315: both REST reads 200; rendered HTML differs. Exact offer-text comparison still required.
- Rewrites 56061, 72881, 60150, 12138, 7945, 34795: both reads 200; rendered HTML differs.
- Rewrites 10754, 1482: live 200, staging timeout; unknown.
- Unpublished IDs 59675, 59683, 88734, 11057, 19627, 89061, 89063: staging 200, live public REST 401. Owner handoff identifies these as unpublished; Paul must check staging status before push.
- Other unpublished IDs 89134, 37819, 5438, 11716, 11710, 11708, 33064 and 20902: staging timed out; live public REST returned 401. Confirm staging status before push.
- Confirmed meta-description differences: post 12138 retains the old RaceBets promotion on staging while live has the owner legal explainer; post 7945 retains the old full-time-career pitch on staging while live describes a small-stakes beginner guide. Copy the intended owner metadata before push.
- HTML differences can include hostname or wrapper changes. Exact offer-text equality is not established by these reads; do not treat the free-bets check as passed.

## Boundaries
No DNS, Cloudflare production settings, live WordPress writes, Tier C redirects, new dated reports, classic post conversions or general drift audits. Existing dated docs remain historical, not current instructions.

## Stop checkpoint
- All eight focused unit tests pass; Astro check passes (351 files, zero diagnostics). Full fresh build did not pass.
- Build-dependent legacy route tests were attempted and failed because the failed build emitted no complete assets; obsolete pilot assertions were removed. Current exact-route and redirect-target asset checks still need a successful build.
- No Workers upload, WordPress write, DNS or Cloudflare production change occurred. No background migration or conversion task was started.
- Resume with GSC/referring-domain export location, Cloudways staging SSH username/application path and responsive staging GraphQL. Then finish task 3 coverage and build verification before proceeding through the remaining launch gates.
