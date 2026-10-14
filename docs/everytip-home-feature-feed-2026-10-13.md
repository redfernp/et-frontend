# Homepage columnist-card feed — local implementation, 13 October 2026

The exact homepage and `/pilot/home/` no longer use four invented feature-article cards. By default they select four dated Seymour Biz/John Newsome records from the 2 October public WordPress snapshot, showing the real title, sport and publication date without clickable article or commercial links. The section now says **Columnist Articles** instead of implying a general live article feed.

For a deliberate local preview build only, `MIGRATION_STAGING_HOME_FEATURE_READ=1` reads the latest 50 published posts from the exact staging WPGraphQL endpoint and selects the newest four matching columnist paths. The reader uses a read-only GraphQL POST, validates ID, URI/slug, published state, title, descending dates and uniqueness, and rejects a malformed/incomplete feed. A failed opted-in request stops the build; it does not silently fall back to the dated snapshot. The feed provides no affiliate destination or active article CTA.

This is **not production feed integration**. It currently surfaces only known columnist families, has no editorial promotion ranking, and does not yet wire new CMS URLs into a guaranteed built public route. Keep the homepage noindex and links withheld until the full published-feed and route/SEO checks pass. No staging/live write or deployment was made.

Validation: `node --test tests/home-feature-feed.test.mjs` passed 3/3; `npm run check` passed 267 Astro files with zero diagnostics. A live staging query was not attempted during the server interruption; the GraphQL response contract is covered with mocked reads and still needs a healthy read-only staging smoke check.
