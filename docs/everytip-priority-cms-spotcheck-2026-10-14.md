# Priority CMS spot check — 14 October 2026

## One staging-only ordinary-post conversion

Post 39813, `/ruby-walshs-most-memorable-horse-racing-rides.html`, was a strict classic-editor candidate: historical editorial copy, no image, offer CTA, shortcode or `/go/` link, and one internal archive link. A fresh authenticated staging read matched its saved snapshot identity and `2024-07-18T13:36:30` modified timestamp. The guarded writer saved `data/raw/wp-preconversion-39813-2026-10-13.json` before updating **staging only**, then produced 21 Gutenberg blocks. Immediate readback preserved raw converted content, visible text, identity, metadata and Yoast SEO. A separate read-only verifier passed exact raw, rendered text (9,389 characters), slug/status and SEO checks. No live WordPress write occurred.

This post is historical and outside the six-hour priority launch set. The coordinator narrowed scope while that single POST was in flight; no further staging writes will follow from this lane without a priority-specific request. Do not count this structural conversion as a launch-ready page or a commercial/SEO approval.

## `/free-betting-tips` published page 76939 — read-only blocker

Staging remains the published 30 September 2026 version: 18,733 raw characters, one Gutenberg wrapper around Beaver content and `[et_offer_news]`, and the Yoast title `Free Betting Tips - Updated Daily | EveryTip`. Live was modified 13 October 2026. After excluding injected `<style>` text, the visible offer-news feed differs: staging presents three 30 September stories (extra places, Lucky 15 and Musselburgh), while live presents three 13 October stories (Arsenal–Lille Bet Builder, six extra-place races and Leicester money-back). A staging-to-Astro release sourced solely from this page would be visibly stale, and copying the entire live page back to staging would risk overwriting the separate Gutenberg/ACF work.

Next bounded step: reconcile just the current news feed and editorial deltas by immutable post IDs and publish dates; keep offer terms/links centrally gated. Replace the Beaver wrapper and offer-news shortcode with typed blocks or data references only after that parity check. The separate unpublished Gutenberg editorial draft 91010 is not a full published-page replacement. No free-tips WordPress write was made in this spot check.
