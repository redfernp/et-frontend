# EveryTip launch progress

Updated: 14 October 2026. Authority: CODEX-HANDOFF-RESCOPE.md; supersedes earlier lanes and dated migration reports.

## Done
- Current repository checkpoint committed as 0928025.
- Stopped per-post Gutenberg conversion and general live/staging drift work.
- Read all D1–D6 answers. No owner decision is outstanding.

## In progress
- Section 6 task 3: switch the default build to fresh staging WPGraphQL through WPGRAPHQL_ENDPOINT, without snapshot fallback.

## Blocked
- Task 1 push: GitHub HTTP 403; active account predfern-rs lacks access to redfernp/et-frontend. Local checkpoint is complete. Access is an operational blocker, not an unanswered D1–D6 decision.

## Launch checklist (section 4)
- [ ] Build reads staging WPGraphQL directly; one endpoint environment variable.
- [ ] Every staging 200 URL returns 200 at the exact Workers preview path.
- [ ] Existing 301s retain their targets.
- [ ] Indexable titles, descriptions, canonicals and robots match staging Yoast; zero unexplained differences.
- [ ] Sitemap includes every indexable URL and excludes noindexed URLs.
- [ ] All /go/ links resolve to current destinations and use sponsored/nofollow.
- [ ] Homepage, free tips, free bets and all reviews show current ACF offers.
- [ ] Ninja table pages render tables without withheld rows.
- [ ] Analytics and tracking fire on preview.
- [ ] Save webhook and scheduled fallback rebuild work.
- [ ] Thirty-page QA at 375px and desktop, including required families.

## Decisions (section 5)
- [x] D1: staging WPGraphQL comes across with the cutover push; no separate live installation.
- [x] D2: all seven offers are approved and UK only; checked 14 Oct 2026; exact headlines and terms from page 56315; eligibility from terms; publish on staging; full terms and official terms URL optional. Implementation pending.
- [x] D3: use £20 in Bet365 review staging Yoast description. Implementation pending.
- [x] D4: migrate free bets page as supplied; flag risk-free/win-win only in general prose outside offer blocks.
- [x] D5: no live noindex work; fix staging John post 70985. Implementation pending.
- [x] D6: suggest Tier C targets only; Paul creates redirects.

## Order of work
1. [ ] Commit and push baseline (commit done; push blocked).
2. [x] Create this single progress file.
3. [ ] Fresh staging WPGraphQL build.
4. [ ] GSC builder tiers (12-month clicks and referring domains required).
5. [ ] Generic builder cleanup for Tier B.
6. [ ] Tier A Gutenberg + ACF on staging. The user's explicit prohibition on live writes overrides section 3a's live wording.
7. [ ] Publish seven staging offers and wire slots.
8. [ ] Workers launch checklist.
9. [ ] Cutover checklist and narrowly scoped owner-rewrite/free-bets differences.

## Boundaries
No DNS, Cloudflare production settings, live WordPress writes, Tier C redirects, new dated reports, classic post conversions or general drift audits.
