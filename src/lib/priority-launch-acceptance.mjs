// Join independent read-only route/SEO audits. A pass here is only a bounded
// acceptance gate, never permission to deploy or remove noindex.
const expectedRoutes = 15;
const expectedPriorityIds = new Map([
  ['/', 16], ['/free-betting-tips', 76939], ['/bookie-free-bets-bonus-offers', 56315],
  ['/bet365-review', 87553], ['/best-paypal-betting-sites.html', 58743],
  ['/low-or-no-minimum-deposit-betting-sites.html', 33470],
  ['/value-bet-tips-dark-horses.html', 72421], ['/racecourses/kempton-racing-tips', 45270],
  ['/free-horse-racing-tips', 41881], ['/safer-gambling', 70281],
  ['/terms-conditions', 61], ['/privacy-policy', 6376],
  ['/saturday-horse-racing-tips', 23888],
  ['/english-premier-league-predictions-for-saturday', 24016],
  ['/professional-winning-tipsters-comparison-table', 12835],
]);
const knownPreviewSeoExceptions = new Set([
  '/bet365-review', '/free-horse-racing-tips',
  '/saturday-horse-racing-tips', '/english-premier-league-predictions-for-saturday',
]);
const validPath = (path) => typeof path === 'string' && path.startsWith('/') &&
  !path.startsWith('//') && !/[?#\\]/.test(path);
const normalizedRobots = (value) => typeof value === 'string'
  ? value.toLowerCase().split(',').map((part) => part.trim()).join(',') : '';

export function evaluatePriorityLaunchAcceptance({ seo, delta, risk, mode = 'preview' }) {
  if (!['preview', 'public'].includes(mode)) throw new Error('Mode must be preview or public');
  if (!Array.isArray(seo?.records) || seo.records.length !== expectedRoutes ||
      !Array.isArray(delta?.posts?.newSinceCopy) || !Array.isArray(delta?.pages?.newSinceCopy) ||
      !Array.isArray(risk?.records) || risk.records.length !== 31) {
    throw new Error('Incomplete priority SEO, live delta or 31-post risk audit');
  }
  const defects = [];
  const publicBlockers = [];
  const routePaths = new Set();
  for (const row of seo.records) {
    if (!validPath(row.path) || routePaths.has(row.path) || expectedPriorityIds.get(row.path) !== row.id) {
      defects.push(`Invalid or duplicate priority route ${row.path}`); continue;
    }
    routePaths.add(row.path);
    if (row.liveError) { defects.push(`${row.path}: live REST read failed (${row.liveError})`); continue; }
    if (!row.live || row.built?.missingAsset || !row.built ||
        row.built.stagingHostLeak || !row.liveLinkPathMatches) {
      defects.push(`${row.path}: live identity, exact asset or staging-host mismatch`); continue;
    }
    const seoDifference = !row.parity?.title || !row.parity?.description;
    if (mode === 'preview') {
      if (!row.built.previewMarker || normalizedRobots(row.built.robots) !== 'noindex,nofollow' || row.built.canonical) {
        defects.push(`${row.path}: preview marker/noindex/canonical mismatch`);
      }
      if (seoDifference && !knownPreviewSeoExceptions.has(row.path)) {
        defects.push(`${row.path}: unexpected preview title/description difference`);
      }
    } else if (row.built.previewMarker ||
        normalizedRobots(row.built.robots) !== normalizedRobots(row.live.robots) ||
        row.built.canonical !== row.live.canonical || seoDifference) {
      defects.push(`${row.path}: public SEO/robots/canonical parity mismatch`);
    }
    if (seoDifference) publicBlockers.push(`${row.path}: title/description needs release resolution`);
    if (row.built.previewMarker || normalizedRobots(row.built.robots) !== normalizedRobots(row.live.robots) ||
        row.built.canonical !== row.live.canonical) {
      publicBlockers.push(`${row.path}: preview/public robots or canonical mismatch`);
    }
  }
  const missing = [...delta.posts.newSinceCopy, ...delta.pages.newSinceCopy]
    .filter((row) => row.exactLocalAsset === false);
  for (const group of [delta.posts, delta.pages]) {
    if (group.absentFromStagingSnapshot !== group.newSinceCopy.length ||
        group.newWithoutExactLocalAsset !== group.newSinceCopy.filter((row) => row.exactLocalAsset === false).length ||
        group.newSinceCopy.some((row) => !Number.isInteger(row.id) || !validPath(row.path) ||
          typeof row.exactLocalAsset !== 'boolean')) {
      defects.push('Live/staging delta counts or exact paths are inconsistent');
    }
  }
  const riskIds = new Set(risk.records.map((row) => row.id));
  const riskPaths = new Set(risk.records.map((row) => row.path));
  const knownMissing = missing.filter((row) => riskIds.has(row.id));
  if (riskIds.size !== 31 || riskPaths.size !== 31 || risk.records.some((row) =>
    !Number.isInteger(row.id) || !validPath(row.path) ||
    !['ordinary-tip-hybrid', 'offer-news'].includes(row.family)) ||
    risk.ordinary?.count !== 13 || risk.offerNews?.count !== 18 ||
    risk.records.filter((row) => row.family === 'ordinary-tip-hybrid').length !== 13 ||
    risk.records.filter((row) => row.family === 'offer-news').length !== 18) {
    defects.push('31-post source-risk classification changed');
  }
  for (const row of knownMissing) {
    if (risk.records.find((riskRow) => riskRow.id === row.id)?.path !== row.path) {
      defects.push(`Live-only risk route identity mismatch: ${row.id}`);
    }
  }
  if (missing.length) publicBlockers.push(`${missing.length} live-only exact route assets missing`);
  const unclassifiedMissing = missing.filter((row) => !riskIds.has(row.id));
  if (unclassifiedMissing.length) {
    defects.push(`${unclassifiedMissing.length} missing routes not in the 31-post risk inventory`);
    publicBlockers.push(`${unclassifiedMissing.length} missing routes not in the 31-post risk inventory`);
  }
  const previewGatePass = mode === 'preview' && defects.length === 0;
  const priorityPublicGatePass = mode === 'public' && defects.length === 0 && publicBlockers.length === 0;
  return { mode, previewGatePass, priorityPublicGatePass, launchReady: false,
    launchDecision: 'hold — this bounded gate is not a complete launch sign-off',
    priorityRoutes: seo.records.length, liveOnlyMissingAssets: missing.length,
    knownRiskClassifiedMissing: knownMissing.length,
    defects: [...new Set(defects)], publicBlockers: [...new Set(publicBlockers)] };
}
