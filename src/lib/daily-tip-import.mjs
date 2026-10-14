import { createHash } from 'node:crypto';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { validateValueTipFeed } from './value-tip-feed.mjs';

const manifestKeys = ['feed_date', 'generated_at', 'producer', 'source_sha256', 'upload_id', 'version'];
const producer = 'everytip-daily-tool';

export function londonDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(now);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return `${get('year')}-${get('month')}-${get('day')}`;
}

/**
 * A local, operator-supplied manifest is the trust boundary. The hash proves
 * that CSV bytes match that manifest; it does not authenticate its author.
 * Nothing in this function publishes rows to WordPress or Cloudflare.
 */
export function validateDailyTipImport(manifest, csvBytes, { expectedDate = londonDate(), now = new Date() } = {}) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest) ||
      Object.keys(manifest).sort().join('|') !== manifestKeys.join('|')) {
    throw new Error('Daily-tip manifest fields do not match version 1 contract');
  }
  if (manifest.version !== 1 || manifest.producer !== producer ||
      !/^[A-Za-z0-9][A-Za-z0-9._-]{7,63}$/.test(manifest.upload_id) ||
      !/^[a-f0-9]{64}$/.test(manifest.source_sha256)) {
    throw new Error('Daily-tip manifest identity or hash is invalid');
  }
  if (typeof manifest.generated_at !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/.test(manifest.generated_at)) {
    throw new Error('Daily-tip generated_at must be a UTC timestamp');
  }
  const generatedAt = new Date(manifest.generated_at);
  if (Number.isNaN(generatedAt.getTime()) || generatedAt.toISOString().slice(0, 19) !== manifest.generated_at.slice(0, 19) ||
      generatedAt.getTime() > now.getTime() + 5 * 60_000 ||
      now.getTime() - generatedAt.getTime() > 48 * 60 * 60_000) {
    throw new Error('Daily-tip generated_at is invalid, stale or in the future');
  }
  if (!Buffer.isBuffer(csvBytes) || csvBytes.length > 2_000_000 || csvBytes.length === 0) {
    throw new Error('Daily-tip CSV bytes are missing or too large');
  }
  const sourceSha256 = createHash('sha256').update(csvBytes).digest('hex');
  if (sourceSha256 !== manifest.source_sha256) throw new Error('Daily-tip CSV hash does not match manifest');
  const csv = new TextDecoder('utf-8', { fatal: true }).decode(csvBytes);
  const rows = validateValueTipFeed(csv, { feedDate: manifest.feed_date, targetDate: expectedDate });
  return { version: 1, producer, uploadId: manifest.upload_id, feedDate: manifest.feed_date,
    generatedAt: manifest.generated_at, sourceSha256, validatedAt: now.toISOString(), rowCount: rows.length, rows };
}

/** Reserve a unique upload directory; then atomically publish its one JSON. */
export async function writeDailyTipImport(snapshot, artifactRoot) {
  if (!snapshot || !/^[A-Za-z0-9][A-Za-z0-9._-]{7,63}$/.test(snapshot.uploadId)) {
    throw new Error('Invalid daily-tip snapshot upload ID');
  }
  const uploads = join(artifactRoot, 'uploads');
  await mkdir(uploads, { recursive: true });
  const uploadDir = join(uploads, snapshot.uploadId);
  try { await mkdir(uploadDir); }
  catch (error) {
    if (error.code === 'EEXIST') throw new Error(`Duplicate daily-tip upload ID: ${snapshot.uploadId}`);
    throw error;
  }
  const temporary = join(uploadDir, 'snapshot.json.tmp');
  const destination = join(uploadDir, 'snapshot.json');
  await writeFile(temporary, `${JSON.stringify(snapshot, null, 2)}\n`, { flag: 'wx' });
  await rename(temporary, destination);
  return destination;
}
