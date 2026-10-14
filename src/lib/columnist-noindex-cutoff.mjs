// WordPress publication dates are stored in the site's local civil time.
// The editorial rule is older than 12 calendar months in Europe/Rome.
export function columnistNoindexCutoff(now = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Rome', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now).filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  const year = Number(parts.year) - 1;
  const month = parts.month;
  const day = parts.month === '02' && parts.day === '29' ? '28' : parts.day;
  return `${year}-${month}-${day}`;
}

// The boundary day itself is still within the most recent 12 calendar months.
// WordPress stores publication dates in site-local time, so compare the date
// portion rather than interpreting its offset as a UTC instant.
export function columnistPostOlderThanTwelveMonths(publishedLocal, now = new Date()) {
  const date = String(publishedLocal ?? '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return true;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return true;
  return date < columnistNoindexCutoff(now);
}
