const romeDateFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit',
});

function epochDay(day) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error('Feed publication date must be YYYY-MM-DD');
  const [year, month, date] = day.split('-').map(Number);
  const milliseconds = Date.UTC(year, month - 1, date);
  if (new Date(milliseconds).toISOString().slice(0, 10) !== day) throw new Error('Invalid feed publication date');
  return milliseconds / 86400000;
}

/** Publication-age check uses Europe/Rome calendar days, not elapsed hours. */
export function assessFeedFreshness(latestDate, { now = new Date(), maxAgeDays } = {}) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime()) || !Number.isInteger(maxAgeDays) || maxAgeDays < 0) {
    throw new Error('Invalid feed freshness clock or threshold');
  }
  const parts = Object.fromEntries(romeDateFormatter.formatToParts(now).map(({ type, value }) => [type, value]));
  const asOfDate = `${parts.year}-${parts.month}-${parts.day}`;
  const ageDays = epochDay(asOfDate) - epochDay(latestDate);
  if (ageDays < 0) throw new Error('Feed publication date is in the future for Europe/Rome');
  return { latestDate, asOfDate, ageDays, maxAgeDays, stale: ageDays > maxAgeDays };
}
