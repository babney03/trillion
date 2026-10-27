// Load each candidate's website in a real browser at phone size and record what
// a customer would actually see. Fills in emails that only appear after the page
// renders, and corrects the quick HTML audit in find.py.
//
// Usage:  node pipeline/check.mjs [status ...]      (default: lead "no email" maybe unverified)
// Writes: pipeline/checks.json  (by website domain)
//         pipeline/cache/shots/<domain>.png  (phone screenshot, first screen)
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const OUT = join(ROOT, 'checks.json');
const SHOTS = join(ROOT, 'cache', 'shots');
mkdirSync(SHOTS, { recursive: true });

function parseCsv(text) {
  const rows = []; let row = [], cell = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) { if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') q = false; else cell += c; }
    else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
    else if (c !== '\r') cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const [head, ...body] = rows;
  return body.filter(r => r.length === head.length).map(r => Object.fromEntries(head.map((h, i) => [h, r[i]])));
}

const want = process.argv.slice(2).length ? process.argv.slice(2) : ['lead', 'no email', 'maybe', 'unverified'];
const leads = parseCsv(readFileSync(join(ROOT, 'leads.csv'), 'utf8')).filter(r => want.includes(r.status) && r.website);
const done = existsSync(OUT) ? JSON.parse(readFileSync(OUT, 'utf8')) : {};
const dom = u => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };
const todo = leads.filter(r => !done[dom(r.website)]);
console.log(`${todo.length} sites to check (${leads.length - todo.length} already done)`);

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const JUNK = /example\.|sentry|wixpress|domain\.com|email\.com|yourname|@2x|\.png|\.jpg|\.webp|godaddy|squarespace|wordpress|schema\.org|jquery|mysite\.com/i;

const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });

async function check(r) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1' });
  const page = await ctx.newPage();
  const res = { name: r.name, website: r.website };
  try {
    const t0 = Date.now();
    const resp = await page.goto(r.website, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    res.status = resp ? resp.status() : 0;
    res.load_ms = Date.now() - t0;
    res.final = page.url();
    Object.assign(res, await page.evaluate(() => {
      const de = document.documentElement, b = document.body;
      const sizes = [...document.querySelectorAll('p, li, a, span')].filter(el => el.offsetParent && el.textContent.trim().length > 20)
        .map(el => parseFloat(getComputedStyle(el).fontSize)).sort((a, z) => a - z);
      return {
        title: document.title,
        viewport: !!document.querySelector('meta[name="viewport"]'),
        overflow_px: Math.max(0, Math.max(de.scrollWidth, b ? b.scrollWidth : 0) - window.innerWidth),
        small_text: sizes.length ? sizes[Math.floor(sizes.length / 2)] < 13 : false,
        tel: !!document.querySelector('a[href^="tel:"]'),
        text_len: (b ? b.innerText : '').length,
        headings: [...document.querySelectorAll('h1,h2')].map(h => h.innerText.trim()).filter(Boolean).slice(0, 6),
        html: de.outerHTML.slice(0, 600000),
        text: (b ? b.innerText : '').slice(0, 12000),
      };
    }));
    let emails = new Set([...(res.html.match(/mailto:[^"'?>\s]+/g) || []).map(m => m.slice(7)), ...(res.text.match(EMAIL) || [])]);
    if (![...emails].some(e => !JUNK.test(e))) {
      for (const path of ['/contact', '/contact-us', '/contact-us/', '/about']) {
        try {
          await page.goto(new URL(path, res.final).href, { waitUntil: 'domcontentloaded', timeout: 15000 });
          await page.waitForTimeout(1500);
          const h = await page.content();
          const found = [...(h.match(/mailto:[^"'?>\s]+/g) || []).map(m => m.slice(7)), ...(h.replace(/<[^>]+>/g, ' ').match(EMAIL) || [])];
          found.forEach(e => emails.add(e));
          if (found.some(e => !JUNK.test(e))) break;
        } catch {}
      }
      await page.goto(res.final, { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      await page.waitForTimeout(1000);
    }
    res.emails = [...new Set([...emails].map(e => decodeURIComponent(e).toLowerCase().replace(/\.$/, '')))].filter(e => !JUNK.test(e) && /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(e));
    await page.screenshot({ path: join(SHOTS, dom(r.website) + '.png') });
    res.shot = true;
    delete res.html;
  } catch (e) {
    res.error = String(e.message || e).split('\n')[0].slice(0, 160);
  }
  await ctx.close();
  return res;
}

let i = 0;
async function worker() {
  while (i < todo.length) {
    const r = todo[i++];
    const out = await check(r);
    done[dom(r.website)] = out;
    writeFileSync(OUT, JSON.stringify(done, null, 1));
    console.log(`${dom(r.website)}: ${out.error ? 'ERROR ' + out.error : `${out.status} vp=${out.viewport} over=${out.overflow_px} tel=${out.tel} text=${out.text_len} emails=${out.emails.join(' ')}`}`);
  }
}
await Promise.all([worker(), worker(), worker(), worker()]);
await browser.close();
