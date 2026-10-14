import test from 'node:test';
import assert from 'node:assert/strict';
import { assessContent, previewHtml, previewTitle } from '../src/lib/migration-preview.mjs';

const record = (content) => ({ uri: '/example.html', content });

test('a WordPress admin title does not override the exact public review slug', () => {
  assert.equal(previewTitle({ uri: '/bet365-review', title: 'bet365 review PPC' }), 'Bet365 Review 2026');
  assert.equal(previewTitle({ uri: '/other-review', title: 'Other Review' }), 'Other Review');
});

test('the preview strips links and event handlers while preserving editorial text', () => {
  const html = previewHtml(record('<p><a href="https://affiliate.example/join" onclick="alert(1)">Read the terms</a></p>'));
  assert.match(html, /Read the terms/);
  assert.doesNotMatch(html, /href|onclick|affiliate\.example/);
});

test('an explicitly allowlisted editorial link survives while affiliate links remain inert', () => {
  const content = '<p><a href="/bet365-review" onclick="alert(1)">Read review</a> <a href="/go/bet365">Join</a></p>';
  const html = previewHtml(record(content), { allowedEditorialHrefs: ['/bet365-review'] });
  assert.match(html, /href="\/bet365-review"/);
  assert.match(html, /Join/);
  assert.doesNotMatch(html, /href="\/go\/bet365"|onclick/);
});

test('double-encoded legacy typography renders normally without decoding markup delimiters', () => {
  const html = previewHtml(record('<h2>PayPal Withdrawal &amp;amp; Deposit Times &amp;#8211; All UK Bookies</h2><p>&amp;lt;script&amp;gt;safe text</p>'));
  assert.match(html, /PayPal Withdrawal &amp; Deposit Times – All UK Bookies/);
  assert.doesNotMatch(html, /&amp;amp;|&amp;#8211;/);
  assert.match(html, /&amp;lt;script&amp;gt;safe text/);
});

test('the preview rewrites only WordPress upload images from the known staging host', () => {
  const html = previewHtml(record('<img src="https://wordpress-159231-2098144.cloudwaysapps.com/wp-content/uploads/2024/guide.jpg" alt="Guide"><img src="https://other.example/track.jpg" alt="Other">'));
  assert.match(html, /https:\/\/www\.everytip\.co\.uk\/wp-content\/uploads\/2024\/guide\.jpg/);
  assert.doesNotMatch(html, /other\.example/);
});

test('Cloudways-cloned domain in editorial body text is restored to the public host', () => {
  const html = previewHtml(record('<p>See wordpress-159231-2098144.cloudwaysapps.com for the column.</p>'));
  assert.match(html, /www\.everytip\.co\.uk/);
  assert.doesNotMatch(html, /wordpress-159231-2098144\.cloudwaysapps\.com/);
});

test('the legacy monochrome portrait can be omitted without removing other article images', () => {
  const html = previewHtml(record('<p><img src="https://wordpress-159231-2098144.cloudwaysapps.com/wp-content/uploads/2019/old.png"><img src="https://wordpress-159231-2098144.cloudwaysapps.com/wp-content/uploads/2025/new.png"></p>'), { excludedImagePaths: ['/wp-content/uploads/2019/old.png'] });
  assert.doesNotMatch(html, /old\.png/);
  assert.match(html, /new\.png/);
});

test('builder and active embedded content require a separate conversion', () => {
  assert.deepEqual(assessContent(record('<div class="fl-builder">Page</div>')), ['builder-markup']);
  assert.deepEqual(assessContent(record('<iframe src="https://example.com"></iframe>')), ['active-embed']);
  assert.deepEqual(assessContent(record('<style>.offer{display:block}</style>')), ['inline-style']);
  assert.throws(() => previewHtml(record('<script>alert(1)</script>')), /active-embed/);
});

test('only the two known hidden WordPress self-embeds may be removed from historical John columns', () => {
  const uri = '/epl-game-week-11-2022-23-season-premier-league-tips-john-newsome.html';
  const frame = '<iframe class="wp-embedded-content" sandbox="allow-scripts" style="visibility: hidden;" src="https://wordpress-159231-2098144.cloudwaysapps.com/english-premier-league-2019-2020-best-young-players.html/embed#secret"></iframe>';
  const safe = { uri, content: `<h2>Brentford v Brighton</h2><p>Historical prediction.</p>${frame}` };
  assert.deepEqual(assessContent(safe), []);
  assert.match(previewHtml(safe), /Historical prediction/);
  assert.doesNotMatch(previewHtml(safe), /iframe|wp-embedded-content/);
  assert.throws(() => assessContent({ uri, content: safe.content.replace('wordpress-159231-2098144.cloudwaysapps.com', 'evil.example') }), /Unapproved WordPress self-embed/);
  assert.deepEqual(assessContent({ uri: '/another.html', content: safe.content }), ['active-embed']);
});
