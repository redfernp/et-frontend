# Staging content snapshot audit — 1 October 2026

## Refresh after first Gutenberg conversions — 2 October 2026

Later on 2 October, staging post **90616** (`/saturdays-horse-racing-preview-tips-26th-september-2026-seymour-biz.html`) was also converted in place to **36** core Gutenberg blocks after a 6,215/6,215 visible-text parity check and an ignored local raw-content backup. The authenticated REST post-write response confirmed content equality and unchanged status, slug, date, author, categories, tags and Yoast title/description/canonical/robots. A subsequent full snapshot refresh was intentionally stopped because the staging server slowed and single-post REST reads began timing out; therefore the named snapshot below predates this third conversion. Recheck this post's rendered content after staging recovers before treating the refreshed corpus audit as current.

The read-only snapshot was refreshed to ignored `data/raw/staging-wordpress-public-2026-10-02T17-36-37-050Z.json` after staging originals 77061 and 90351 were converted. It still contains 983 routable published posts and 205 routable pages, plus the existing URI-less `Reviews` page exception. Both converted originals retain their exact `.html` URIs, render Gutenberg quote markup, and no longer render the old monochrome portrait. The content audit still finds 103 Beaver-marker and 95 Thrive-marker records (overlapping); those families remain separate work. URL audit still matches 1,028 of 1,057 live 200 paths to a post/page URI. The normal build has zero public-path migration assets by design, so this is **not** a launch-ready URL parity result.

The read-only `npm run snapshot:wp` command saved published WordPress post/page data from the staging WPGraphQL endpoint to a git-ignored local `data/raw/` JSON file. It did not edit WordPress or deploy content. The snapshot contains exact `uri`, title, rendered HTML, dates, and Yoast fields, so it is a source for mapping and transformation—not a publication-ready frontend.

Run `npm run audit:urls` to compare the newest snapshot and built output with the dated live crawl. The `-- --strict` form fails until an exact built asset exists for every live 200 URL, including archive routes; it is a local launch gate, not a substitute for an HTTP crawl on Workers preview.

| Check | Finding |
| --- | ---: |
| Routable published posts | 983 |
| Routable published pages | 205 |
| Page with no URI | 1 (`Reviews`, WordPress ID 15; likely the configured posts page, to verify) |
| Live crawl 200 URLs | 1,057 |
| Exact live 200 URLs found among staging posts/pages | 1,028 |
| Live 200 URLs not represented by a post/page URI | 29 |
| Content records containing staging-host references | 1,141 |
| Content records with empty rendered HTML | 10 |

Of the 29 missing live paths, 28 are category, tag, author, or paginated blog archives. They need their own Astro archive routes, not post/page imports. The remaining path is `/betting-gods-review.html` (live crawl WordPress post ID 33064), absent from the public staging snapshot; verify its current publication and migration treatment before launch. The URI-less `Reviews` page should not be emitted at an invented path.

Rendered WordPress HTML frequently contains absolute links or media URLs pointing at the staging Cloudways host. A transformation must distinguish internal links/media from outbound destinations, rewrite only verified internal references to production equivalents, and verify that commercial copy and offer terms are current. Do not publish the raw snapshot. The current pilot designs remain noindex fixtures.

Next gates: map archive URLs, resolve the one missing post, build and test the HTML transformation, generate routes from verified WordPress URIs, compare metadata/canonicals/robots, and run a status/URL/canonical crawl on an actual Workers preview. Existing live 301s are a separate explicit map; no broad `.html` redirect is planned.

## Local content-bridge slice

`npm run audit:content` now classifies the current 1,188-record staging snapshot before conversion. It found 103 records with Beaver markers, 95 with Thrive markers, 16 with active embeds, 10 empty bodies and 1,141 with staging-host references; these counts overlap. The markers are screening signals, not a complete Beaver/Thrive inventory.

The Dark Horse record has a noindex route under `/migration-preview/`. Its WordPress body HTML is allowlist-sanitised, old links are rendered inert, and only upload images from the known staging/live EveryTip hosts are retained and pointed to the live media host. Builder records, active embeds and inline style blocks fail the preview gate. The preview is not a production URL or editorial approval.

The exact slug is the identity for the public review: `/bet365-review` is the public Seymour review and should retain its current indexable route. The staging WordPress admin title is `bet365 review PPC`, but that label must not determine the migration route, public heading or robots directive. The owner says a distinct PPC version is meant to be noindex; its slug remains unidentified, so do not merge it with this route or infer it from the admin title. The `/bet365-review` noindex *local migration preview* is restored with the public-facing heading. This preview directive is not the intended production robots directive. `/bet365-review-redesign` and `/bet365-review-old` remain separate existing URLs requiring their own parity/SEO decisions.

`npm run test:content`, `npm run check`, `npm run test:routes` and `npm run build` passed for this slice. Astro dev serves the `.html` preview at a trailing-slash development URL; the build normaliser emits the exact `.html` asset. A real Cloudflare preview crawl remains required before claiming public URL parity.

## Exact-URL local pilot — 2 October 2026

The root-level article route is an explicit opt-in conversion test, not part of a normal build. In PowerShell, set `MIGRATION_EXACT_PREVIEW=1` for `npm run build` to generate up to 20 dated prediction articles at their verified live `.html` slugs. Selection requires a matching staging snapshot post, a live crawl 200 marked non-indexable, and body content without detected builder/active markup. Pages are marked noindex/nofollow, commercial anchors are inert, and the banner flags unverified content. The opt-in build generated 20 exact assets (`npm run audit:urls`: 20/1,057); route tests passed. A default build generates zero public-path assets, leaving the launch gate closed.

This proves a narrow routing and content-sanitisation pipeline only. It does not verify editorial copy, author, Yoast metadata, current offers, image rights, legal text, or post-publication HTTP behavior. Do not deploy the opt-in build. Next work is a reviewable conversion model for high-value page families, ACF offer data, archive coverage, and live-URL parity checks on a protected Cloudflare preview.

## Author presentation rule — 2 October 2026

Seymour Biz and John Newsome article previews now use their public WordPress **user profiles** for the colour 300px portrait and biography. The two test posts have WordPress `post.author` set to the `Everytip` uploader account, so author attribution for these recurring columns is selected by their verified legacy slugs and checked against the matching public user-profile slugs. Their old monochrome portraits in the body are suppressed; each page instead has a colour-photo byline at the top and a full profile card at the end. This matching rule must be extended carefully for other columnist post patterns before launch.

The `Everytip` (`erick`) editor profile is different: editorial article pilots show no personal portrait at the top. They use the profile's generic ET logo only in a bottom card, keeping those posts faceless. No unverified biography is inferred from the profile's empty description.
