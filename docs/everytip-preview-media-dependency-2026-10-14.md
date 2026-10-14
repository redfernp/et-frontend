# EveryTip preview media dependency — 14 October 2026

Local-only release check of the existing 1,264-page `dist/` bundle. No WordPress, Cloudflare or DNS change was made.

`node scripts/audit-preview-local-media.mjs dist` inspected image, source, video, audio and track `src`/`srcset`/`poster` attributes. It found **8,778 external media references, all hosted on `www.everytip.co.uk`**, zero local media references and zero missing-local or staging-host failures. These are references, not unique files or proof that each remote image responds successfully.

This is a launch dependency: the Astro preview currently hotlinks its media to the existing WordPress domain. A future cutover must keep that media origin reachable (or migrate/proxy and verify the assets) before decommissioning WordPress hosting. The standalone audit now fails if a built page references a nonexistent local media path or a `cloudwaysapps.com` staging media URL; four fixture tests cover the gate. It does **not** verify HTTP responses for remote images, image copyright, media parity, or production readiness.
