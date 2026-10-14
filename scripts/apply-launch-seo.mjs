// Section 0 single-record staging edits for answered decisions D3 and D5.
import { stagingRequest, saveWriteEvidence, invalidateCachedRecords } from '../src/lib/staging-rest.mjs';
const action = process.argv[2];
if (!['bet365','john'].includes(action) || process.argv[3] !== '--apply') throw new Error('Use bet365|john --apply');
if (action === 'bet365') {
  const id = 87553;
  const path = `/wp-json/everytip/v1/editorial-seo/${id}`;
  const before = await stagingRequest(path);
  if (before.id !== id || before.post_type !== 'page') throw new Error('Unexpected Bet365 page identity');
  const original = before.fields.meta_description;
  if (!original?.includes('\u00a330')) {
    if (!original?.includes('\u00a320')) throw new Error('Neither expected GBP 30 nor GBP 20 in description');
    console.log(JSON.stringify({ id, decision: 'D3', alreadyCorrect: true }));
  } else {
    const description = original.replaceAll('\u00a330', '\u00a320');
    await saveWriteEvidence(id, 'seo-before', before);
    await stagingRequest(path, { method: 'POST', body: { expected_revision: before.revision_token, fields: { meta_description: description } } });
    const after = await stagingRequest(path);
    await saveWriteEvidence(id, 'seo-after', after);
    if (after.id !== id || after.fields.meta_description !== description || after.status !== before.status) throw new Error('Bet365 SEO readback mismatch');
    await invalidateCachedRecords([id]);
    console.log(JSON.stringify({ id, decision: 'D3', verified: true, description }));
  }
} else {
  const id = 70985;
  const path = `/wp-json/wp-abilities/v1/abilities/yoast-seo/get-post-seo-data/run?input[post_id]=${id}`;
  const unwrap = value => Array.isArray(value) ? value[0] : Array.isArray(value?.result) ? value.result[0] : value?.result ?? value;
  const before = unwrap(await stagingRequest(path));
  if (before.post_id !== id || before.post_status !== 'publish') throw new Error('Unexpected John post identity');
  if (before.noindex === true) console.log(JSON.stringify({ id, decision: 'D5', alreadyCorrect: true }));
  else {
    await saveWriteEvidence(id, 'seo-before', before);
    await stagingRequest('/wp-json/wp-abilities/v1/abilities/yoast-seo/update-post-seo-data/run', { method: 'POST', body: { input: { post_id: id, noindex: true } } });
    const after = unwrap(await stagingRequest(path));
    await saveWriteEvidence(id, 'seo-after', after);
    const preserved = ['seo_title','meta_description','canonical','nofollow','post_status'];
    if (after.post_id !== id || after.noindex !== true || preserved.some(key => after[key] !== before[key])) throw new Error('John noindex readback mismatch');
    await invalidateCachedRecords([id]);
    console.log(JSON.stringify({ id, decision: 'D5', verified: true, noindex: after.noindex }));
  }
}
