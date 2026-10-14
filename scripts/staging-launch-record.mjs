// Section 0: one staging record per invocation; one independent readback.
// Usage: node --env-file=.env.local scripts/staging-launch-record.mjs pages 16 [patch.json --apply]
import { readFile } from 'node:fs/promises';
import { stagingRequest, saveWriteEvidence, invalidateCachedRecords } from '../src/lib/staging-rest.mjs';
import { builderTier } from '../src/lib/builder-tiers.mjs';
const [type, rawId, file, action] = process.argv.slice(2);
const id = Number(rawId);
const offerIds = [90846,90848,90849,90850,90851,90852,90889];
if (!['pages','posts','et_offer'].includes(type) || !Number.isSafeInteger(id) || id < 1) throw new Error('Expected record type and ID');
const path = `/wp-json/wp/v2/${type}/${id}`;
const before = await stagingRequest(`${path}?context=edit`);
if (before.id !== id) throw new Error('Unexpected staging identity');
if (!file) {
  await saveWriteEvidence(id, 'read', before);
  console.log(JSON.stringify({ id, status: before.status, path: new URL(before.link).pathname, acfKeys: Object.keys(before.acf || {}), metaKeys: Object.keys(before.meta || {}), saved: true }));
} else {
  if (action !== '--apply') throw new Error('Explicit --apply required for a supplied patch');
  const patch = JSON.parse(await readFile(file, 'utf8'));
  const uri = new URL(before.link).pathname;
  if (type === 'et_offer' ? !offerIds.includes(id) : builderTier({ uri, content: before.content?.rendered || '' }) !== 'A') throw new Error('Not an authorised Tier A/offer record');
  const allowed = type === 'et_offer' ? ['acf','status','meta'] : ['content','meta'];
  if (!Object.keys(patch).length || Object.keys(patch).some(key => !allowed.includes(key))) throw new Error('Patch contains out-of-scope fields');
  await saveWriteEvidence(id, 'before', before);
  let writeError;
  try { await stagingRequest(path, { method: 'POST', body: patch }); } catch (error) { writeError = error; }
  const after = await stagingRequest(`${path}?context=edit`);
  await saveWriteEvidence(id, 'after', after);
  function matches(actual, expected) {
    if (expected && typeof expected === 'object') return Object.entries(expected).every(([key, value]) => matches(actual?.[key], value));
    return actual === expected;
  }
  const checks = Object.entries(patch).map(([key, value]) => [key, matches(key === 'content' ? after.content?.raw : after[key], value)]);
  if (after.id !== id || new URL(after.link).pathname !== uri || checks.some(([,ok]) => !ok)) {
    throw new Error(`Staging readback mismatch ${id}: ${JSON.stringify(checks)}${writeError ? `; ${writeError.message}` : ''}`);
  }
  await invalidateCachedRecords([id]);
  console.log(JSON.stringify({ id, status: after.status, verified: true, checks }));
}
