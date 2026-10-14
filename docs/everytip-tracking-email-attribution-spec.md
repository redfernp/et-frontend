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

## Current Operating Baseline

- Approximately 300 new email signups per month.
- Active list intentionally maintained between 3,000 and 5,000 contacts.
- Minimum acceptable open rate: 25%.
- Current reported open rate: approximately 35%.

The initial system should be designed for list quality and useful intent signals rather than maximum contact accumulation. Infrastructure should remain simple at this volume, while preserving a clean upgrade path if traffic, event volume, or subscriber counts increase materially.

List-hygiene decisions should use clicks, confirmed site visits, recency, and sequence engagement alongside reported opens. Open tracking alone is not reliable enough to decide whether an individual subscriber should be retained or removed.

## High-Level Architecture

| Layer | Recommended Tooling | Responsibility |
| --- | --- | --- |
| Frontend | Astro on Cloudflare Pages | Render pages, emit consent-aware events |
| Email capture | ConvertBox | Continue presenting and optimizing signup forms on EveryTip and Oddstips |
| Event collector | Cloudflare Worker or Pages Functions | Accept first-party tracking and form events |
| Event buffer | Cloudflare Queues | Move event processing and SendFox API calls out of the visitor request path, with retries |
| Event store | Cloudflare D1 | Store consent-aware page, engagement, signup, identity-link, scoring, and CTA events |
| Contact sync | Cloudflare Worker queue consumer | Push distilled fields, tags, and list membership to SendFox |
| Email platform | SendFox | Send newsletters, soap opera sequences, and offer follow-up |
| Reporting | GA4, Search Console, event dashboard | Aggregate performance and content insights |

Pabbly Connect is optional rather than part of the core website-to-email path. Use it only for integrations with other services where maintaining a custom API connection is not worthwhile. EveryTip frontend events, identity resolution, lead scoring, and SendFox synchronization should remain first-party through Cloudflare.

## ConvertBox Signup Flow

Keep ConvertBox as the visible email-capture and conversion layer. Do not replace its forms during the Astro migration.

Use its integrations in parallel:

1. ConvertBox's direct SendFox integration adds the subscriber to the approved main signup list, preserving reliable capture even if the attribution service is temporarily unavailable.
2. A ConvertBox JSON webhook sends the email, referrer, campaign name, ConvertBox name/ID, and approved custom fields to a protected Cloudflare endpoint.
3. A first-party post-submit browser signal supplies the current anonymous visitor/session ID so Cloudflare can link the signup to the consented pre-signup event trail.
4. Cloudflare deduplicates the signup, stores the consent and attribution record, enriches the SendFox contact, and applies the appropriate interest tags or sequence-entry list once.

Do not let both the direct ConvertBox integration and the Cloudflare sync independently start the same automation. ConvertBox owns the base capture/welcome-list action; Cloudflare owns enrichment and behavioural sequence routing.

Treat the ConvertBox webhook as untrusted public input unless ConvertBox provides a verifiable signature. Use an unguessable rotating endpoint secret, rate limits, strict schema validation, timestamp/idempotency checks, and server-side SendFox contact lookup. A webhook failure must not prevent the ConvertBox thank-you action or the subscriber's base SendFox capture.

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
- Keep the email address and SendFox contact mapping server-side. The browser should use an opaque visitor ID rather than an email address or SendFox contact ID.
- For cross-device recognition, use an opaque, revocable link token in email links or an authenticated account. A hash of an email address must not be treated as anonymous data.

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

## SendFox Routing Model

SendFox automations are primarily triggered when a contact joins a list. Use dedicated automation-entry lists for sequence routing, for example:

- `sequence:racing-soap-opera`
- `sequence:football-soap-opera`
- `sequence:free-bets-soap-opera`
- `sequence:bookmaker-review-soap-opera`
- `sequence:betting-guides-soap-opera`

Use tags and custom contact fields for durable profile information, not as the only automation trigger. The Cloudflare sync worker should:

1. Create or update the SendFox contact after a valid signup.
2. Write the distilled attribution and interest fields.
3. Apply relevant tags.
4. Add the contact to one approved automation-entry list.
5. Record the SendFox contact ID and sync result in D1.

The sync must be idempotent so retries cannot start duplicate journeys. SendFox automations should own email timing and email-interaction branches. Cloudflare should own website behaviour, identity matching, scoring, and routing decisions. Confirm that the selected SendFox plan includes API access before implementation.

### Link-Specific Offer Triggers

Selected links in selected SendFox emails must be able to start a new offer-specific automation. Do not rely on a generic "email clicked" rule when the sequence depends on which offer link was chosen.

Use an EveryTip first-party redirect URL for each triggerable link, for example:

`https://www.everytip.co.uk/email-click/{link_id}?t={opaque_contact_token}`

The Cloudflare Worker should:

1. Validate the link ID and opaque, revocable contact token.
2. Resolve the email/campaign, placement, bookmaker, offer, and destination from server-side configuration.
3. Record the click in D1 with the contact, link, offer, campaign, and timestamp.
4. Enqueue an idempotent SendFox update that applies the relevant fields/tags and adds the contact to the offer-specific automation-entry list.
5. Redirect immediately to the intended EveryTip article, bridge page, or approved affiliate destination.

The browser-facing URL must not contain an email address, SendFox contact ID, or reusable authentication credential. Repeat clicks must not restart or duplicate the same sequence unless that behaviour is explicitly approved for the campaign.

Example routing:

| Selected email link | Recorded intent | SendFox entry list |
| --- | --- | --- |
| Bet365 Cheltenham offer | Racing plus Bet365 campaign interest | `sequence:bet365-cheltenham-offer` |
| Champions League acca offer | Football acca interest | `sequence:champions-league-acca-offer` |
| Existing-customer racing boost | Existing-customer racing offer interest | `sequence:racing-existing-customer-offer` |

This first-party redirect pattern is the preferred implementation. Pabbly can perform a similar webhook-to-SendFox list action, but it should remain an optional fallback rather than the source of truth for link identity and behavioural history.

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
| `/email-click/{link_id}` | `GET` | Record a selected email-link click, enqueue its SendFox sequence trigger, and redirect |

Recommended server-side behaviour:

- Validate payload shape.
- Enforce rate limits.
- Reject oversized event payloads.
- Store server timestamp.
- Normalize URL/path/pillar/cluster fields.
- Hash or tokenize anything sensitive where raw storage is not required.
- Do not trust client-provided contact IDs.
- Process event aggregation and SendFox synchronization asynchronously through Cloudflare Queues.
- Store an outbox/idempotency key for every SendFox mutation so retries cannot duplicate list-entry actions.

## Cost And Abuse Guardrails

Tracking is non-critical. If a quota, circuit breaker, database, queue, or downstream API fails, the public EveryTip page and affiliate destination must continue to work. Drop tracking work before degrading content delivery or redirects.

Apply layered controls:

- Cloudflare WAF rate limits on tracking and signup paths before requests reach the Worker where possible.
- Worker rate limits by endpoint, IP, anonymous visitor ID, and signed email token as appropriate.
- Turnstile and server-side validation on signup and other write-heavy public forms.
- Strict method, origin, content-type, payload-size, and schema validation.
- Signed, expiring, revocable email-link tokens; never accept a client-supplied SendFox contact ID.
- Idempotency keys for signup, click, and SendFox mutations.
- Bounded Queue retries plus a dead-letter queue. Never create an unbounded retry or self-enqueue loop.
- Indexed D1 queries and bounded retention for raw events.
- A global daily circuit breaker that stops low-value behavioural ingestion when configured request, event, D1-write, Queue-operation, or SendFox-action thresholds are reached.
- Preserve signup, unsubscribe, consent, and approved email-link redirects while disabling page-view and scroll tracking first.
- Budget alerts and usage dashboards as secondary warnings, not as the primary protection.

Initial endpoint limits should be conservative and adjusted after observing legitimate traffic. A suitable starting policy is:

| Endpoint | Initial application limit | Additional control |
| --- | --- | --- |
| `/api/events` | 30 requests per IP per minute, with a small bounded event batch | Drop duplicate/noisy events first |
| `/api/signup` | 5 attempts per IP per hour | Turnstile, email validation, and idempotency |
| `/api/cta-click` | 30 requests per IP per minute | Allowlisted destination IDs only |
| `/email-click/{link_id}` | One sequence trigger per contact/link combination | Valid signed token, expiry, and redirect even if tracking is unavailable |

Throttle SendFox synchronization below the documented API limit and apply exponential backoff. The queue consumer must not retry permanent `4xx` validation or authentication errors.

Email-security scanners can prefetch or click links. Treat the first email-link request as a pending signal where necessary and confirm it with a subsequent browser/page signal before starting a high-value offer sequence. At minimum, exclude known automated traffic and make every trigger reversible and auditable.

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

- Configure SendFox API access, custom fields, tags, and automation-entry lists.
- Map D1 profile fields to SendFox fields/tags.
- Build the queued, idempotent signup and profile sync.
- Build the first SendFox journeys.
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
