// Paul-approved final destinations, 15 October 2026. The staging server rule stays unchanged.
export const archiveRedirectOverrides = Object.fromEntries([2, 3, 4, 5].map(page => [
  `/john-newsome/page/${page}`,
  { status: 301, location: `/english-premier-league-predictions-for-saturday/page/${page}` },
]));

export const workerArchiveRedirects = observed => ({ ...observed, ...archiveRedirectOverrides });
