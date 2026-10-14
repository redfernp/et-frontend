// The first three bookmaker sections in the converted Gutenberg draft are
// still plain paragraphs. Lift their presentation into the roundup card shell
// without turning unverified legacy payment/offer copy into approved data.
const headingPattern = /<h3\b[^>]*>(Bet365|Betfred|10Bet) PayPal deposit(?:s)? and withdrawals<\/h3>/gi;
const endPattern = /<h2\b[^>]*>Rest of UK and Irish PayPal Betting Sites[\s\S]*?<\/h2>/i;
const paragraphPattern = /<p\b[^>]*>([\s\S]*?)<\/p>/gi;
const brandColors = { Bet365: '#087b46', Betfred: '#0f488f', '10Bet': '#0b447f' };
const expectedLabels = [/^Deposit Limit$/i, /^Process Time$/i, /^Min\.? Deposit$/i, /^Fee$/i];

export function extractFeaturedPayPalCards(content) {
  const end = endPattern.exec(content);
  if (!end) throw new Error('PayPal featured section boundary missing');
  const starts = [...content.slice(0, end.index).matchAll(headingPattern)];
  if (starts.length !== 3 || starts.map((match) => match[1]).join(',') !== 'Bet365,Betfred,10Bet') {
    throw new Error('Unexpected PayPal featured bookmaker order');
  }
  const cards = starts.map((match, index) => {
    const sectionEnd = starts[index + 1]?.index ?? end.index;
    const section = content.slice(match.index, sectionEnd);
    const logo = section.match(/<figure\b[^>]*>[\s\S]*?<img\b[^>]*>[\s\S]*?<\/figure>/i)?.[0];
    const paragraphs = [...section.matchAll(paragraphPattern)].map((item) => item[1]);
    if (!logo || paragraphs.length < 9) throw new Error(`Incomplete PayPal card: ${match[1]}`);
    const facts = expectedLabels.map((label, factIndex) => {
      const name = paragraphs[factIndex * 2].replace(/<[^>]*>/g, '').trim();
      if (!label.test(name)) throw new Error(`Unexpected PayPal fact in ${match[1]}: ${name}`);
      return { label: name, value: paragraphs[factIndex * 2 + 1] };
    });
    // The source's final joined-up CTA and promotional terms are not reusable.
    // Editorial paragraphs remain visible but are explicitly marked unverified.
    const editorial = paragraphs.slice(8, -1).filter((html) =>
      !/(?:#Ad|new customers|welcome offer|welcome bonus|bonus code|free bets|T&amp;Cs|terms apply)/i.test(html));
    return { type: 'featured-card', name: match[1], heading: match[0], logo, facts, editorial, brandColor: brandColors[match[1]] };
  });
  return [
    { type: 'html', html: content.slice(0, starts[0].index) },
    ...cards,
    { type: 'html', html: content.slice(end.index) },
  ];
}
