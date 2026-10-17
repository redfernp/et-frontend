import { parseDocument } from 'htmlparser2';
import render from 'dom-serializer';

// Pulls the structured parts of a review section out of its WordPress HTML: the score
// ("4.5", "5 / 5"), the question line ("How easy was it to claim the bonus?") and the first
// bullet list (the key points). What is left is the section's prose.

const text = (node) => node.type === 'text' ? node.data : (node.children ?? []).map(text).join('');
const clean = (value) => value.replace(/\s+/g, ' ').trim();
const scorePattern = /^(\d(?:\.\d)?)\s*(?:\/\s*5)?\s*(?:★+☆*)?$/;

export function sectionDetails(html) {
  const doc = parseDocument(html ?? '', { decodeEntities: true });
  const nodes = doc.children.filter((node) => node.type === 'tag' || (node.type === 'text' && clean(node.data)));
  let score = null;
  let question = null;
  let points = null;
  const rest = [];
  for (const node of nodes) {
    const value = clean(text(node));
    if (score === null && node.type === 'tag' && ['p', 'div', 'span', 'strong'].includes(node.name) && scorePattern.test(value)) {
      score = Number(value.match(scorePattern)[1]);
      continue;
    }
    if (question === null && node.type === 'tag' && /^h[3-6]$/.test(node.name) && /\?$/.test(value) && rest.length < 3) { question = value; continue; }
    if (points === null && node.type === 'tag' && node.name === 'ul' && rest.filter((item) => clean(text(item)).length > 120).length === 0) {
      points = node.children.filter((child) => child.type === 'tag' && child.name === 'li').map((li) => clean(text(li))).filter(Boolean);
      continue;
    }
    rest.push(node);
  }
  return { score, question, points, html: rest.map((node) => render(node)).join('') };
}

// Overall rating from the intro ("awarded a score of 4.5 points out of 5", "4.5/5 Highly Recommended").
export function overallRating(html) {
  const value = clean(text(parseDocument(html ?? '', { decodeEntities: true })));
  const match = value.match(/(\d(?:\.\d)?)\s*(?:\/\s*5|points? out of 5|out of 5)/i);
  return match ? Number(match[1]) : null;
}

export const stars = (score) => {
  const full = Math.floor(score);
  return '★'.repeat(full) + (score - full >= 0.5 ? '½' : '') ;
};
