import { parseDocument, DomUtils } from 'htmlparser2';
import { render } from 'dom-serializer';
import history from '../data/racecourse-history.json' with { type: 'json' };

// Racecourse tips pages: /racecourses/kempton-racing-tips, plus a few at the top level
// (/ascot-racing-tips). The slug names the course; a few differ from the tracker's course ID.
const courseIds = { 'chelmsford-city': 'chelmsford', 'hamilton-park': 'hamilton', 'epsom-downs': 'epsom' };
const squash = (value) => value.toLowerCase().replace(/\(aw\)/g, '').replace(/[^a-z]/g, '');
const text = (node) => DomUtils.textContent(node).replace(/\s+/g, ' ').trim();
const escape = (value) => String(value).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

export function racecourseFor(record) {
  const match = record.kind === 'pages' && record.uri.match(/^\/(?:racecourses\/)?([a-z-]+)-racing-tips$/);
  if (!match) return null;
  const slug = match[1];
  return { slug, id: courseIds[slug] ?? slug, name: slug.replace(/(^|-)([a-z])/g, (_, dash, letter) => `${dash ? ' ' : ''}${letter.toUpperCase()}`) };
}

// The daily tips table lists every course; keep this course's rows. On a day with no racing
// here the table is replaced by a short note.
export function filterCourseTable(html, course) {
  if (!/data-ninja_table_instance/.test(html)) return html;
  const doc = parseDocument(html, { decodeEntities: true });
  const table = DomUtils.findOne((node) => node.name === 'table' && 'data-ninja_table_instance' in (node.attribs ?? {}), doc.children, true);
  if (!table) return html;
  const headers = DomUtils.findAll((node) => node.name === 'th', [table]).map(text);
  const courseColumn = headers.findIndex((label) => /^course$/i.test(label));
  if (courseColumn < 0) return html;
  const wanted = squash(course.id);
  let kept = 0;
  for (const row of DomUtils.findAll((node) => node.name === 'tr' && node.parent?.name === 'tbody', [table])) {
    const cells = row.children.filter((child) => child.type === 'tag' && child.name === 'td');
    if (cells[courseColumn] && squash(text(cells[courseColumn])).startsWith(wanted)) kept++;
    else DomUtils.removeElement(row);
  }
  if (!kept) {
    const wrapper = table.parent?.attribs?.class?.includes('footable_parent') ? table.parent : table;
    const note = parseDocument(`<p class="racecourse-no-racing">No racing at ${escape(course.name)} today. Our tips for each race appear here on race days, and you can see our previous tips below.</p>`).children[0];
    DomUtils.replaceElement(wrapper, note);
  }
  return render(doc);
}

const longDate = (date) => new Date(`${date}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const ordinal = (n) => { const s = ['th', 'st', 'nd', 'rd']; const v = n % 100; return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`; };

// Previous meetings at this course, newest first, each one a closed accordion.
export function racecourseHistoryHtml(course, today, limit = 12) {
  const meetings = (history.courses[course.id] ?? []).filter((meeting) => meeting.date < today).slice(0, limit);
  if (!meetings.length) return '';
  const items = meetings.map(({ date, races }) => {
    const settled = races.filter((race) => race.finish);
    const winners = races.filter((race) => race.won).length;
    const summary = settled.length ? `${races.length} tips · ${winners} ${winners === 1 ? 'winner' : 'winners'}` : `${races.length} tips`;
    const rows = races.map((race) => `<tr${race.won ? ' class="is-winner"' : ''}><td data-label="Time">${escape(race.time)}</td><td data-label="Horse"><strong>${escape(race.horse)}</strong><span>${escape(race.race)}</span></td><td data-label="Jockey / trainer">${escape(race.jockey)}<span>${escape(race.trainer)}</span></td><td data-label="Result">${race.finish ? (race.won ? 'Won' : /^\d+$/.test(race.finish) ? ordinal(Number(race.finish)) : escape(race.finish)) : 'Not settled'}</td><td data-label="BSP">${race.bsp ? escape(race.bsp) : "n/a"}</td></tr>`).join('');
    return `<details class="racecourse-meeting"><summary><span>${longDate(date)}</span><span class="racecourse-meeting-count">${summary}</span></summary><div class="racecourse-meeting-body"><table><thead><tr><th>Time</th><th>Horse</th><th>Jockey / trainer</th><th>Result</th><th>BSP</th></tr></thead><tbody>${rows}</tbody></table></div></details>`;
  }).join('');
  return `<section class="racecourse-history" aria-labelledby="racecourse-history-title"><h2 id="racecourse-history-title">Our previous ${escape(course.name)} tips and results</h2><p>Our selection for every race at recent ${escape(course.name)} meetings. Open a meeting to see each tip and how it finished. BSP is the Betfair starting price.</p>${items}</section>`;
}
