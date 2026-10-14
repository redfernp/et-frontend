# Exact home/free-tips preview head guard — 14 October 2026

The homepage and free-tips page now have optional body/feed reads from unpublished Gutenberg or live public REST sources. Those reads must not silently replace the **published page identity and SEO fields**, or make either preview indexable.

`scripts/audit-priority-head-preview.mjs` is a read-only guard against the two exact built assets. It compares each title and meta description with the dated published WordPress snapshot by ID/path, requires exactly one preview marker and `noindex,nofollow`, rejects a canonical link, unpublished-draft slugs and the staging host. It does not imply the wording is currently approved: both source metadata sets still contain “daily”/“updated” claims that need a fresh editorial/freshness gate before release.

At 00:07 Europe/Rome, 14 October, both exact assets passed: homepage ID 16 and free tips ID 76939 retained their published-source title/description, were `noindex,nofollow`, had no canonical, and carried the local preview marker. Focused test `node --test tests/priority-head-preview-guard.test.mjs` passed 1/1, including rejected indexable/draft-SEO cases.

This check uses the dated source snapshot and local `dist`; it is **not** fresh live SEO parity. The separate 15-route live REST audit ran earlier. A new authenticated staging homepage REST comparison was attempted here but timed out after 30 seconds, so no home draft-body substitution or staging claim was made. No WordPress write, deploy or CTA change occurred.
