// Local-only visual QA. Starts an isolated headless Chrome profile, captures
// representative pages, reports viewport overflow/footer/sidebar evidence.
import { spawn } from 'node:child_process';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const chromePath = process.env.ET_QA_CHROME ?? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const origin = process.env.ET_QA_ORIGIN ?? 'http://127.0.0.1:4321';
const launch = process.env.ET_QA_LAUNCH === '1';
const defaultPages = [
  ['home', '/pilot/home/'],
  ['free-tips', '/pilot/free-betting-tips/'],
  ['bet365', '/pilot/bet365-review/'],
  ['paypal', '/pilot/paypal-gutenberg-roundtrip/'],
  ['article', '/pilot/article-daily-tips/'],
];
const requestedPaths = process.env.ET_QA_PATHS?.split(',').map((path) => path.trim()).filter(Boolean) ?? [];
if (requestedPaths.some((path) => !/^\/[A-Za-z0-9_/%.-]*$/.test(path) || path.includes('..'))) {
  throw new Error('ET_QA_PATHS must contain local pathnames only');
}
const pages = requestedPaths.length
  ? requestedPaths.map((path, index) => [`exact-${index + 1}`, path])
  : defaultPages;
const views = [['mobile', 375, 812, true], ['desktop', 1365, 900, false]];
const output = await mkdtemp(join(tmpdir(), 'everytip-render-qa-'));
const profile = join(output, 'chrome-profile');
const chrome = spawn(chromePath, [
  '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore', windowsHide: true });

async function activePort() {
  for (let attempt = 0; attempt < 100; attempt++) {
    try { return Number((await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); }
    catch { await new Promise((resolve) => setTimeout(resolve, 100)); }
  }
  throw new Error('Headless Chrome did not open a DevTools port');
}

async function targetSocket(port) {
  const targets = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
  const page = targets.find((target) => target.type === 'page');
  if (!page) throw new Error('No Chrome page target');
  const socket = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  let id = 0;
  const pending = new Map();
  socket.onmessage = ({ data }) => {
    const event = JSON.parse(data);
    if (!event.id || !pending.has(event.id)) return;
    const { resolve, reject } = pending.get(event.id);
    pending.delete(event.id);
    event.error ? reject(new Error(event.error.message)) : resolve(event.result);
  };
  return {
    send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const requestId = ++id;
        pending.set(requestId, { resolve, reject });
        socket.send(JSON.stringify({ id: requestId, method, params }));
      });
    },
    close() { socket.close(); },
  };
}

try {
  const port = await activePort();
  const cdp = await targetSocket(port);
  await cdp.send('Page.enable');
  await cdp.send('Runtime.enable');
  const results = [];
  for (const [view, width, height, mobile] of views) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile });
    for (const [name, path] of pages) {
      await cdp.send('Page.navigate', { url: `${origin}${path}` });
      for (let attempt = 0; attempt < 30; attempt++) {
        const ready = await cdp.send('Runtime.evaluate', { expression: '({ ready: document.readyState, path: location.pathname })', returnByValue: true });
        if (ready.result.value?.ready === 'complete' && ready.result.value?.path === path) break;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      await cdp.send('Runtime.evaluate', { expression: 'scrollTo(0, 0)' });
      const metrics = await cdp.send('Runtime.evaluate', {
        expression: `(() => {
          const footer = document.querySelector('.site-footer');
          const sidebar = document.querySelector('.sidebar');
          const legal = footer ? [...footer.querySelectorAll('a')].some(a => /safer gambling/i.test(a.textContent)) : false;
          const overflow = [...document.querySelectorAll('body *')].filter(el => {
            const rect = el.getBoundingClientRect();
            const style = getComputedStyle(el);
            return style.position !== 'fixed' && rect.width > 0 && rect.right > innerWidth + 2;
          }).slice(0, 8).map(el => ({ tag: el.tagName, cls: String(el.className).slice(0, 80), right: Math.round(el.getBoundingClientRect().right) }));
          return { title: document.title, width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
            footer: !!footer, legal, sidebar: !!sidebar, sidebarDisplay: sidebar ? getComputedStyle(sidebar).display : null,
            previewBanner: !!document.querySelector('.preview-banner'), disabledOffers: document.querySelectorAll('.offer-disabled,.offer-preview-button,.featured-offer-cta').length,
            activeAffiliateLinks: document.querySelectorAll('a[href*="/go/"],a[href*="?via="]').length,
            invalidAffiliateRels: [...document.querySelectorAll('a[href*="/go/"]')].filter(a => !a.relList.contains('sponsored') || !a.relList.contains('nofollow')).length,
            overflow };
        })()`, returnByValue: true,
      });
      const screenshot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      await writeFile(join(output, `${name}-${view}.png`), Buffer.from(screenshot.data, 'base64'));
      if (name === 'home' || name === 'article') {
        await cdp.send('Runtime.evaluate', { expression: 'document.querySelector(".site-footer")?.scrollIntoView({block:"end"})' });
        const footerShot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        await writeFile(join(output, `${name}-${view}-footer.png`), Buffer.from(footerShot.data, 'base64'));
      }
      if (name === 'article' && mobile) {
        await cdp.send('Runtime.evaluate', { expression: 'document.querySelector(".sidebar")?.scrollIntoView({block:"start"})' });
        const sidebarShot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        await writeFile(join(output, 'article-mobile-sidebar.png'), Buffer.from(sidebarShot.data, 'base64'));
      }
      if (name === 'bet365' && mobile) {
        const stickyState = await cdp.send('Runtime.evaluate', {
          expression: `new Promise(resolve => {
            const offer = document.querySelector('#review-offer');
            if (!offer) return resolve({present:false});
            scrollTo(0, offer.getBoundingClientRect().bottom + scrollY + 60);
            requestAnimationFrame(() => requestAnimationFrame(() => {
              const bar = document.querySelector('[data-review-mobile-sticky]');
              resolve({present:!!bar, visible:!!bar && !bar.hidden,
                disabled:!!bar?.querySelector('.sticky-disabled'), activeLink:!!bar?.querySelector('a.sticky-cta')});
            }));
          })`, returnByValue: true, awaitPromise: true,
        });
        metrics.result.value.sticky = stickyState.result.value;
        const stickyShot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        await writeFile(join(output, 'bet365-mobile-sticky.png'), Buffer.from(stickyShot.data, 'base64'));
      }
      if (name === 'paypal' && mobile) {
        await cdp.send('Runtime.evaluate', { expression: 'document.querySelector(".payment-table")?.scrollIntoView({block:"start"})' });
        const paymentShot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        await writeFile(join(output, 'paypal-mobile-table.png'), Buffer.from(paymentShot.data, 'base64'));
        await cdp.send('Runtime.evaluate', { expression: 'document.querySelector(".payment-expand")?.click()' });
        const detailShot = await cdp.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        await writeFile(join(output, 'paypal-mobile-table-expanded.png'), Buffer.from(detailShot.data, 'base64'));
      }
      results.push({ name, view, path, ...metrics.result.value });
    }
  }
  cdp.close();
  const failures = results.filter((result) => result.scrollWidth > result.width + 1
    || !result.footer || !result.legal || (launch ? result.invalidAffiliateRels > 0 : result.activeAffiliateLinks > 0)
    || (result.name === 'article' && !result.sidebar)
    || (result.name === 'bet365' && result.view === 'mobile'
      && (!result.sticky?.visible || !result.sticky.disabled || result.sticky.activeLink)));
  if (failures.length) process.exitCode = 1;
  console.log(JSON.stringify({ output, results }, null, 2));
} finally {
  chrome.kill();
}
