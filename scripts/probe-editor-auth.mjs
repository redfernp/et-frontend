// Read-only staging check. Invoke with: node --env-file=.env.local scripts/probe-editor-auth.mjs
// Never print the credential, response bodies, offer content or affiliate URLs.
const base = process.env.EVERYTIP_WP_BASE_URL;
const username = process.env.EVERYTIP_WP_USERNAME;
const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
const offerId = process.env.EVERYTIP_TEST_OFFER_ID;

if (!base || !username || !password) {
  throw new Error('Set EVERYTIP_WP_BASE_URL, EVERYTIP_WP_USERNAME and EVERYTIP_WP_APPLICATION_PASSWORD in your ignored .env.local');
}

const url = new URL(base);
if (url.protocol !== 'https:' || url.hostname !== 'wordpress-159231-2098144.cloudwaysapps.com') {
  throw new Error('This pilot probe is restricted to the EveryTip staging hostname over HTTPS');
}

const authorization = `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
const request = async (path, authenticated) => {
  const response = await fetch(new URL(path, url), {
    headers: authenticated ? { Authorization: authorization } : {},
    signal: AbortSignal.timeout(15000),
  });
  return response.status;
};

const accountStatus = await request('/wp-json/wp/v2/users/me?context=edit', true);
const report = { environment: 'staging', accountAuthenticated: accountStatus === 200, accountStatus };

if (offerId) {
  if (!/^\d+$/.test(offerId)) throw new Error('EVERYTIP_TEST_OFFER_ID must be a numeric WordPress post ID');
  const path = `/wp-json/everytip/v1/offer/${offerId}`;
  report.offerAuthenticatedStatus = await request(path, true);
  report.offerAnonymousStatus = await request(path, false);
  report.offerPermissionPassed = report.offerAuthenticatedStatus === 200 && report.offerAnonymousStatus === 403;
}

console.log(JSON.stringify(report, null, 2));
if (!report.accountAuthenticated || (offerId && !report.offerPermissionPassed)) process.exitCode = 1;
