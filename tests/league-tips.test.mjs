import test from 'node:test';
import assert from 'node:assert/strict';
import { competitionFor, filterCompetitionTables } from '../src/lib/league-tips.mjs';

const row = (country, league, home) => `<tr><td>Nov 4 2026</td><td>8:00 PM</td><td>${country}</td><td>${league}</td><td>${home}</td><td>Away</td><td>OVER</td><td>1.5</td></tr>`;
const table = (rows) => `<h3>Tips</h3><div class="footable_parent ninja_table_wrapper"><table data-ninja_table_instance="ninja_table_instance_1"><thead><tr><th>Date</th><th>Time</th><th>Country</th><th>League</th><th>Home Team</th><th>Away Team</th><th>Tip</th><th>Odds</th></tr></thead><tbody>${rows.join('')}</tbody></table></div>`;

test('Champions League page keeps only UEFA Champions League rows', () => {
  const competition = competitionFor({ uri: '/uefa-champions-league-betting-tips-predictions.html' });
  const html = filterCompetitionTables(table([
    row('Europe', 'UEFA Champions League', 'Villarreal'),
    row('Asia', 'AFC Champions League', 'Esteghlal'),
    row('Europe', 'UEFA Europa League', 'Rennes'),
    row('England', 'Championship', 'Watford'),
  ]), competition);
  assert.match(html, /Villarreal/);
  assert.doesNotMatch(html, /Esteghlal|Rennes|Watford/);
});

test('Premier League page needs England as the country', () => {
  const competition = competitionFor({ uri: '/english-premier-league-betting-tips.html' });
  const html = filterCompetitionTables(table([row('England', 'Premier League', 'Arsenal'), row('Russia', 'Russian Premier League', 'Zenit')]), competition);
  assert.match(html, /Arsenal/);
  assert.doesNotMatch(html, /Zenit/);
});

test('a table with no matches becomes a note', () => {
  const competition = competitionFor({ uri: '/uefa-champions-league-betting-tips-predictions.html' });
  const html = filterCompetitionTables(table([row('England', 'Championship', 'Watford')]), competition);
  assert.doesNotMatch(html, /<table/);
  assert.match(html, /class="league-no-matches"/);
});

test('other pages are left alone', () => {
  assert.equal(competitionFor({ uri: '/1x2-betting-tips.html' }), null);
});
