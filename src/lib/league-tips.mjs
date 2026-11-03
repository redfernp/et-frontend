import { parseDocument, DomUtils } from 'htmlparser2';
import { render } from 'dom-serializer';

// Competition tips pages reuse the daily football tables (1X2, goals, BTTS), which list every
// league. On WordPress, Ninja Tables filtered them in the browser; here each table keeps only
// the page's competition, matched exactly so AFC Champions League or Russian Premier League
// don't slip in.
const competitions = {
  '/uefa-champions-league-betting-tips-predictions.html': { name: 'Champions League', league: /^UEFA Champions League$/i },
  '/english-premier-league-betting-tips.html': { name: 'Premier League', country: /^England$/i, league: /^Premier League$/i },
  '/world-cup-2026-betting-tips.html': { name: 'World Cup', league: /^(?:FIFA )?World Cup$/i },
};
const text = (node) => DomUtils.textContent(node).replace(/\s+/g, ' ').trim();

export function competitionFor(record) {
  return competitions[record.uri] ?? null;
}

// Every tip table on the page keeps the competition's rows; a table left empty is hidden.
export function filterCompetitionTables(html, competition) {
  if (!/data-ninja_table_instance/.test(html)) return html;
  const doc = parseDocument(html, { decodeEntities: true });
  const tables = DomUtils.findAll((node) => node.name === 'table' && 'data-ninja_table_instance' in (node.attribs ?? {}), doc.children);
  for (const table of tables) {
    const headers = DomUtils.findAll((node) => node.name === 'th', [table]).map(text);
    const leagueColumn = headers.findIndex((label) => /^league$/i.test(label));
    const countryColumn = headers.findIndex((label) => /^country$/i.test(label));
    if (leagueColumn < 0) continue;
    let kept = 0;
    for (const row of DomUtils.findAll((node) => node.name === 'tr' && node.parent?.name === 'tbody', [table])) {
      const cells = row.children.filter((child) => child.type === 'tag' && child.name === 'td');
      const league = cells[leagueColumn] ? text(cells[leagueColumn]) : '';
      const country = cells[countryColumn] ? text(cells[countryColumn]) : '';
      if (competition.league.test(league) && (!competition.country || competition.country.test(country))) kept++;
      else DomUtils.removeElement(row);
    }
    if (!kept) {
      // Hide a market with no matches, along with its heading.
      const wrapper = table.parent?.attribs?.class?.includes('footable_parent') ? table.parent : table;
      // Some posts head the table with a bold paragraph, and the table's own <p> leaves an empty one between.
      const blank = (node) => (node.type === 'text' || (node.type === 'tag' && node.name === 'p')) && !text(node);
      let heading = wrapper.prev;
      while (heading && blank(heading)) { const prev = heading.prev; if (heading.type === 'tag') DomUtils.removeElement(heading); heading = prev; }
      const boldLine = heading?.name === 'p' && heading.children.filter((child) => child.type === 'tag').length === 1 && heading.children.find((child) => child.type === 'tag')?.name === 'strong' && text(heading) === text(heading.children.find((child) => child.type === 'tag'));
      if (heading?.type === 'tag' && (/^h[2-6]$/.test(heading.name) || boldLine)) DomUtils.removeElement(heading);
      DomUtils.removeElement(wrapper);
    }
  }
  return render(doc);
}
