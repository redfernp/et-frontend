import { readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { londonDate } from './daily-tip-import.mjs';
import { validateValueTipFeed } from './value-tip-feed.mjs';

const rowFields = ['course', 'courseId', 'forecast', 'horse', 'jockey', 'published', 'time', 'tissue', 'trainer'];
const csvHeader = 'Time,Course,Horse Name,Forecast SP,Jockey,Trainer,Tissue Value Price';
const csvCell = (value) => `"${String(value).replaceAll('"', '""')}"`;

export function validateImportedTipSnapshot(snapshot, { uploadId, now = new Date() } = {}) {
  if (!snapshot || snapshot.version !== 1 || snapshot.producer !== 'everytip-daily-tool' ||
      snapshot.uploadId !== uploadId || !/^[a-f0-9]{64}$/.test(snapshot.sourceSha256 ?? '') ||
      !Array.isArray(snapshot.rows) || snapshot.rows.length !== snapshot.rowCount ||
      typeof snapshot.generatedAt !== 'string') return null;
  const generatedAt = new Date(snapshot.generatedAt);
  if (Number.isNaN(generatedAt.getTime()) || generatedAt.getTime() > now.getTime() + 5 * 60_000 ||
      now.getTime() - generatedAt.getTime() > 48 * 60 * 60_000) return null;
  const today = londonDate(now);
  if (snapshot.feedDate !== today) return null;
  try {
    const body = snapshot.rows.map((row) => {
      if (!row || Object.keys(row).sort().join('|') !== rowFields.join('|') || row.published !== today) {
        throw new Error('Invalid imported row identity');
      }
      return [row.time, row.course, row.horse, row.forecast, row.jockey, row.trainer, row.tissue].map(csvCell).join(',');
    });
    const validated = validateValueTipFeed(`${csvHeader}\n${body.join('\n')}\n`, { feedDate: today, targetDate: today });
    if (JSON.stringify(validated) !== JSON.stringify(snapshot.rows)) return null;
    return snapshot;
  } catch {
    return null;
  }
}

/** Local build opt-in only. Missing/stale/invalid artifacts never yield rows. */
export async function loadOptedInDailyTipSnapshot({
  uploadId = process.env.EVERYTIP_DAILY_TIP_UPLOAD_ID,
  artifactRoot = resolve('artifacts/daily-tip-imports'),
  now = new Date(),
} = {}) {
  if (!uploadId || !/^[A-Za-z0-9][A-Za-z0-9._-]{7,63}$/.test(uploadId)) return null;
  try {
    const file = join(artifactRoot, 'uploads', uploadId, 'snapshot.json');
    const snapshot = JSON.parse(await readFile(file, 'utf8'));
    return validateImportedTipSnapshot(snapshot, { uploadId, now });
  } catch {
    return null;
  }
}
