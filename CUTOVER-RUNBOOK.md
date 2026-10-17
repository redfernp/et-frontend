# EveryTip cutover and rollback

Prepared 17 October 2026. Paul owns DNS, Cloudways changes, production credentials and production route activation. Codex has only prepared code and deployed an isolated staging-origin test. Nothing here is evidence that production has been activated.

## Prepared configuration

| Purpose | Config | Worker | Assets | Origin |
|---|---|---|---|---|
| Production, inactive | wrangler.production.jsonc | et-frontend | dist | origin.everytip.co.uk, preserving www.everytip.co.uk Host |
| Isolated noindex test | wrangler.origin-test.jsonc | et-frontend-origin-test | preview-dist | wordpress-159231-2098144.cloudwaysapps.com |
| Existing content preview | wrangler.preview.jsonc | everytip-astro-preview | preview-dist | no origin passthrough |

Both new configs have `routes: []`. Production has `workers_dev: false` and `preview_urls: false`; only the isolated test enables workers.dev/preview URLs. The isolated origin-test Worker is an unlisted workers.dev URL with X-Robots-Tag: noindex, nofollow on every response, including redirects and origin responses. Noindex is not access control: anyone with the URL can reach it. It points only to staging. Production must use dist, never preview-dist, to avoid the preview-wide noindex header.

All requests run through the production Worker before assets. WordPress owns /wp-admin* (including admin-ajax.php and admin-post.php), /wp-login.php, /wp-json*, /graphql*, /wp-content/*, /wp-includes/*, /wp-cron.php, /xmlrpc.php, /wp-comments-post.php, /wp-signup.php, /wp-activate.php, /wp-trackback.php, /wp-mail.php and /wp-links-opml.php. Root/index.php ?rest_route= requests and WordPress/builder preview queries also pass through. Astro serves public content, sitemap and build assets; existing affiliate and archive redirects remain in the Worker. Unknown PHP files are not a blanket fallback to WordPress.

Proxy requests preserve methods, body streams, query strings, Authorization, cookies and range/conditional headers. Redirects are not followed with credentials. WordPress retains authentication and permission enforcement. Origin responses are deliberately private/no-store for launch, including media; media caching is a later optimization. Static content is still served by the asset binding. Origin failure returns 502, never an Astro page pretending to be WordPress.

## Before cutover: Paul moves nameservers FIRST

1. **Paul:** export/retain the GoDaddy DNS zone, current nameservers (reported ns27/ns28.domaincontrol.com), Cloudways production IP/app details, existing routing settings, WordPress database/uploads backup and last good Worker version/artifacts. Record these values in the operational ticket, not in git. Preserve MX, SPF, DKIM, DMARC, verification, mail/autodiscover, CAA and any other service records. Check DNSSEC/DS status and follow Cloudflare's migration procedure; a stale DS can break resolution.
2. **Paul:** add everytip.co.uk to the intended Cloudflare account and reconcile its imported DNS records against the export. Keep website A/CNAME records pointing at the existing production Cloudways origin. Do not point them at workers.dev. Do not attach any Worker route yet.
3. **Paul:** change the domain's authoritative nameservers at GoDaddy to the two assigned by Cloudflare. Wait for the zone to become Active and verify authoritative resolution, existing WordPress pages, HTTPS and email. This nameserver migration happens before the application cutover. Switching nameservers alone must leave WordPress serving the existing site.
4. **Paul:** create a dedicated DNS-only `origin.everytip.co.uk` A record to the production Cloudways server IP, or CNAME to its dedicated production Cloudways application hostname. Never CNAME it to www, the apex, staging or a Worker. No Worker routes/custom domains may cover the origin hostname. Add the alias to the production app in Cloudways Domain Management; retain www.everytip.co.uk as the canonical site/domain. Ensure Cloudways serves the intended production app for Host www.everytip.co.uk and has a valid TLS certificate for www (and origin for direct operator diagnostics). Keep WordPress home/siteurl on https://www.everytip.co.uk; do not change them to origin.
5. **Paul:** use Cloudflare Full (strict) TLS once certificates are verified. Confirm any Cloudways firewall/WAF permits the planned origin requests. Exclude WordPress authenticated/admin/API traffic from cache-everything rules. Do not introduce a zone-wide blanket Worker route that intercepts origin.
6. **Paul:** verify DNS origin resolves to the Cloudways server, and verify direct production-origin HTTPS with the public Host (for example `curl --resolve www.everytip.co.uk:443:ORIGIN_IP https://www.everytip.co.uk/wp-json/`). Use the actual production IP. Check login, GraphQL and an upload the same way. This is an operator check; Codex has not accessed production credentials or changed these settings.

Production uses Cloudflare `cf.resolveOverride: origin.everytip.co.uk` while fetching the public www URL. DNS resolution selects Cloudways while Host/TLS stay www, preserving canonical admin URLs and cookie scope. Both hostnames must belong to the now-active everytip.co.uk Cloudflare zone. Use a Worker **route** in front of the Cloudways DNS record, not a Worker Custom Domain replacing the origin. The cross-domain staging test exercises direct upstream mode; it cannot validate same-zone DNS/TLS/resolveOverride before Paul provisions the zone. That remains a required production smoke check.

References: [Cloudflare resolveOverride and redirect behavior](https://developers.cloudflare.com/workers/runtime-apis/request/), [Worker-first asset routing](https://developers.cloudflare.com/workers/static-assets/routing/worker-script/), [Worker routes](https://developers.cloudflare.com/workers/configuration/routing/routes/).

## Content and media readiness

- **Paul:** resolve the existing Paddy Power public WordPress Thrive override and activate/test the save-dispatch hook and scheduled fallback described in PROGRESS.md. All eight owner rewrites, manifest SEO fields, fourteen draft statuses and approved offers are already saved in staging. Do not overwrite them with an older copy. Keep columnist hubs unchanged; their redesign is post-launch.
- **Paul:** confirm the actual daily-tips writer's endpoint. Repo tooling uses WordPress REST/custom editorial routes and Ninja Tables admin AJAX; scripts/import-daily-tips.mjs is local-only CSV validation, not a remote writer. These known HTTP paths are covered. External tooling or cron calling a custom root PHP file must be inventoried explicitly before cutover; add a narrow passthrough and test if needed. Cloudways server-side cron continues on the server. Do not invoke wp-cron/xmlrpc mutations merely as a smoke test.
- Historical media audit: 8,778 references in the old 1,264-page snapshot bundle, not unique files. The current 1,220-page staging build has 3,137 external media attributes: 3,016 staging-host, 14 www.everytip.co.uk, 95 YouTube, 8 Thrive, 3 bet365 affiliate image host and 1 AWeber. All WordPress upload paths are covered by /wp-content/*, including thumbnails/srcset sizes, plugin assets and nested directories. Ten sampled image files are checked through the test Worker against staging bytes; this is not a claim that every historical image exists.
- **Paul, during staging-to-live push:** copy uploads and use Cloudways' supported URL replacement so staging-host content/media URLs become the intended live URLs. Keep www /wp-content reachable via the new Worker. Do not blindly replace serialized database strings by hand. After the live-source rebuild, run `node scripts/audit-preview-local-media.mjs dist`; do not launch while staging media dependencies remain. Its current staging-host failures are expected for the staging build, not a passing production media gate. Third-party media remains external.

## Single build content setting and rebuild cadence

`WPGRAPHQL_ENDPOINT` is the only launch content-source selector. .github/workflows/staging-preview.yml reads GitHub repository variable WPGRAPHQL_ENDPOINT (defaulting to staging); src/lib/launch-content.mjs passes it through all record/archive requests. Cache keys include the endpoint, preventing reuse across staging/live. WPGRAPHQL_FRESH controls cache freshness, not the source. EVERYTIP_WP_BASE_URL is a staging-write safeguard, not a second build selector; do not change it to live.

**Paul:** at cutover, set the repository variable once:
```
gh variable set WPGRAPHQL_ENDPOINT --body https://www.everytip.co.uk/graphql
```
No source-code edit is needed. For local operator builds, read that same variable into the process environment; shell environment takes precedence over the local .env file. Example PowerShell:
```
$env:WPGRAPHQL_ENDPOINT = gh variable get WPGRAPHQL_ENDPOINT
$env:WPGRAPHQL_FRESH = '1'
npm ci
npm run build
node scripts/check-launch-parity.mjs --fresh
node scripts/audit-preview-local-media.mjs dist
```
Stop on any failed command. Remove the temporary shell variables afterwards. Never restore cached staging assets as a live-source build.

Scheduled preview builds now run hourly at minute 17 UTC (`17 * * * *`), with small sequential pages, backoff and a fresh fetch. This is not incremental sync: stale cached pages would miss deletions, drafts and changes in old records. Scheduling is approximate in GitHub Actions. Existing concurrency serializes runs. Manual/save-dispatch triggers remain enabled by configuration; the existing missing token/enablement/plugin prerequisites still need activation. The workflow remains preview-only even after the content variable changes; production deployment automation is not silently enabled by this task. Paul must wire the verified save hook/fallback to an explicitly approved production deployment job before launch, using the production config and the same source variable.

## Cutover morning (before daily tips)

1. **Paul:** confirm the nameserver/zone/origin steps above are complete, take the final database/uploads backup and pause editorial writes briefly. Record the restore point and previous deployment. Validate rebuild automation and remaining PROGRESS.md blockers before proceeding.
2. **Paul:** push staging to the production Cloudways application, including plugins, approved content/status/SEO and uploads. Verify production WordPress directly while it still serves the public site. Check staging-to-live URL replacement and canonical host settings.
3. **Paul:** change the GitHub WPGRAPHQL_ENDPOINT variable to https://www.everytip.co.uk/graphql. **Operator/Codex when authorized:** perform the fully fresh build and gates above. Do not change the content selector to origin unless separately planned; www /graphql will pass through after route activation.
4. **Operator/Codex when authorized:** prepare a noindex preview from those exact assets and verify homepage, hubs, every review/offer, five posts, archives, all /go targets, sitemap/SEO, media and tracking. Retain the immutable passing preview and build artifact. Keep production dist free of preview-wide noindex headers.
5. **Paul/authorized release operator:** validate config with `npx wrangler deploy --config wrangler.production.jsonc --dry-run`. Then upload production Worker et-frontend using that config while routes remain empty. This production upload has NOT been performed by Codex in this task. Check the pinned account matches the everytip.co.uk zone. The inactive Worker has no public workers.dev endpoint.
6. **Paul:** activate ONLY the www route after approval. Add the route to wrangler.production.jsonc at this point (not beforehand), for example `"routes": [{ "pattern": "www.everytip.co.uk/*", "zone_name": "everytip.co.uk" }]`, and deploy it. Keep that committed route state aligned with the actual route so future deployments do not remove it. Enable proxying on the existing www Cloudways DNS record as required for Worker routes. The apex should retain/receive Paul's deliberate redirect to https://www.everytip.co.uk, preserving path and query; do not unintentionally leave a second WordPress frontend indexable. No origin-host wildcard route.
7. **Paul + release operator:** immediately verify real www pages, exact .html paths, four John Newsome redirects, /go redirects without following partner pages, /wp-admin login and an authenticated editor session, REST application-password read, GraphQL POST, upload thumbnails/srcset images, CSS/JS, XML sitemap and analytics. Check auth cookies/nonces, admin AJAX and an authorized test save/rebuild. Confirm robots.txt permits intended indexing and no global X-Robots-Tag noindex leaks from preview assets. Check production fetches reach Cloudways and do not loop or return static 404s. Same-zone origin routing is unverified until this step succeeds.
8. **Paul/editor:** add the morning's daily tips as normal; confirm the save-triggered build completes and the actual new table rows appear publicly. Confirm the hourly fallback also completes. Resume normal editing and monitor 5xx, origin timeouts, login issues and missing media.

Do not call the site launch-ready solely because the staging test passed. Production DNS/TLS, the actual authenticated editor workflow, live media replacement and production rebuild automation are distinct cutover gates.

## Rollback

1. **Paul:** on origin loops, widespread 5xx, broken login/media or failed content freshness, disable production deploy triggers to prevent automatic redeploy. Record the failure and current version. Stop further editorial writes only if a database restore is under consideration.
2. **Paul:** remove/disable the www Worker route (and update the config back to `routes: []`). The www DNS record still points to Cloudways, so WordPress resumes serving the same URLs without a nameserver move. Keep Cloudflare nameservers in place. If needed, return www proxy status to its pre-cutover state after checking TLS; do not repoint to workers.dev.
3. **Paul:** verify WordPress homepage, login, REST, GraphQL, uploads and daily tips. Remove any newly added apex redirect only if it causes the incident. The staging push already changed the production database; removing the Worker does not undo it.
4. **Paul:** if the defect is only a Worker release and origin/data are healthy, select the recorded prior known-good Worker deployment (once one exists). For the first cutover, falling back to Cloudways WordPress is the rollback. If content/database restoration is necessary, reconcile edits made since the backup before restoring; do not erase new daily tips silently.
5. **Release operator:** keep WPGRAPHQL_ENDPOINT on live when previewing a repair against the production content. Change it back to the staging URL only when intentionally returning the build to staging, then fresh-build. Re-test all gates and obtain Paul's release authorization before reattaching the route.

## Verification evidence

Fill the final deployment/check results in PROGRESS.md. Local routing tests: `node --test tests/wordpress-origin.test.mjs tests/legacy-routing.test.mjs`. Isolated online origin test: `node scripts/check-wordpress-origin.mjs https://et-frontend-origin-test.jpredfern1979.workers.dev`. The latter performs reads only (including a GraphQL query POST), never CMS mutations, cron calls or partner visits. No DNS, production routes or live WordPress writes are performed by these checks.

Verified on 17 October: origin-test version 4bb800ce-c3b9-4895-ab2c-5d2ec4da2c7d; 21 page/API/media checks and 79 affiliate redirects passed. Ten image files matched staging bytes. Two referenced JPGs returned matching source/Worker 404s: /wp-content/uploads/2014/04/Grand-National-Winner-2014.jpg and /wp-content/uploads/2014/04/SE_Grand-National_Infographic.jpg. Paul should restore or correct these source media references before the final live media check. Evidence: outputs/wordpress-origin-check.json. The test did not log into an editor session or perform a CMS write; those authorized production checks remain in the runbook.

The full remote Astro gate also passed on that test deployment: 1,218 HTML responses, two matching source redirects, 104 redirect checks, 76 offer placements and 97 tables/3,105 rows, zero failures. Production configuration passed a local Wrangler dry-run after final changes; production deployment and same-zone routing were not performed.
