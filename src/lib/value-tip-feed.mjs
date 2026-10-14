const headers = ['Time', 'Course', 'Horse Name', 'Forecast SP', 'Jockey', 'Trainer', 'Tissue Value Price'];

export function parseValueTipCsv(source) {
  if (typeof source !== 'string' || source.length > 2_000_000) throw new Error('Invalid value-tips CSV size');
  const rows = [];
  let row = [];
  let cell = '';
  let quoted = false;
  const input = source.replace(/^\uFEFF/, '');
  for (let i = 0; i < input.length; i++) {
    const char = input[i];
    if (quoted) {
      if (char === '"' && input[i + 1] === '"') { cell += '"'; i++; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(cell); cell = ''; }
    else if (char === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (char !== '\r') cell += char;
  }
  if (quoted) throw new Error('Unclosed value-tips CSV quote');
  if (cell || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return false;
  const date = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function courseId(course) {
  return course.toLowerCase().replace(/\s*\(aw\)$/i, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Source rows have no date. A separate trusted daily import manifest MUST
 * supply feedDate; a local fetch timestamp is not proof of publication date.
 * Both dates are explicit inputs to avoid silently showing yesterday's tips.
 */
export function validateValueTipFeed(csv, { feedDate, targetDate, courseFilter = null } = {}) {
  if (!validDate(feedDate) || !validDate(targetDate) || feedDate !== targetDate) {
    throw new Error('Value-tips feed date missing, invalid or stale');
  }
  if (courseFilter !== null && courseFilter !== 'KEMPTON') throw new Error('Unverified value-tips course filter');
  const [header, ...data] = parseValueTipCsv(csv);
  if (!header || header.length !== headers.length || header.some((name, i) => name.trim() !== headers[i])) {
    throw new Error('Value-tips CSV column contract changed');
  }
  if (data.length > 500) throw new Error('Value-tips CSV exceeds row limit');
  const rows = data.map((row, index) => {
    if (row.length !== headers.length || row.some((value) => !value.trim() || value.length > 160 || /[<>\x00-\x1f\x7f]/.test(value))) {
      throw new Error(`Invalid value-tips row ${index + 1}`);
    }
    const [time, course, horse, forecast, jockey, trainer, tissue] = row.map((value) => value.trim());
    const match = time.match(/^(\d{1,2}):(\d{2})$/);
    if (!match || Number(match[1]) > 23 || Number(match[2]) > 59 || !courseId(course)) {
      throw new Error(`Invalid value-tips time or course in row ${index + 1}`);
    }
    return { published: feedDate, time, course, courseId: courseId(course), horse, forecast, jockey, trainer, tissue };
  });
  return courseFilter === 'KEMPTON' ? rows.filter((row) => row.courseId === 'kempton') : rows;
}
