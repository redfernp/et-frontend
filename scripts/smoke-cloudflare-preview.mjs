// Read-only HTTP checks for the separate, public noindex Cloudflare preview.
const base = process.argv[2];
if (!base || !/^https:\/\/[a-z0-9-]+\.jpredfern1979\.workers\.dev\/?$/i.test(base)) {
  throw new Error('Pass the exact EveryTip workers.dev preview origin');
}
const cases = [
  ['/', 200, true],
  ['/best-paypal-betting-sites.html', 200, true],
  ['/best-paypal-betting-sites', 404, false],
  ['/free-betting-tips', 200, true],
  ['/free-betting-tips/', 404, false],
  ['/free-betting-tips/index.html', 404, false],
  ['/racecourses/kempton-racing-tips', 200, true],
  ['/racecourses/kempton-racing-tips/index.html', 404, false],
  ['/about-us', 200, true],
  ['/terms-conditions', 200, true],
  ['/privacy-policy', 200, true],
  ['/safer-gambling', 200, true],
  ['/pilot/home/', 404, false],
  ['/migration-preview/bet365-review/', 404, false],
  ['/this-exact-path-does-not-exist', 404, false],
];
let failed = false;
for (const [path, expected, htmlExpected] of cases) {
  const response = await fetch(new URL(path, base), { redirect: 'manual' });
  const body = await response.text();
  const noindex = /\bnoindex\b/i.test(response.headers.get('x-robots-tag') ?? '');
  const pilotLink = /href=['"]\/pilot\//i.test(body);
  const pass = response.status === expected && !response.headers.has('location') && (!htmlExpected || (noindex && !pilotLink));
  console.log(JSON.stringify({ path, status: response.status, expected, noindex, pilotLink, redirect: response.headers.get('location'), pass }));
  if (!pass) failed = true;
}
if (failed) process.exitCode = 1;
