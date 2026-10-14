# Bet365 exact-review staging CMS bridge — 14 October 2026

The exact `/bet365-review` Astro preview can now opt into a fresh, read-only WPGraphQL fetch of staging **page 87553**. By default it continues to use the dated snapshot. Set `MIGRATION_STAGING_BET365_REVIEW_READ=1` only for a local build when current staging copy is needed. The fetch is pinned to the staging `/graphql` endpoint and page database ID. A failed read, wrong slug/path/status, missing body or changed ten-section editorial structure stops the opted-in build rather than falling back silently.

One staging GET on 14 October returned published page 87553, exact `/bet365-review`, modified `2026-09-01T13:57:27`. The existing safe extractor accepted the fresh body and retained nine noncommercial numbered sections (2–10), with 19 paragraphs. The welcome-offer section and affiliate destinations remain withheld. This is a source-data integration check, **not** verification of claims or permission to publish.

The Astro review intentionally keeps neutral preview SEO rather than importing the WordPress meta description: source SEO describes a £30 test bankroll while Seymour's article describes £20. Resolve that editorial inconsistency before public indexability. The PPC/noindex review is a separate identity and cannot flow into this route.

Verification: five focused Bet365 source/extractor tests passed, the 36-test priority slice passed, and `npm run check` reported zero diagnostics. No WordPress write, deployment, DNS change or commercial CTA activation occurred.
