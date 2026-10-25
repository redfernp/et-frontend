# Pre-launch sync: bring live's latest tips onto staging before the push

Goal: on launch morning, staging gets every change made on live since staging was copied, so
that pushing staging to live loses nothing, while keeping all the staging work (block
conversions, Bet365 removals, top-offers ladders, plugin clean-ups).

## What has to come across (measured 25 October 2026, staging copied about 30 September)

| | Posts | Pages |
|---|---|---|
| Changed on live today | 26 | 1 |
| Changed on live since the copy (newer than staging) | 35 | 4 |
| New on live, not on staging at all | 74 | 0 |

The new posts are mostly the daily offer news (about 3 a day). Paul is deleting all old offer
posts on live except the last 3 days' worth (they are not evergreen), so expect about 9 new
posts at launch. The
changed posts are the 20 to 30 tip pages that are re-dated every day. Post IDs match between
live and staging (staging is a clone), so changed posts are matched by ID.

Ninja Tables rows are not in posts at all: they live in their own database table
(`wp_ninja_table_items`) and are edited on live every day.

## The sync script (`scripts/prelaunch-sync.mjs`, to build)

Reads live, writes staging only. Every staging write keeps a backup in
`outputs/staging-writes/prelaunch/<date>/`.

1. **Report** (`--report`, read-only on both sites)
   - Lists every live post and page with a newer modified date than staging, every live post
     that does not exist on staging, and anything published on staging but gone or unpublished
     on live (those are set to draft on staging in the apply step).
   - Output: a table Paul can scan (title, type, live modified, staging modified, action).

2. **Changed posts** (the tip pages)
   - Fetch the live post's raw content (needs a live application password, used for reading
     only).
   - Re-apply the staging edit recipes so our work survives:
     - plugin comparison table (`cg-table`) -> `[everytip_top_offers count="3"]`
     - remove `cg-disclosure` "18+, Always bet responsibly" lines
     - remove Bet365 / William Hill / Boylesports links and Editors Note lines
     - Beaver/Thrive pages: never overwrite blindly; report for manual review
   - Show a text diff against current staging. Expected: only the day's tips differ.
   - Write content, publish date and Yoast title/description to the same staging ID.

3. **New posts** (offer news and any new tip posts)
   - Create on staging with the same slug, title, content, publish date, author, categories
     and tags (matched by slug, created if missing), Yoast title and description.
   - Featured image and in-content images: upload the live file to staging media and point
     the post at it. Images stay on their current live URLs inside content until the push.
   - Same recipes as step 2 (no Bet365 CTAs etc.).

4. **Changed pages** (4 so far: home, free-betting-tips, top-cricket-betting-sites,
   bet365-6-scores-challenge)
   - Report only. The homepage and free tips page use the new templates; the others get a
     manual look.

5. **Ninja Tables**
   - Do not copy rows into staging. Instead, leave `wp_ninja_table_items` out of the database
     push so live keeps today's rows. (Fallback: copy that one table live -> staging with
     WP-CLI just before the push.)

6. **Verify**
   - Flush staging's object cache, run the incremental build, and check 5 tip pages and 5 new
     offer posts on the test site against live: same tips, same tables, our ladders in place.

## Launch day running order

| When | Who | What |
|---|---|---|
| 2 to 3 days before | Claude | Full rehearsal on staging: report, apply, verify. Fix anything odd. |
| Launch morning, after the morning tips are in (about 09:30) | Paul | Tell Eric and the VA to stop editing live until told. |
| +0 min | Claude | Run the report; Paul glances at it. |
| +5 min | Claude | Apply steps 2 and 3 to staging; re-import `/go/` links from live `redirects.txt`. |
| +20 min | Claude | Verify (step 6). |
| +30 min | Paul | Push staging to live in Cloudways: database only, excluding `wp_ninja_table_items`. |
| +35 min | Paul + Claude | CUTOVER-RUNBOOK checks; switch the build source to live; first live build. |
| +60 min | Paul | Editing reopens on the new site. |

Pushing the database only (not files) keeps live's uploads and `/go/redirects.txt` untouched.
The only file change made on staging is the rebuild-hook plugin, which can be installed on live
directly.

## Needed from Paul before the rehearsal

- A live WordPress application password (Editor role is enough); used only for GET requests.
- Confirm Cloudways lets you push the database with selected tables excluded (it offers table
  selection on push); otherwise we use the WP-CLI fallback for Ninja Tables.
- Pick launch day and the editing freeze window with Eric and the VA.

## Risks and how they are handled

- **Edits on live during the sync**: the freeze; the report is re-run just before the push and
  must show nothing new.
- **Staging object cache serving old copies**: flush Redis after the writes; the build already
  retries stale records.
- **Live deletions or unpublishing since the copy**: anything published on staging but gone
  from live (for example the old offer posts Paul is deleting) is set to draft on staging, so
  the push does not bring it back. Paul adds any 301s he wants for the deleted URLs.
- **New categories, tags or authors on live**: created on staging by slug before the posts.
