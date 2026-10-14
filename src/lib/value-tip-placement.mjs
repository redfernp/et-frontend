import { validateImportedTipSnapshot } from './opted-in-daily-tip-snapshot.mjs';

/** @type {Readonly<Record<string, Readonly<{ tableId: number, filter: string | null }>>>} */
export const valueTipPlacements = Object.freeze({
  '/value-bet-tips-dark-horses.html': Object.freeze({ tableId: 72501, filter: null }),
  '/racecourses/kempton-racing-tips': Object.freeze({ tableId: 72501, filter: 'KEMPTON' }),
});

/**
 * Resolve an ACF tip-table marker against one already imported daily upload.
 * The marker is a placement reference, never a source for old Ninja rows.
 * Table 86633 is a separate fixture schema and cannot be resolved here.
 * @param {{ path?: string, reference?: { type?: string, tableId?: number, filter?: string | null }, snapshot?: any, now?: Date }} input
 */
export function resolveValueTipPlacement({ path, reference, snapshot, now = new Date() } = {}) {
  const expected = valueTipPlacements[path];
  if (!expected || reference?.type !== 'tip-table-reference' ||
      reference.tableId !== expected.tableId || reference.filter !== expected.filter) {
    throw new Error('Value-tip table reference does not match the exact page placement');
  }
  if (!snapshot) return null;
  const valid = validateImportedTipSnapshot(snapshot, { uploadId: snapshot.uploadId, now });
  if (!valid) return null;
  const rows = expected.filter === 'KEMPTON'
    ? valid.rows.filter((row) => row.courseId === 'kempton')
    : valid.rows;
  return { tableId: expected.tableId, filter: expected.filter, feedDate: valid.feedDate,
    uploadId: valid.uploadId, rows, emptyCourse: expected.filter === 'KEMPTON' && rows.length === 0 };
}
