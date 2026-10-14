import test from 'node:test';
import assert from 'node:assert/strict';
import { classicHtmlToBlocks, columnistConversionOptions } from '../src/lib/classic-to-gutenberg.mjs';

test('converts editable paragraphs, a quote and a link list', () => {
  const html = '<p>A <strong>bold</strong> <a href="/guide">link</a>.</p>\n' +
    '<blockquote><p><em>Tip</em><br>Second line</p></blockquote>\n' +
    '<ul><li>One</li><li><a href="/two">Two</a></li></ul>';
  const blocks = classicHtmlToBlocks(html);
  assert.match(blocks, /<!-- wp:paragraph -->/);
  assert.match(blocks, /<!-- wp:quote -->/);
  assert.match(blocks, /<!-- wp:list-item -->/);
  assert.match(blocks, /href="\/guide"/);
  assert.match(blocks, /<strong>bold<\/strong>/);
});

test('keeps plain top-level classic-editor prose in its original order', () => {
  const blocks = classicHtmlToBlocks('Opening &amp; context<p>Next paragraph.</p>Closing note');
  assert.equal((blocks.match(/<!-- wp:paragraph -->/g) ?? []).length, 3);
  assert.match(blocks, /<p>Opening &amp; context<\/p>[\s\S]*<p>Next paragraph\.<\/p>[\s\S]*<p>Closing note<\/p>/);
});

test('groups adjacent top-level text and inline markup into one paragraph', () => {
  const blocks = classicHtmlToBlocks('Opening <strong>bold</strong> and <a href="/tips">linked</a> copy.<h2>Next section</h2>');
  assert.equal((blocks.match(/<!-- wp:paragraph -->/g) ?? []).length, 1);
  assert.match(blocks, /<p>Opening <strong>bold<\/strong> and <a href="\/tips">linked<\/a> copy\.<\/p>/);
  assert.match(blocks, /<!-- wp:heading/);
});

test('keeps a legacy in-body H1 as an editable heading without losing its text', () => {
  const blocks = classicHtmlToBlocks('<h1>Weekly predictions</h1><p>Archive introduction.</p>');
  assert.match(blocks, /<!-- wp:heading \{"level":1\} -->\n<h1 class="wp-block-heading">Weekly predictions<\/h1>/);
  assert.match(blocks, /<p>Archive introduction\.<\/p>/);
});

test('keeps inline-only classic blockquotes editable without changing their text', () => {
  const blocks = classicHtmlToBlocks('<blockquote><em>Old prices</em> were <strong>historical</strong>.</blockquote>');
  assert.match(blocks, /<blockquote class="wp-block-quote"><p><em>Old prices<\/em> were <strong>historical<\/strong>\.<\/p><\/blockquote>/);
  assert.throws(() => classicHtmlToBlocks('<blockquote><div>Nested layout</div></blockquote>'), /Unsupported quote structure/);
});

test('preserves whitespace between inline lines in a classic blockquote', () => {
  const blocks = classicHtmlToBlocks('<blockquote><strong>Selection one</strong>\r\n<strong>Selection two</strong></blockquote>');
  assert.match(blocks, /Selection one<\/strong>\r\n<strong>Selection two/);
});

test('removes the retired Seymour portrait without deleting its paragraph text', () => {
  const html = '<p><img src="https://www.everytip.co.uk/wp-content/uploads/2019/03/saturday-horse-racing-tips-and-previews-from-expert-tipster-seymour-biz-on-everytip.png" alt="Old portrait">Read the column.</p>';
  const blocks = classicHtmlToBlocks(html, { removeLegacyPortrait: true });
  assert.doesNotMatch(blocks, /<img/);
  assert.match(blocks, /Read the column/);
});

test('removes the retired John portrait nested in a link', () => {
  const html = '<p><a href="/john"><img src="https://www.everytip.co.uk/wp-content/uploads/John-Newsome-Football-Betting-Tips-everytip.png"></a>Match preview.</p>';
  const blocks = classicHtmlToBlocks(html, { removeLegacyPortrait: true });
  assert.doesNotMatch(blocks, /<img|href="\/john"/);
  assert.match(blocks, /Match preview/);
});

test('columnist option removes only the known retired portrait for their article family', () => {
  assert.equal(columnistConversionOptions('/epl-game-week-4-john-newsome.html').removeLegacyPortrait, true);
  assert.equal(columnistConversionOptions('/saturday-preview-seymour-biz.html').removeLegacyPortrait, true);
  assert.equal(columnistConversionOptions('/ordinary-betting-guide.html').removeLegacyPortrait, false);
  const html = '<p><img src="https://www.everytip.co.uk/wp-content/uploads/John-Newsome-Football-Betting-Tips-everytip.png">Match preview.</p>';
  assert.match(classicHtmlToBlocks(html, columnistConversionOptions('/week-john-newsome.html')), /Match preview/);
});

test('rejects active markup and unreviewed images', () => {
  assert.throws(() => classicHtmlToBlocks('<script>alert(1)</script>'), /Builder or active markup/);
  assert.throws(() => classicHtmlToBlocks('<p>[ninja_tables id="7"]</p>'), /Shortcode requires/);
  assert.throws(() => classicHtmlToBlocks('<p><img src="other.jpg">Text</p>'), /Image requires/);
});

test('defers linked images and turns an unlinked upload into a core image', () => {
  const linked = '<p><a href="https://affiliate.example/click"><img src="https://www.everytip.co.uk/wp-content/uploads/2026/09/photo.jpg" alt="Race &amp; course"></a></p>';
  assert.throws(() => classicHtmlToBlocks(linked, { imageMode: 'wordpress-upload', rejectLinkedImages: true }), /Linked image requires/);
  const retiredPortrait = '<p><a href="/john"><img src="/wp-content/uploads/John-Newsome-Football-Betting-Tips-everytip.png"></a>Match preview.</p>';
  assert.match(classicHtmlToBlocks(retiredPortrait, columnistConversionOptions('/week-john-newsome.html')), /Match preview/);
  const html = '<p><img src="https://www.everytip.co.uk/wp-content/uploads/2026/09/photo.jpg" alt="Race &amp; course" style="width:200px"></p>';
  const blocks = classicHtmlToBlocks(html, { imageMode: 'wordpress-upload' });
  assert.match(blocks, /<!-- wp:image/);
  assert.match(blocks, /src="https:\/\/www\.everytip\.co\.uk\/wp-content\/uploads\/2026\/09\/photo\.jpg"/);
  assert.doesNotMatch(blocks, /style=/);
  assert.throws(() => classicHtmlToBlocks('<p><img src="https://other.example/image.jpg"></p>', { imageMode: 'wordpress-upload' }), /editorial review/);
  assert.throws(() => classicHtmlToBlocks('<p>Caption <img src="/wp-content/uploads/image.jpg"></p>', { imageMode: 'wordpress-upload' }), /Image requires/);
});

test('splits a leading upload and following text into separate editable blocks', () => {
  const html = '<p><img src="/wp-content/uploads/2026/09/tip.jpg" alt="Race"><br>Our <strong>analysis</strong>.</p>';
  const blocks = classicHtmlToBlocks(html, { imageMode: 'wordpress-upload' });
  assert.equal((blocks.match(/<!-- wp:/g) ?? []).length, 2);
  assert.match(blocks, /<img src="https:\/\/www\.everytip\.co\.uk\/wp-content\/uploads\/2026\/09\/tip\.jpg"/);
  assert.match(blocks, /<p>Our <strong>analysis<\/strong>\.<\/p>/);
});

test('unwraps a sole presentational span image but preserves editable underlined links', () => {
  const html = '<p><span style="width:100%"><img src="https://www.everytip.co.uk/wp-content/uploads/2019/05/guide.jpg" alt="Guide"></span></p><p><a href="/betfred-review"><u><strong>Betfred Review</strong></u></a></p>';
  const blocks = classicHtmlToBlocks(html, { imageMode: 'wordpress-upload' });
  assert.match(blocks, /<!-- wp:image/);
  assert.match(blocks, /<u><strong>Betfred Review<\/strong><\/u>/);
  assert.doesNotMatch(blocks, /style=/);
  assert.throws(() => classicHtmlToBlocks('<p><span><img src="https://other.example/guide.jpg"></span></p>', { imageMode: 'wordpress-upload' }), /editorial review/);
  assert.throws(() => classicHtmlToBlocks('<p><span>Caption <img src="\/wp-content\/uploads\/guide.jpg"></span></p>', { imageMode: 'wordpress-upload' }), /Image requires/);
});
