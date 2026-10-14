# Exact weekly archive pilot — 13 October 2026

Local-only work. No staging/live writes, deployment, DNS changes or commercial CTA activation.

## Scope and source

- `/saturday-horse-racing-tips`: Seymour Biz, 315 dated snapshot posts, 16 archive pages.
- `/english-premier-league-predictions-for-saturday`: John Newsome, 198 dated snapshot posts, 10 archive pages.
- Each entry keeps its original `.html` URL. The checked local build emitted all 513 linked article assets; none were missing.
- The default source is the labelled 2 October staging WordPress snapshot. `MIGRATION_STAGING_WEEKLY_ARCHIVE_READ=1` permits a read-only staging WPGraphQL refresh, but only if every matching post ID and exact URI agrees with the dated route registry. New/moved/removed records stop the build rather than silently changing routes.
- Both hub base pages are noindex,nofollow previews. Page 2+ is noindex,follow, solely by explicit request. All pages retain the `not-for-publication` preview marker; no canonical or active offers are emitted.

## Route ownership and checks

- The generic exact-route planner excludes both dedicated archive hubs and `/bet365-review`; the former's uncrawled published record is also excluded from generic supplemental routes.
- The preview robots resolver can never produce an indexable preview. Unit tests cover this and generic-route collision prevention.
- `node --test tests/weekly-column-archive.test.mjs tests/exact-route-preview.test.mjs tests/base-layout-sidebar.test.mjs`: 15 passed.
- `npm run check`: 0 errors, 0 warnings; one unrelated unused-variable hint in Bet365 review code.
- Offline opt-in `npm run build`: 1,259 pages built, 977 exact `.html` routes normalized. Checked both hub base pages and page 2 for robots, sidebar and preview marker.
- `npm run test:routes`: 10 passed. `npm run test:content`: 117 passed.

## Release boundaries

These remain noindex previews. The exact hubs should not be made indexable until fresh WordPress content, author/archive editorial copy, Yoast metadata, menus, safe linked articles, and live-vs-preview presentation pass release QA. Historical posts are explicitly described as dated records, not current tips.
