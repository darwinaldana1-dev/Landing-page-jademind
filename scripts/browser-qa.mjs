import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDirectory, '..');
const chromeCandidates = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
];
const chromePath = chromeCandidates.find((candidate) => fs.existsSync(candidate));

if (!chromePath) {
  console.error('No se encontró Chrome o Edge para la validación visual.');
  process.exit(1);
}

const port = 9300 + (process.pid % 300);
const profilePath = path.join(os.tmpdir(), `jademind-browser-qa-${process.pid}`);
const mobileScreenshot = path.join(os.tmpdir(), 'jademind-qa-mobile.png');
const mobileDemoScreenshot = path.join(os.tmpdir(), 'jademind-qa-mobile-demo.png');
const mobileContactScreenshot = path.join(os.tmpdir(), 'jademind-qa-mobile-contact.png');
const desktopScreenshot = path.join(os.tmpdir(), 'jademind-qa-desktop.png');
const desktopDemoScreenshot = path.join(os.tmpdir(), 'jademind-qa-desktop-demo.png');
const pageUrl = pathToFileURL(path.join(root, 'index.html')).href;

const browser = spawn(chromePath, [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--hide-scrollbars',
  '--allow-file-access-from-files',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profilePath}`,
  'about:blank'
], { stdio: ['ignore', 'ignore', 'ignore'] });

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForDebugger() {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`);
      if (response.ok) return;
    } catch {
      // Chrome todavía está iniciando.
    }
    await delay(100);
  }
  throw new Error('Chrome no abrió el puerto de depuración.');
}

await waitForDebugger();
const targetResponse = await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(pageUrl)}`, { method: 'PUT' });
const target = await targetResponse.json();
const socket = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

let nextId = 1;
const pending = new Map();
const runtimeErrors = [];

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.id && pending.has(message.id)) {
    const { resolve, reject } = pending.get(message.id);
    pending.delete(message.id);
    if (message.error) reject(new Error(message.error.message));
    else resolve(message.result);
  }

  if (message.method === 'Runtime.exceptionThrown') {
    runtimeErrors.push(message.params.exceptionDetails.text);
  }

  if (message.method === 'Log.entryAdded' && message.params.entry.level === 'error') {
    const text = message.params.entry.text;
    if (!text.includes('ERR_NETWORK_ACCESS_DENIED') && !text.includes('ERR_BLOCKED_BY_CLIENT')) {
      runtimeErrors.push(text);
    }
  }
});

function call(method, params = {}) {
  const id = nextId;
  nextId += 1;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const response = await call('Runtime.evaluate', {
    expression,
    returnByValue: true,
    awaitPromise: true
  });
  return response.result.value;
}

async function setViewport(width, height, mobile) {
  await call('Emulation.setDeviceMetricsOverride', {
    width,
    height,
    deviceScaleFactor: 1,
    mobile,
    screenWidth: width,
    screenHeight: height
  });
  await evaluate(`delete document.documentElement.dataset.appReady`).catch(() => {});
  await call('Page.navigate', { url: pageUrl });
  let appReady = false;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    appReady = await evaluate(`document.documentElement.dataset.appReady === 'true'`).catch(() => false);
    if (appReady) break;
    await delay(100);
  }
  if (!appReady) throw new Error('app.js no terminó de inicializarse.');
  await delay(250);
}

async function capture(filePath, fullPage = false) {
  let clip;
  if (fullPage) {
    const metrics = await call('Page.getLayoutMetrics');
    clip = {
      x: 0,
      y: 0,
      width: metrics.cssContentSize.width,
      height: Math.min(metrics.cssContentSize.height, 10000),
      scale: 1
    };
  }

  const result = await call('Page.captureScreenshot', {
    format: 'png',
    fromSurface: true,
    captureBeyondViewport: fullPage,
    ...(clip ? { clip } : {})
  });
  fs.writeFileSync(filePath, Buffer.from(result.data, 'base64'));
}

async function inspectLayout() {
  return evaluate(`(() => {
    const viewport = document.documentElement.clientWidth;
    const isInsideHorizontalScroller = (element) => {
      let ancestor = element.parentElement;
      while (ancestor && ancestor !== document.body) {
        const overflowX = getComputedStyle(ancestor).overflowX;
        if (overflowX === 'auto' || overflowX === 'scroll') return true;
        ancestor = ancestor.parentElement;
      }
      return false;
    };

    const outsideViewport = [...document.body.querySelectorAll('*')]
      .filter((element) => {
        if (element.closest('[aria-hidden="true"]')) return false;
        const style = getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
        const rect = element.getBoundingClientRect();
        if (rect.width < 1 || rect.height < 1 || isInsideHorizontalScroller(element)) return false;
        return rect.left < -1 || rect.right > viewport + 1;
      })
      .slice(0, 10)
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          element: element.id ? '#' + element.id : element.tagName.toLowerCase() + (element.className ? '.' + String(element.className).trim().replace(/\\s+/g, '.') : ''),
          left: Math.round(rect.left),
          right: Math.round(rect.right)
        };
      });

    return {
      viewport,
      scrollWidth: document.documentElement.scrollWidth,
      bodyScrollWidth: document.body.scrollWidth,
      outsideViewport
    };
  })()`);
}

await call('Page.enable');
await call('Runtime.enable');
await call('Log.enable');
await call('Network.enable');
await call('Network.setBlockedURLs', { urls: ['https://fonts.googleapis.com/*', 'https://fonts.gstatic.com/*'] });

await setViewport(390, 844, true);
const mobileMetrics = await evaluate(`(() => {
  const toggle = document.querySelector('.nav-toggle');
  const hero = document.querySelector('.hero');
  return {
    viewport: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    bodyScrollWidth: document.body.scrollWidth,
    toggleDisplay: getComputedStyle(toggle).display,
    toggleRight: Math.round(toggle.getBoundingClientRect().right),
    heroRight: Math.round(hero.getBoundingClientRect().right),
    appReady: document.documentElement.dataset.appReady,
    outsideViewport: []
  };
})()`);
mobileMetrics.outsideViewport = (await inspectLayout()).outsideViewport;

const interactionMetrics = await evaluate(`(async () => {
  const toggle = document.querySelector('.nav-toggle');
  toggle.click();
  const menuOpened = toggle.getAttribute('aria-expanded') === 'true' && document.querySelector('#nav-links').classList.contains('is-open');
  const menuBackgroundInert = document.querySelector('main').inert && document.querySelector('footer').inert;
  toggle.click();
  const menuBackgroundRestored = !document.querySelector('main').inert && !document.querySelector('footer').inert;

  document.querySelector('[data-sector="productos"]').click();
  await new Promise((resolve) => setTimeout(resolve, 300));
  const productTab = document.querySelector('[data-sector="productos"]');
  const tabList = productTab.closest('[role="tablist"]');
  const productTabRect = productTab.getBoundingClientRect();
  const tabListRect = tabList.getBoundingClientRect();
  const productTabFullyVisible = productTabRect.left >= tabListRect.left - 1
    && productTabRect.right <= tabListRect.right + 1;
  const messageContainer = document.querySelector('#sector-messages');
  const lastMessage = messageContainer.lastElementChild;
  const conversationNotClipped = lastMessage.getBoundingClientRect().bottom <= messageContainer.getBoundingClientRect().bottom + 1
    && messageContainer.scrollHeight <= messageContainer.clientHeight + 1;
  const sectorChanged = document.querySelector('#sector-agent-name').textContent.includes('productos')
    && document.querySelectorAll('#sector-messages .message').length === 9
    && document.querySelector('#sector-result').textContent.includes('Confirmar inventario');

  document.querySelector('[data-step="registrar"]').click();
  const circuitChanged = document.querySelector('#circuit-detail').dataset.active === 'registrar';

  const range = document.querySelector('#automatable-percent');
  range.value = '75';
  range.dispatchEvent(new Event('input', { bubbles: true }));
  const estimatorChanged = document.querySelector('#automatable-label').textContent === '75%';

  const form = document.querySelector('#contact-form');
  form.querySelector('#nombre').value = 'Prueba QA';
  form.querySelector('#email').value = 'qa@example.com';
  form.querySelector('#mensaje').value = 'Validación local del formulario.';
  form.querySelector('#privacidad').checked = true;
  window.fetch = async () => ({ ok: true, json: async () => ({ message: 'Respuesta sin confirmación explícita' }) });
  form.requestSubmit();
  await new Promise((resolve) => setTimeout(resolve, 80));
  const formRejectsAmbiguousResponse = document.querySelector('#form-status').classList.contains('is-error')
    && form.querySelector('#nombre').value === 'Prueba QA';

  window.fetch = async () => ({ ok: true, json: async () => ({ success: true }) });
  form.requestSubmit();
  await new Promise((resolve) => setTimeout(resolve, 80));
  const formSuccess = document.querySelector('#form-status').classList.contains('is-success')
    && !form.querySelector('button[type="submit"]').disabled;
  document.querySelector('#form-status').textContent = '';
  document.querySelector('#form-status').className = 'form-status';

  return {
    menuOpened,
    menuBackgroundInert,
    menuBackgroundRestored,
    sectorChanged,
    productTabFullyVisible,
    conversationNotClipped,
    circuitChanged,
    estimatorChanged,
    formRejectsAmbiguousResponse,
    formSuccess
  };
})()`);

await capture(mobileScreenshot);
await evaluate(`(() => {
  document.documentElement.style.scrollBehavior = 'auto';
  window.scrollTo(0, document.querySelector('#demo').offsetTop - 76);
})()`);
await delay(200);
await capture(mobileDemoScreenshot);
await evaluate(`(() => {
  window.scrollTo(0, document.querySelector('#contacto').offsetTop);
})()`);
await delay(200);
await capture(mobileContactScreenshot);

const responsiveMetrics = {};
for (const width of [320, 820]) {
  await setViewport(width, width === 320 ? 700 : 900, true);
  responsiveMetrics[width] = await inspectLayout();
}

await setViewport(1440, 1000, false);
const desktopMetrics = {
  ...(await inspectLayout()),
  documentHeight: await evaluate(`document.documentElement.scrollHeight`),
  navToggle: await evaluate(`getComputedStyle(document.querySelector('.nav-toggle')).display`)
};
await capture(desktopScreenshot, true);
await evaluate(`(() => {
  document.querySelector('[data-sector="productos"]').click();
  document.documentElement.style.scrollBehavior = 'auto';
  window.scrollTo(0, document.querySelector('#demo').offsetTop - 76);
})()`);
await delay(200);
await capture(desktopDemoScreenshot);

await call('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 1,
  mobile: true,
  screenWidth: 390,
  screenHeight: 844
});
const legalMetrics = {};
for (const legalFile of ['politicas-de-privacidad.html', 'terminos-y-condiciones.html']) {
  await call('Page.navigate', { url: pathToFileURL(path.join(root, legalFile)).href });
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const complete = await evaluate(`document.readyState === 'complete'`).catch(() => false);
    if (complete) break;
    await delay(100);
  }
  legalMetrics[legalFile] = await evaluate(`({
    viewport: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    h1: document.querySelector('h1')?.textContent.trim() || ''
  })`);
}

await call('Browser.close').catch(() => {});
socket.close();
browser.kill();

const overflow = mobileMetrics.scrollWidth > mobileMetrics.viewport || mobileMetrics.bodyScrollWidth > mobileMetrics.viewport;
const interactionsPassed = Object.values(interactionMetrics).every(Boolean);
const responsiveOverflow = Object.values(responsiveMetrics).some((metrics) => (
  metrics.scrollWidth > metrics.viewport
  || metrics.bodyScrollWidth > metrics.viewport
  || metrics.outsideViewport.length > 0
));
const desktopOverflow = desktopMetrics.scrollWidth > desktopMetrics.viewport || desktopMetrics.outsideViewport.length > 0;
const legalOverflow = Object.values(legalMetrics).some((metrics) => metrics.scrollWidth > metrics.viewport);

console.log(JSON.stringify({
  mobile: mobileMetrics,
  responsive: responsiveMetrics,
  desktop: desktopMetrics,
  legal: legalMetrics,
  interactions: interactionMetrics,
  runtimeErrors,
  screenshots: { mobileScreenshot, mobileDemoScreenshot, mobileContactScreenshot, desktopScreenshot, desktopDemoScreenshot }
}, null, 2));

if (overflow || mobileMetrics.outsideViewport.length || responsiveOverflow || desktopOverflow || legalOverflow || !interactionsPassed || runtimeErrors.length) {
  process.exitCode = 1;
}
