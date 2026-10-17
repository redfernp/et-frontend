# EveryTip Astro migration: re-scope and launch plan (14 Oct 2026)

From Paul (owner). This replaces the working approach in `docs/everytip-content-migration-run-2026-10-13.md`. Read this before doing anything else.

The goal is to switch www.everytip.co.uk to the Astro frontend. It is **not** to convert every WordPress post to Gutenberg first. That conversion has been treated as a launch blocker, and it isn't one.

## 0. Update, 14 Oct evening (overrides the sections below where they conflict)

- **No traffic tiering.** Paul says the GSC and referring-domain data won't change much, so don't wait for it. Tier A is a fixed list: the homepage, `/free-betting-tips`, `/bookie-free-bets-bonus-offers`, and every bookmaker review and sign-up offer page. **Every other Beaver/Thrive page is Tier B** (generic cleanup). There is no Tier C list for now.
- **Staging writes without SSH.** Until Paul supplies the Cloudways SSH details, single-record writes on staging (the 7 offers, the Bet365 £20 description, post `70985` noindex, Tier A pages) may go through the authenticated REST API, one record at a time, reading each one back once. If a field can't be written over REST (for example ACF fields the route doesn't expose), record it in PROGRESS.md as needing SSH and move on.
- **Staging timeouts.** Make the WPGraphQL fetch resilient instead of waiting for a faster server: small page sizes, sequential requests, retry with backoff, and an on-disk cache of completed pages so a rerun resumes where the last one stopped. Use the cache for local builds; a full fresh fetch is only required for the final launch check.

## 1. What an independent review found

- The Astro build already works: 1,264 pages, exact `.html` routing on Workers, 0 broken internal links across 21,099, and clean Astro checks. It renders from WordPress HTML, so a post does not need to be in Gutenberg to display correctly.
- Gutenberg conversion is at 115/983 posts after roughly two weeks, done one post at a time over a slow staging REST API that keeps timing out. At this rate the remaining posts would take months.
- Most of that effort went into John Newsome and Seymour Biz columns. About 440 of them are noindexed archive posts that nobody will edit again.
- The 2 October snapshot shows where the hard content actually is:

  | | Classic | Beaver Builder | Thrive | Blocks |
  |---|---:|---:|---:|---:|
  | Posts (983) | 971 | 8 | 1 | 3 |
  | Pages (205) | 107 | 95 | 2 | 1 |

  Builder markup affects about 106 records, almost all of them pages.
- A lot of time has gone into chasing differences between live and staging: the modified-time guard keeps skipping posts, and new live articles are being handled with one-off modules (`src/lib/live-john-week7.mjs`, `live-seymour-oct10.mjs` and so on, each with its own snapshot script). That work isn't needed (see rule 3).
- Process overhead: 87 dated reports in `docs/`, 102 scripts, 67 test files, and a single git commit (3 August).

## 2. New rules of work

1. **Gutenberg conversion is post-launch work.** Do not convert any more classic posts before launch. Classic content renders from `content.rendered` as it is.
2. **Never convert noindexed John/Seymour archive posts.** They stay classic permanently.
3. **Staging is the source of truth. Ignore live drift.** At cutover Paul pushes staging to live, so whatever is on staging becomes the site. Build from staging WPGraphQL directly (not the 2 October snapshot file). Stop auditing live against staging, stop tracking "live-only" posts and stop creating previews for new live articles. New live posts are daily offer posts that go out of date within a day and will mostly be deleted; daily tips posts overwrite the previous day's tips. Delete the per-article `live-*` modules and their snapshot scripts.
4. **No more one-off code per article.** If a new post doesn't render, fix the generic template or the content family, not that single post.
5. **Git discipline.** Commit to `redfernp/et-frontend` at least once per completed task, with a clear message, and push daily. Paul needs to see progress in GitHub history.
6. **One progress file only.** Keep a single `PROGRESS.md` at the repo root and update it in place: done, in progress, blocked (with the decision ID). No new dated report per action. Leave the existing `docs/` files where they are, but don't add to them.
7. **Don't stall on a blocked item.** If something needs Paul's decision, record it in `PROGRESS.md` and move to the next item on the list.
8. **No new audit scripts** unless they gate a launch item in section 4. Keep what already exists; don't extend it.
9. **Verification by sampling.** For any batch content change, check a random sample of 10 rendered pages plus every page that gets organic traffic. WordPress revisions are the rollback. Per-post independent readback is no longer required.
10. **Bulk WordPress writes go through WP-CLI over Cloudways SSH**, not the REST API, if they are needed at all.

## 3. Content plan (only for what blocks launch)

### 3a. Beaver/Thrive pages (~97 pages, 9 posts)

1. Pull 12 months of Google Search Console clicks per URL (the export is enough) and put the builder records into three tiers:
   - **Tier A, top 20 to 30 by clicks, plus the homepage, `/free-betting-tips`, `/bookie-free-bets-bonus-offers`, and every review and sign-up offer page:** rebuild in Gutenberg plus ACF on staging WordPress, using the agreed hybrid model (core blocks for prose, ACF offer slot blocks for offers).
   - **Tier B, pages with some traffic:** render the existing builder HTML through one generic "builder cleanup" sanitiser in Astro (strip `fl-*`/`tve_` wrappers and inline styles, keep text, headings, images, tables and links). One component handles all of them; no per-page work.
   - **Tier C, zero clicks and no referring domains:** list them in `PROGRESS.md` with a suggested 301 target. Paul creates the redirects himself. Don't rebuild them or add redirects.
2. The eight owner-rewritten pages in `../legacy-rewrites/CODEX-HANDOFF.md` are already done on live. Render them from live like any other page.

### 3b. Ninja Tables (15 posts, 29 pages, 49 table IDs)

For launch, render the table HTML that WordPress outputs at build time, the same as any other content. Stop withholding "stale" rows: the daily tips overwrite each morning, and cutover happens just before that morning's tips go in (section 4a), so the tables will be current from day one. Moving tables into an ACF model is post-launch work.

### 3c. Offers and affiliate links

Launching without working affiliate CTAs is not acceptable; that's the site's revenue. **The free bets page (`/bookie-free-bets-bonus-offers`, ID `56315`) holds the current, approved text for every offer.** Copy each offer's headline and terms from that page into its ACF offer record word for word. Don't rewrite, shorten or second-guess it, and don't hold offers back for extra claim review. Finish the 7 offer records using the D2 answer and publish them. Every `/go/` link must resolve to the same destination it does on the current site.

## 4. Launch checklist (definition of done)

Launch happens when all of these pass, and nothing else is required:

- [ ] The build reads staging WPGraphQL directly, and the endpoint is a single env variable so it can be switched to live after the push.
- [ ] Every URL that returns 200 on **staging** returns 200 at the exact same path on the Workers preview. Live URLs that don't exist on staging (old daily offer posts) are ignored unless they have referring domains, in which case list them for Paul.
- [ ] Existing 301s still 301 to the same targets.
- [ ] Title, meta description, canonical and robots on the preview match staging's Yoast values for every indexable URL (diff report, zero unexplained differences).
- [ ] XML sitemap contains every indexable URL and nothing noindexed.
- [ ] All `/go/` affiliate links resolve as they do today, with `sponsored`/`nofollow` set.
- [ ] Homepage, free tips, free bets hub and every bookmaker review show current offers from the ACF records.
- [ ] Ninja table pages render their tables (no withheld rows).
- [ ] Analytics and tracking fire on the preview.
- [ ] Rebuild webhook fires on post/page/offer save, with a scheduled fallback rebuild.
- [ ] Spot check of 30 pages at 375px and desktop: homepage, hubs, reviews, five Tier B pages, five classic posts, five columnist posts.

## 4a. Cutover morning (Paul runs it, Codex prepares the checklist)

1. Before the push, re-apply on staging any live-only edits Paul wants to keep. At minimum, check that the free bets page (ID `56315`) on staging has the same offer texts as live, and that the eight owner-rewritten pages from `../legacy-rewrites/CODEX-HANDOFF.md` (rewritten on live on 4 October) and the pages unpublished that day match on staging. Codex: produce this short list of differences for Paul; don't try to sync everything.
2. Early morning, before the daily tips are added: push staging to live on Cloudways.
3. Switch the build's WPGraphQL endpoint to live and point the rebuild webhook at the Workers build. WPGraphQL and its addons come across with the push.
4. Rebuild, smoke-test the homepage, hubs, reviews, five posts and the `/go/` links on the preview.
5. Paul switches DNS/routing. Codex does not change DNS or Cloudflare production settings.
6. Add that morning's daily tips as normal, and confirm the rebuild picks them up.

Things that are explicitly **not** launch items: converting classic posts to Gutenberg, the columnist rolling-noindex automation, the EveryTip MCP server, Ninja-to-ACF modelling, the tracking/email attribution spec, and moving media off `www.everytip.co.uk`.

## 4b. Post-launch backlog

- **Columnist hubs (decided 15 Oct: after launch, not before).** Today `/john-newsome` 301s to the Thrive page `/english-premier-league-predictions-for-saturday` and `/seymour-biz` 301s to `/saturday-horse-racing-tips`. Keep this as it is for launch. After launch, review how those keyword pages perform on the new site, then decide between: (a) making the category archives the hubs (set them to index, 301 the Thrive pages to them, accept a temporary ranking dip), or (b) keeping the keyword URLs and rebuilding those two pages in Gutenberg plus ACF.
- Gutenberg conversion of classic posts, only when an editor next edits them.
- Ninja Tables into an ACF model.

## 5. Decisions needed from Paul

Codex: add the answers to `PROGRESS.md` as they come in. Until a decision is answered, work on everything else.

| ID | Decision | Recommended default |
|---|---|---|
| D1 | ~~WPGraphQL on live~~ | Not needed: staging is pushed to live at cutover |
| D2 | ~~Offer record fields~~ | **Answered 14 Oct:** all 7 offers are current and UK only. Set country to UK, last-checked to 14 Oct 2026, copy the headline and terms from the free bets page (ID `56315`) word for word, take eligibility from those terms, then publish all 7 on staging. Make full terms and official terms URL optional in the model |
| D3 | ~~Bet365 review bankroll~~ | **Answered 14 Oct:** use £20. Change the Yoast meta description on staging from £30 to £20 so it matches the body |
| D4 | ~~Free bets hub copy~~ | **Answered 14 Oct:** the offer texts on the page are current and are the source for all offer copy. Migrate the page as it is. Only flag "risk-free" or "win-win" if it appears in the general prose outside the offer blocks |
| D5 | ~~Live columnist noindex~~ | Not needed: staging already has them noindexed and replaces live at cutover. Codex fixes the one remaining staging post (John `70985`) |
| D6 | ~~Tier C redirects~~ | **Answered 14 Oct:** Paul sets up the 301s himself. Codex only produces the Tier C list with a suggested target for each, and doesn't create any redirects |

## 6. Order of work

1. Commit and push the current state of the repo as it is.
2. Create `PROGRESS.md` with sections 4 and 5 as checklists.
3. Switch the build's data source from the snapshot file to staging WPGraphQL, with the endpoint in one env variable.
4. Produce the GSC-based tier list for builder pages (section 3a) and commit it.
5. Build the generic builder cleanup sanitiser and apply it to all Tier B pages.
6. Rebuild Tier A pages in Gutenberg plus ACF.
7. Publish the 7 offers (D2) and wire them into the ACF slots.
8. Run the launch checklist on the Workers preview and report results in `PROGRESS.md`.
9. Write the cutover morning checklist (section 4a) with the live-only differences list for Paul.

Paul expects visible progress in GitHub every day. If the plan above is wrong somewhere, say so in `PROGRESS.md` with the reason. Don't silently go back to the per-post conversion approach.
