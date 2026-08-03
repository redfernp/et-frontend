# EveryTip Tracking And Email Attribution Spec

Date: 2026-07-24

## Purpose

Build a first-party tracking and attribution layer for the Astro frontend so email signups can be mapped to the EveryTip content, pillars, reviews, offers, and CTAs that moved the visitor toward signup.

The goal is not just reporting. The goal is to drive better email automation, especially soap opera style sequences that speak to the visitor's demonstrated betting interest.

## Core Principle

GA4 is useful for reporting, but it should not be the source of truth for lead intelligence.

EveryTip should own a first-party event trail:

- Anonymous before signup.
- Known after signup.
- Consent-aware.
- Structured around content pillars and bookmaker intent.
- Synced into the email platform as clean fields/tags.

## High-Level Architecture

| Layer | Recommended Tooling | Responsibility |
| --- | --- | --- |
| Frontend | Astro on Cloudflare Pages | Render pages, emit consent-aware events |
| Event collector | Cloudflare Pages Functions or Worker | Accept first-party tracking and form events |
| Event store | To be selected | Store page, engagement, signup, and CTA events |
| Contact sync | Worker/server function | Push clean traits/tags to email platform |
| Email platform | To be selected | Soap opera sequences and offer follow-up |
| Reporting | GA4, Search Console, event dashboard | Aggregate performance and content insights |

## Identity Model

Before signup:

- Create `anonymous_id`.
- Create rolling `session_id`.
- Track permitted behavioural events against `anonymous_id`.

At signup:

- Form submits email and consent fields to a first-party endpoint.
- Backend creates or updates a contact in the email platform.
- Backend links `anonymous_id` to `contact_id`.
- Backend pushes relevant fields/tags to the email platform.

After signup:

- Continue tracking against `anonymous_id`.
- Link future events to the known contact when consent allows.
- Avoid sending raw browsing trails into email tools unless absolutely needed.

## Consent And Compliance Guardrails

EveryTip is UK-facing and should treat tracking carefully:

- Cookie/tracking consent must be clear before non-essential behavioural tracking.
- Email marketing consent must be explicit unless a valid soft opt-in path is deliberately documented.
- Store consent state with each signup.
- Store consent timestamp, consent text/version, signup URL, and source.
- Do not send raw email addresses to analytics tools.
- Do not fire ad/analytics pixels before consent if they are not strictly necessary.
- Update the privacy policy and cookie policy before launch.

Consent states:

| State | Meaning | Tracking Allowed |
| --- | --- | --- |
| `unknown` | No choice yet | Strictly necessary only |
| `analytics` | Analytics consent | Page/engagement analytics |
| `marketing` | Marketing consent | Behavioural attribution and email segmentation |
| `rejected` | User declined | Strictly necessary only |

## Event Taxonomy

Minimum event names:

| Event | Trigger |
| --- | --- |
| `page_view` | Page rendered/client loaded |
| `content_engaged` | Meaningful dwell time or reading depth |
| `scroll_depth` | 25/50/75/90 percent thresholds |
| `internal_link_clicked` | Internal contextual link click |
| `email_signup_viewed` | Signup form/module visible |
| `email_signup_started` | User focuses or types in signup form |
| `email_signup_submitted` | Signup accepted by backend |
| `bookmaker_cta_clicked` | Click on bookmaker or offer CTA |
| `offer_page_viewed` | Offer/bridge page view |
| `review_page_viewed` | Bookmaker review view |
| `category_hub_viewed` | SCN/category hub view |

Recommended event fields:

| Field | Purpose |
| --- | --- |
| `anonymous_id` | Anonymous visitor key |
| `session_id` | Session key |
| `contact_id` | Known contact key after signup |
| `timestamp` | Server-side received timestamp |
| `url` | Current URL |
| `path` | Current path |
| `referrer` | Referrer URL |
| `utm_source` | Campaign attribution |
| `utm_medium` | Campaign attribution |
| `utm_campaign` | Campaign attribution |
| `utm_content` | Campaign attribution |
| `utm_term` | Campaign attribution |
| `content_type` | post, page, category, review, offer, racecourse |
| `content_slug` | Current content slug |
| `pillar` | SCN pillar |
| `cluster` | SCN cluster |
| `author` | Author/columnist |
| `bookmaker` | Mentioned or clicked bookmaker |
| `offer_id` | Offer identifier |
| `cta_id` | CTA identifier |
| `consent_state` | Consent state at event time |

## Contact Fields And Tags

Push a distilled lead profile to the email platform.

Recommended contact fields:

| Field | Meaning |
| --- | --- |
| `first_touch_url` | First known page |
| `last_touch_url` | Last page before signup |
| `signup_url` | Page where signup happened |
| `signup_pillar` | Pillar of signup page |
| `primary_interest` | Highest-confidence interest |
| `secondary_interest` | Next strongest interest |
| `last_bookmaker_viewed` | Most recent bookmaker review/offer |
| `last_offer_clicked` | Most recent offer CTA |
| `consent_version` | Consent copy/policy version |
| `consent_timestamp` | Signup consent time |

Recommended tags:

- `interest:racing`
- `interest:football`
- `interest:bookmaker-reviews`
- `interest:free-bets`
- `interest:racecourses`
- `interest:betting-guides`
- `interest:betfair`
- `bookmaker:bet365`
- `bookmaker:betfred`
- `bookmaker:william-hill`
- `intent:review-reader`
- `intent:offer-clicker`
- `intent:daily-tips-reader`
- `signup:lead-magnet`
- `signup:newsletter`

## Lead Scoring

Start simple and make it auditable.

| Behaviour | Score |
| --- | ---: |
| Category hub view | 1 |
| Article/tip view | 1 |
| Review page view | 3 |
| Offer page view | 4 |
| Email signup form started | 5 |
| Bookmaker CTA clicked | 7 |
| Multiple sessions in 7 days | 5 |

Interest classification:

- Count events by pillar over the last 30 days.
- Give extra weight to the signup page pillar.
- Give extra weight to CTA clicks.
- If a bookmaker CTA is clicked, tag that bookmaker even if the visitor signs up later on a different page.

## Soap Opera Sequence Routing

Initial automation routes:

| Route | Trigger | Sequence Angle |
| --- | --- | --- |
| Racing tips lead | Signup on racing/tips/racecourse content | Daily racing insight, value discipline, then best racing offer |
| Football tips lead | Signup on football market pages | Match prediction habit, accas/BTTS/goals angle, then relevant free bet |
| Bookmaker review lead | Review page view plus signup | Trust, testing methodology, offer comparison, then bookmaker CTA |
| Free bets lead | Offer hub/bridge/signup | Opportunity, expiry, comparison, responsible gambling note, CTA |
| Betting guides lead | Guide/bet type content | Education, confidence building, recommended next action |

Each email platform journey should receive only the fields/tags it needs, not the full raw event history.

## Backend Endpoint Sketch

Recommended frontend endpoints:

| Endpoint | Method | Purpose |
| --- | --- | --- |
| `/api/events` | `POST` | Collect first-party behavioural events |
| `/api/signup` | `POST` | Accept signup, consent, attribution, and contact sync |
| `/api/cta-click` | `POST` | Record bookmaker/offer CTA clicks before redirect |

Recommended server-side behaviour:

- Validate payload shape.
- Enforce rate limits.
- Reject oversized event payloads.
- Store server timestamp.
- Normalize URL/path/pillar/cluster fields.
- Hash or tokenize anything sensitive where raw storage is not required.
- Do not trust client-provided contact IDs.

## Preview And Development Rules

Cloudflare previews and local development must not pollute production automations.

- Use preview/dev-only analytics IDs, or disable analytics entirely outside production.
- Use a preview/dev-only event store or environment flag.
- Use a preview/dev-only email list or sandbox mode.
- Mark every preview/dev signup with `environment:preview` or `environment:development`.
- Disable real bookmaker redirect monetization unless explicitly testing affiliate links.
- Do not trigger live soap opera sequences from Cloudflare preview deployments.

## Implementation Phases

### Phase 1 - Tracking Model

- Define event schema.
- Define consent model.
- Define content metadata fields exposed by Astro templates.
- Define contact fields and email platform tags.

### Phase 2 - First-Party Collection

- Add anonymous/session ID handling.
- Add consent-aware frontend event emitter.
- Add server endpoint for events.
- Add server endpoint for signup.
- Add CTA click tracking endpoint or client/server hybrid.

### Phase 3 - Email Platform Sync

- Pick email platform.
- Map fields/tags.
- Build signup sync.
- Build first journeys.
- Test preview/dev isolation.

### Phase 4 - QA And Reporting

- Test consent paths.
- Test signup attribution.
- Test CTA attribution.
- Test email routing.
- Verify no live automation fires from preview or local development.

## Blindspots To Watch

- Consent banner design can suppress data if it is unclear or annoying.
- Email platform limits may make behavioural tags expensive or awkward.
- Ad blockers may block client-side analytics, so signup and CTA events should also be server-side.
- Attribution can become noisy if content pillars are poorly mapped.
- Offer expiry dates must be kept current, or sequences can push stale offers.
- Cross-device identity is limited unless the user signs up on both devices.
- Too much segmentation can fragment lists before there is enough traffic to justify it.
