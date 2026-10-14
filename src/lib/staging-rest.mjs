import { mkdir, readFile, readdir, unlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const stagingOrigin = 'https://wordpress-159231-2098144.cloudwaysapps.com';
export async function stagingRequest(path, { method = 'GET', body } = {}) {
  const site = new URL(process.env.EVERYTIP_WP_BASE_URL || stagingOrigin);
  if (site.origin !== stagingOrigin || site.pathname !== '/' || !path.startsWith('/wp-json/')) throw new Error('Exact staging REST origin required');
  const username = process.env.EVERYTIP_WP_USERNAME;
  const password = process.env.EVERYTIP_WP_APPLICATION_PASSWORD;
  if (!username || !password) throw new Error('Staging REST credentials missing');
  const response = await fetch(new URL(path, site), { method,
    headers: { Authorization: `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(60000) });
  const data = await response.json();
  if (!response.ok) throw new Error(`Staging REST ${method} HTTP ${response.status}: ${data.code || 'unknown'}`);
  return data;
}

export async function invalidateCachedRecords(ids) {
  const directory = 'outputs/wpgraphql-cache';
  for (const file of await readdir(directory).catch(error => error.code === 'ENOENT' ? [] : Promise.reject(error))) {
    if (!/^[a-f0-9]{64}\.json$/.test(file)) continue;
    const path = join(directory, file);
    const cached = JSON.parse(await readFile(path, 'utf8'));
    function contains(node) {
      if (!node || typeof node !== 'object') return false;
      return ids.includes(node.databaseId) || Object.values(node).some(contains);
    }
    if (contains(cached.data)) await unlink(path);
  }
}

export async function saveWriteEvidence(id, name, value) {
  await mkdir('outputs/staging-writes', { recursive: true });
  const path = `outputs/staging-writes/${id}-${name}.json`;
  await writeFile(path, JSON.stringify(value, null, 2));
}
