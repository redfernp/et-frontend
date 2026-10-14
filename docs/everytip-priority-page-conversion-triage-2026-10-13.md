# Priority page Gutenberg conversion triage — 13 October 2026

Read-only authenticated staging REST checks on 13 October 2026. No WordPress writes, live edits, deployment, or commercial activation were made. The named staging host was verified before the reads; credentials were not logged.

## `/english-premier-league-predictions-for-saturday` — page 24016

The current published staging page is still classic raw content, modified `2026-09-25T15:30:46`, matching the 2 October staging snapshot's modified time and rendered body. It has no core Gutenberg markers. Raw body length is 30,402 characters, with 64 links and four images. It contains Thrive's `[tcb_pagination_current_page]` and `[tcb_pagination_total_pages]` tokens inside pagination markup, four `href="#"` links, and Thrive-related registered meta keys. The current Yoast title is `English Premier League Predictions For Saturday | John Newsome Tips`; its description is present, robots are `index,follow`, and the staging canonical retains the exact page path. These must be preserved/reconciled during any rewrite.

The strict classic-to-Gutenberg converter rejects this body (`Image requires an editorial image-block decision`). Even adding image support would not safely reproduce the Thrive pagination or distinguish editorial article links from controls. **Do not generic-convert page 24016.** The safe migration is a purpose-built archive: keep the page ID/slug, move only checked evergreen introduction copy into editable Gutenberg paragraphs, build the John article list/pagination as a typed dynamic component, then compare all article destinations, media, visible text, Yoast fields, desktop/mobile render, and page-2 noindex behaviour against WordPress. Save a raw-body/meta/SEO backup immediately before any future staging write and require readback parity. The current local Astro archive preview does not by itself authorize changing the CMS original.

## Other priority page candidates sampled

| Staging page | Current shape | Strict conversion result / decision |
| --- | --- | --- |
| `23888` Seymour archive | 3,592 raw characters; two links, six images; modified 25 Sep 2026 | Rejected on inline image requiring editorial block decision. Inspect its image/author presentation and archive list before any write. |
| `61` terms and conditions | 20,397 raw characters; one link; last modified 2018 | Rejected on nested list markup. Legal text is old; review editorial/legal currency and list semantics before structural conversion. |
| `6376` privacy policy | 24,201 raw characters; ten links; last modified 2018 | Rejected on top-level `header` markup. Privacy/consent stack needs owner/legal review; do not convert merely to raise the Gutenberg count. |

The priority roundup post `33470` (`/low-or-no-minimum-deposit-betting-sites.html`) was also sampled because it had seemed like a possible simple-body candidate. It is published, modified 25 September 2026, with 12,627 raw characters, two links and four images. The strict converter likewise rejects an inline image. Its approved Astro presentation should be backed by a structured roundup model, not an unreviewed one-pass classic-body rewrite.

No one-page write passed the content-preservation gate in this triage. The priority launch work should focus on the typed archive and verified current WordPress text/SEO sourcing, while straightforward ordinary articles continue through the already guarded small-batch converter.
