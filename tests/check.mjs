#!/usr/bin/env node
/* Regression checks for the listing page.
 *
 *   node tests/check.mjs            serves public/ and checks it
 *   node tests/check.mjs <url>      checks a running site (e.g. the live URL)
 *
 * Needs playwright: npm install --no-save playwright
 * The emphasis is on facts a buyer acts on. A wrong number on a listing page
 * is the expensive failure, so the derived figures are recomputed here rather
 * than compared to a copy of themselves.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');

/* ---- the listing's facts, asserted independently of the page ---- */
const FACT = {
  price: 435000,
  sqft: 1624,
  taxRate: 0.0222671,                 // combined 2026 Dallas rate per $1
  assessed: 490000,
  annualTaxOnAssessed: 10910.88,
  jurisdictions: [3424.12, 4869.79, 1055.95, 522.22, 1038.80],
  hoaMonthly: 457,
  beds: 2, fullBaths: 2, halfBaths: 1,
  mls: '21312626',
  ga4: 'G-R7X5SELD1R',
  sage: 'rgb(164, 183, 162)',
};
const usd0 = (n) => '$' + Math.round(n).toLocaleString('en-US');

let pass = 0, fail = 0;
const t = async (name, fn) => {
  try {
    const r = await fn();
    if (r === true) { console.log(`  PASS  ${name}`); pass++; }
    else { console.log(`  FAIL  ${name}${r ? ' — ' + r : ''}`); fail++; }
  } catch (e) { console.log(`  ERR   ${name}: ${e.message}`); fail++; }
};
const section = (s) => console.log(`\n--- ${s} ---`);

/* ---- static server, only when no URL was given ---- */
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript',
  '.json': 'application/json', '.jpg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.xml': 'application/xml', '.txt': 'text/plain' };
function serve() {
  return new Promise((res) => {
    const s = http.createServer((req, rq) => {
      let f = path.join(PUBLIC, decodeURIComponent(req.url.split('?')[0]));
      if (f.endsWith('/')) f += 'index.html';
      fs.readFile(f, (e, d) => e
        ? (rq.writeHead(404), rq.end('nf'))
        : (rq.writeHead(200, { 'content-type': MIME[path.extname(f)] || 'application/octet-stream' }), rq.end(d)));
    });
    s.listen(0, () => res({ url: `http://127.0.0.1:${s.address().port}/`, close: () => s.close() }));
  });
}

const arg = process.argv[2];
const server = arg ? null : await serve();
const URL_ = arg || server.url;
console.log(`checking ${URL_}`);

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium',
  args: ['--no-sandbox'],
});
const ctx = await browser.newContext({ viewport: { width: 1280, height: 950 }, reducedMotion: 'reduce' });
const page = await ctx.newPage();

const gaRequests = [];
const badRequests = [];
const EXTERNAL = /googletagmanager|google-analytics|google\.com\/maps|gstatic|facebook/;
page.on('request', (r) => { if (/googletagmanager|google-analytics/.test(r.url())) gaRequests.push(r.url()); });
page.on('requestfailed', (r) => { if (!EXTERNAL.test(r.url())) badRequests.push(r.url()); });
page.on('pageerror', (e) => badRequests.push('pageerror: ' + e.message));

await page.goto(URL_, { waitUntil: 'networkidle' });
await page.waitForTimeout(900);

const txt = (sel) => page.locator(sel).first().innerText();
const specValue = (label) => page.evaluate((l) => {
  const dt = [...document.querySelectorAll('.spec dt')].find((d) => d.textContent.trim() === l);
  return dt ? dt.nextElementSibling.textContent.trim() : null;
}, label);

section('price and every figure derived from it');
await t(`hero shows ${usd0(FACT.price)}`, async () =>
  (await txt('.hero__stat dd')).startsWith(usd0(FACT.price)) || `got ${await txt('.hero__stat dd')}`);
await t(`details price is ${usd0(FACT.price)}`, async () => {
  const v = await specValue('Price'); return v === usd0(FACT.price) || `got ${v}`;
});
await t('price per sq ft equals price ÷ square feet', async () => {
  const shown = await specValue('Price per sq ft');
  const want = '$' + (FACT.price / FACT.sqft).toFixed(2);
  return shown === want || `page says ${shown}, price ÷ sqft is ${want}`;
});
await t('tax estimator defaults to the list price', async () =>
  (await page.inputValue('#calcPrice')) === usd0(FACT.price) || `got ${await page.inputValue('#calcPrice')}`);
await t('estimator annual figure equals price × combined rate', async () => {
  const shown = (await txt('#calcYear')).trim();
  const want = usd0(FACT.price * FACT.taxRate);
  return shown === want || `page says ${shown}, computed ${want}`;
});
await t('estimator monthly figure is the annual ÷ 12', async () => {
  const shown = (await txt('#calcMonth')).trim();
  const want = usd0(FACT.price * FACT.taxRate / 12);
  return shown === want || `page says ${shown}, computed ${want}`;
});
await t('structured data carries the same price', async () => {
  const p = await page.evaluate(() => JSON.parse(
    document.querySelector('script[type="application/ld+json"]').textContent)
    ['@graph'].find((n) => n['@type'] === 'Offer').price);
  return p === FACT.price || `JSON-LD says ${p}`;
});
await t('meta and social descriptions quote the same price', async () => {
  const m = await page.evaluate(() => [
    document.querySelector('meta[name=description]').content,
    document.querySelector('meta[property="og:description"]').content,
    document.querySelector('meta[name="twitter:description"]').content,
  ]);
  return m.every((c) => c.includes(usd0(FACT.price))) || 'a description quotes a different price';
});
await t('no unexpected six-figure amount (catches a price left behind)', async () => {
  // Every $NNN,NNN on the page must be one we expect. The list price and the
  // assessed value are both legitimate and different from each other; anything
  // else is most likely a figure a price change failed to update.
  const expected = new Set([FACT.price, FACT.assessed].map((n) => n.toLocaleString('en-US')));
  const found = await page.evaluate(() => {
    const html = document.documentElement.innerHTML;
    return [...html.matchAll(/\$([0-9]{3},[0-9]{3})/g)].map((m) => m[1]);
  });
  const others = [...new Set(found)].filter((v) => !expected.has(v));
  return others.length === 0 || `unexpected: ${others.join(', ')}`;
});

section('tax figures reconcile');
await t('assessed value × rate equals the published annual tax', async () => {
  const got = FACT.assessed * FACT.taxRate;
  return Math.abs(got - FACT.annualTaxOnAssessed) < 0.02 || `computed ${got.toFixed(2)}`;
});
await t('the five jurisdiction amounts sum to the same total', async () => {
  const sum = FACT.jurisdictions.reduce((a, b) => a + b, 0);
  return Math.abs(sum - FACT.annualTaxOnAssessed) < 0.02 || `sum is ${sum.toFixed(2)}`;
});
await t(`HOA shown as ${usd0(FACT.hoaMonthly)} / month`, async () =>
  (await page.locator('.cost__fig').first().innerText()).includes(usd0(FACT.hoaMonthly)));

section('core property facts');
await t(`beds and baths read ${FACT.beds} / ${FACT.fullBaths} full · ${FACT.halfBaths} half`, async () =>
  (await specValue('Bedrooms')) === String(FACT.beds) &&
  (await specValue('Baths')).startsWith(`${FACT.fullBaths} full · ${FACT.halfBaths} half`));
await t(`interior is ${FACT.sqft.toLocaleString('en-US')} sq ft`, async () =>
  (await specValue('Interior')) === `${FACT.sqft.toLocaleString('en-US')} sq ft`);
await t(`MLS number is ${FACT.mls}`, async () => (await specValue('MLS number')) === FACT.mls);

section('analytics');
await t(`GA4 installed exactly once as ${FACT.ga4}`, async () => {
  const scripts = gaRequests.filter((u) => /gtag\/js/.test(u));
  const configs = await page.evaluate(() => (window.dataLayer || [])
    .filter((a) => { try { return a[0] === 'config'; } catch { return false; } }).length);
  return (scripts.length === 1 && scripts[0].includes(FACT.ga4) && configs === 1)
    || `${scripts.length} script request(s), ${configs} config call(s)`;
});
await t('no tracked event fires on page load alone', async () =>
  (await page.evaluate(() => (window.dataLayer || []).filter((e) => e && e.event).length)) === 0);

section('build and brand integrity');
await t('CSS and JS references carry a content stamp', async () => {
  const refs = await page.evaluate(() =>
    [...document.querySelectorAll('link[rel=stylesheet], script[src]')]
      .map((e) => e.getAttribute('href') || e.getAttribute('src'))
      .filter((u) => u && u.startsWith('/assets/')));
  return (refs.length >= 3 && refs.every((u) => /\?v=[a-f0-9]{8}$/.test(u))) || 'run tools/stamp-assets.mjs';
});
await t('footer renders on the dark ground (stylesheet intact)', async () =>
  (await page.evaluate(() => getComputedStyle(document.querySelector('.foot')).backgroundColor)) === 'rgb(22, 25, 26)');
await t('brand mark uses the sage token', async () => {
  const fills = await page.evaluate(() => [...new Set([...document.querySelectorAll('.mark polygon')]
    .map((e) => getComputedStyle(e).fill))]);
  return (fills.length === 1 && fills[0] === FACT.sage) || `fills: ${fills.join(',')}`;
});
await t('footer still carries the verification disclaimer', async () =>
  await page.evaluate(() => {
    const f = document.querySelector('.foot__legal').innerText;
    return /room dimensions/i.test(f) && /schools/i.test(f) && /school attendance/i.test(f);
  }));

section('gallery');
await t('every gallery photo loaded', async () => {
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(2500);
  const broken = await page.evaluate(() => [...document.images]
    .filter((i) => i.getAttribute('src') && i.complete && i.naturalWidth === 0).length);
  return broken === 0 || `${broken} broken`;
});
await t('lightbox opens and closes on a real click', async () => {
  await page.evaluate(() => document.getElementById('gallery').scrollIntoView());
  await page.waitForTimeout(400);
  await page.locator('.gal__item').first().click();
  await page.waitForTimeout(400);
  const open = await page.locator('#lb').isVisible();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(300);
  return (open && await page.locator('#lb').isHidden()) || 'lightbox did not open/close';
});

section('layout at phone and desktop widths');
for (const w of [320, 375, 390, 768, 1024, 1440]) {
  await t(`no horizontal overflow at ${w}px`, async () => {
    const p2 = await (await browser.newContext({ viewport: { width: w, height: 900 } })).newPage();
    await p2.goto(URL_, { waitUntil: 'networkidle' });
    await p2.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await p2.waitForTimeout(900);
    const over = await p2.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    await p2.close();
    return !over || 'content wider than the viewport';
  });
}

section('contrast (WCAG AA)');
await t('every text style meets its contrast minimum', async () => {
  const bad = await page.evaluate(() => {
    const lum = (r, g, b) => { const a = [r, g, b].map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]; };
    const parse = (c) => (c.match(/[\d.]+/g) || [0, 0, 0]).slice(0, 3).map(Number);
    const bgOf = (el) => { let n = el; while (n && n !== document.documentElement) { const c = getComputedStyle(n).backgroundColor; const a = (c.match(/[\d.]+/g) || [])[3]; if (c && c !== 'rgba(0, 0, 0, 0)' && a !== '0') return c; n = n.parentElement; } return 'rgb(255,255,255)'; };
    const ratio = (f, b) => { const L1 = lum(...parse(f)), L2 = lum(...parse(b)); const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1]; return (hi + 0.05) / (lo + 0.05); };
    const sel = ['.eyebrow', '.lede', '.muted', '.fine', '.spec dt', '.spec dd', '.spec dd .note',
      '.cost__fig', '.cost__cell p', '.cost__cell h3', '.school em', '.school span', '.places span',
      '.hl__item p', '.hl__n', '.chip', '.btn--primary', '.btn--ghost', '.foot__legal', '.foot h4',
      '.agent .role', '.agent__lic', '.field label', '.calc__out dt', '.nav__links a', '.nav__brand span'];
    return sel.map((s) => {
      const el = document.querySelector(s); if (!el) return null;
      const st = getComputedStyle(el), size = parseFloat(st.fontSize), wt = parseInt(st.fontWeight) || 400;
      const large = size >= 24 || (size >= 18.66 && wt >= 700);
      const r = ratio(st.color, bgOf(el));
      return r < (large ? 3 : 4.5) ? `${s} ${r.toFixed(2)}:1` : null;
    }).filter(Boolean);
  });
  return bad.length === 0 || bad.join('; ');
});

section('first-party requests');
await t('no failed first-party requests or page errors', async () =>
  badRequests.length === 0 || badRequests.slice(0, 3).join('; '));

await browser.close();
if (server) server.close();
console.log(`\n===== ${pass} passed, ${fail} failed =====`);
process.exit(fail ? 1 : 0);
