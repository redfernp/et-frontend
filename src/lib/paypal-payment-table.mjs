import { parseDocument, DomUtils } from 'htmlparser2';

const tablePattern = /<figure\b[^>]*class="[^"]*\bwp-block-table\b[^"]*"[^>]*>[\s\S]*?<\/figure>/i;

export function splitPayPalPaymentTable(html) {
  const match = tablePattern.exec(html);
  if (!match) return [{ type: 'html', html }];
  const document = parseDocument(match[0]);
  const tableRows = DomUtils.getElementsByTagName('tr', document.children);
  const cells = (row, cellTag) => DomUtils.getElementsByTagName(cellTag, row.children)
    .map((cell) => DomUtils.textContent(cell).replace(/\s+/g, ' ').trim());
  const headers = cells(tableRows[0], 'th');
  const rows = tableRows.slice(1).map((row) => cells(row, 'td'));
  if (headers.length !== 9 || rows.length < 1 || rows.some((row) => row.length !== 9)) {
    throw new Error('Unexpected PayPal payment table shape');
  }
  return [
    { type: 'html', html: html.slice(0, match.index) },
    { type: 'payment-table', headers, rows },
    { type: 'html', html: html.slice(match.index + match[0].length) },
  ];
}
