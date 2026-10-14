import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MEDIA_TAG = /<(?:img|source|video|audio|track)\b[^>]*>/gi;
const MEDIA_ATTRIBUTE = /\b(src|srcset|poster)\s*=\s*(["'])(.*?)\2/gi;

function htmlRoute(distRoot, filePath) {
  const relative = path.relative(distRoot, filePath).replaceAll(path.sep, '/');
  if (relative === 'index.html') return '/';
  if (relative.endsWith('/index.html')) return `/${relative.slice(0, -'index.html'.length)}`;
  return `/${relative}`;
}

function classifyMedia(value, route) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;
  const url = new URL(trimmed, new URL(route, 'https://preview.invalid'));
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
  if (url.origin !== 'https://preview.invalid') return { externalHost: url.hostname };
  return { pathname: decodeURIComponent(url.pathname) };
}

export function auditMediaHtml(html, route, exists) {
  const references = [];
  const externalHosts = new Map();
  const missing = [];
  for (const tag of html.matchAll(MEDIA_TAG)) {
    for (const attribute of tag[0].matchAll(MEDIA_ATTRIBUTE)) {
      const candidates = attribute[1].toLowerCase() === 'srcset'
        ? attribute[3].split(',').map((entry) => entry.trim().split(/\s+/)[0])
        : [attribute[3]];
      for (const candidate of candidates) {
        let classified;
        try {
          classified = classifyMedia(candidate, route);
        } catch {
          missing.push({ route, reference: candidate, reason: 'invalid URL encoding' });
          continue;
        }
        if (!classified) continue;
        if (classified.externalHost) {
          externalHosts.set(classified.externalHost, (externalHosts.get(classified.externalHost) ?? 0) + 1);
          if (classified.externalHost.endsWith('cloudwaysapps.com')) {
            missing.push({ route, reference: candidate, reason: 'staging media URL in built preview' });
          }
          continue;
        }
        const { pathname } = classified;
        references.push(pathname);
        if (!exists(pathname)) missing.push({ route, reference: candidate, pathname, reason: 'missing local asset' });
      }
    }
  }
  return { references, externalHosts, missing };
}

export function auditMediaDirectory(distRoot) {
  const root = path.resolve(distRoot);
  if (!fs.existsSync(root)) throw new Error(`Built output not found: ${root}`);
  let htmlFiles = 0;
  let localReferences = 0;
  const externalHosts = new Map();
  const missing = [];
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const filePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(filePath);
      } else if (entry.isFile() && filePath.endsWith('.html')) {
        htmlFiles += 1;
        const route = htmlRoute(root, filePath);
        const result = auditMediaHtml(fs.readFileSync(filePath, 'utf8'), route, (pathname) => {
          const asset = path.resolve(root, `.${pathname}`);
          return asset.startsWith(`${root}${path.sep}`) && fs.existsSync(asset) && fs.statSync(asset).isFile();
        });
        localReferences += result.references.length;
        for (const [host, count] of result.externalHosts) externalHosts.set(host, (externalHosts.get(host) ?? 0) + count);
        missing.push(...result.missing);
      }
    }
  };
  walk(root);
  return { htmlFiles, localReferences, externalHosts, missing };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const distRoot = process.argv[2] ?? path.join(process.cwd(), 'dist');
  const result = auditMediaDirectory(distRoot);
  const externalCount = [...result.externalHosts.values()].reduce((sum, count) => sum + count, 0);
  console.log(`Media audit: ${result.htmlFiles} HTML assets, ${result.localReferences} local media references, ${externalCount} external media references, ${result.missing.length} failures.`);
  for (const [host, count] of [...result.externalHosts].sort((a, b) => b[1] - a[1]).slice(0, 10)) console.log(`  ${host}: ${count}`);
  for (const item of result.missing.slice(0, 30)) console.error(`${item.route}: ${item.reference} (${item.reason})`);
  if (result.missing.length) process.exitCode = 1;
}
