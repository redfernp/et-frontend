# Daily-tip content lane — 13 October 2026

Scope: ordinary EveryTip tip posts other than John Newsome and Seymour Biz columns. Staging WordPress only. No live WordPress, Cloudflare, offer-record, or shared converter change was made in this lane.

## Guarded conversions

Two original published posts were converted from classic HTML to core Gutenberg blocks:

| WordPress ID | Exact path | Blocks | Independent readback |
| --- | --- | ---: | --- |
| 352 | `/dubai-horse-racing-tips.html` | 3 | Passed |
| 79969 | `/fran-berry-horse-racing-tips.html` | 23 | Passed |

Both retained their IDs, slugs, published status, visible text, rendered text, metadata, and Yoast fields. The exclusive-create preconversion backups are `data/raw/wp-preconversion-352-2026-10-13.json` and `data/raw/wp-preconversion-79969-2026-10-13.json` (ignored local files). Each update used the existing one-post REST guard and separate verification script. These are historical tips, not current selections; their claims and embedded links still require the editorial/SEO release pass.

The 2 October snapshot also offered structurally convertible content for IDs 8300, 21531, 73431, 90319, 70136, 82908, 82899 and 79970. IDs 8300, 21531 and 73431 already have earlier preconversion backups; 70136, 82908, 82899 and 79970 were converted in the 4 October batch. The dry-run for 90319 refused conversion because the current staging post no longer matched the snapshot guard. It was **not** changed here. Four other dry-runs (8300, 21531, 73431 and 90319) likewise refused because identity, modified time, or classic-editor state changed. Their precise current state requires a fresh, low-load authenticated read; a rejected guard is not permission to overwrite the post.

## Daily-tip family screen

A deliberately broad local screen selected 41 snapshot posts with a `tips` or `predictions` `.html` path, dated in 2026, excluding John/Seymour. It is **not** a definitive production taxonomy: it includes evergreen tips hubs and event previews. Only 10 of the 41 parsed through the current strict core-block converter; seven of those had earlier conversion backups, the two above were converted here, and 90319 needs fresh reconciliation. Among the 41 snapshot bodies, 18 contain a rendered `<table>` and 24 contain a `<div>`. These may be Ninja Tables output, layout modules, or other content and must not be flattened into prose.

The earlier authenticated Ninja Tables audit reported 15 posts and 30 pages with shortcodes, spanning 49 table IDs. There is an important data-shape trap: the dated public snapshot contains rendered table HTML, not the raw `[ninja_tables ...]` shortcode markers. The existing Ninja audit script looks for markers in that snapshot before requesting `content.raw`; on the 2 October snapshot that filter selects none. A safe next audit must inspect the authenticated raw body for the relevant IDs (or obtain a new raw-content inventory). **No table-bearing post should enter the generic converter based solely on a rendered snapshot.** The converter itself correctly rejects Ninja shortcodes when it sees raw content.

## Dedicated table-block requirement

For a shortcode-bearing post, preserve the exact source table ID and any filter (for example, the Dark Horse table `72501` and the Kempton course filter) as a structured reference. A Gutenberg/ACF table-placement block should render a stable marker rather than copying table rows into post prose. Astro then resolves that marker against a separately validated tips-table data feed, with a visible unavailable state if the table or filter is missing. The WordPress REST upload path for daily input files and the WPGraphQL read path for the frontend need their own round-trip test. This is model work, not an authorization to rewrite existing Ninja Tables posts yet.

Next safe step: repair the raw-shortcode inventory as a read-only operation, then pilot one Ninja-bearing *draft* or copied post through an ACF/table-reference block and Astro preview. Preserve the original published post until row/filter and mobile rendering parity are proven. Keep staging writes in small, serialized batches while the server is slow.
