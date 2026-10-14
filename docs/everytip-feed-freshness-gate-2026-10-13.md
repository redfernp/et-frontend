# Homepage and free-tips feed freshness — 13 October 2026

Local preview only. No staging/live write, Cloudflare deployment, REST production feed or commercial activation.

- Homepage columnist cards: newest dated staging-snapshot post is **24 September 2026**, **19 Europe/Rome calendar days** before this audit. The weekly-card threshold is 7 days, so the homepage preview explicitly labels the feed stale and no longer presents its directory as “Latest Free Betting Tips”.
- Exact free-tips page: the five-post WPGraphQL feed is still an explicit staging-only opt-in. With no opt-in, current daily selections and the feed remain withheld; no fixture is presented as a live feed. When opted in, its newest post is checked against a 2-day threshold and a stale warning/date is displayed. The feed still carries no imported offer claims or affiliate destinations.
- The helper rejects invalid or future publication dates and uses Europe/Rome calendar days rather than elapsed hours. Both exact pages remain noindex previews. Historical WordPress editorial copy is preserved but still requires an editorial current-claims review before launch.

Launch blocker: publishing must wait for a recent, validated WPGraphQL feed and an editorial review of time-sensitive claims. A stale feed now reports its age; this detection does **not** make old tips current.

Validation: 10 focused tests passed; `npm run check` passed (286 files, 0 diagnostics). No remote calls were made.
