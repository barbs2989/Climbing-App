// Hand-run: why does a touch beside one control not reach it? node scripts/oneoff/debug-tap-slop.mjs <base-url> <control text>
import { chromium } from "playwright-core";
const [base, text] = process.argv.slice(2);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
await page.goto(base, { waitUntil: "domcontentloaded" });
await page.waitForFunction(() => (document.body?.innerText || "").length > 120, null, { timeout: 60000 });
await page.waitForTimeout(3000);
console.log(JSON.stringify(await page.evaluate((t) => {
  const el = [...document.querySelectorAll("button, a, [role=button]")].find((e) => (e.innerText || "").trim() === t);
  if (!el) return "not found";
  const r = el.getBoundingClientRect(); const out = [];
  const desc = (n) => n ? `${n.tagName.toLowerCase()}${n.getAttribute("role") ? "[" + n.getAttribute("role") + "]" : ""} cursor=${getComputedStyle(n).cursor} "${(n.innerText || "").slice(0, 30)}"` : "null";
  for (const dy of [-12, -8, -4, 4, 8, 12]) {
    const x = (r.left + r.right) / 2, y = dy < 0 ? r.top + dy : r.bottom + dy;
    const h = document.elementFromPoint(x, y); const chain = []; for (let n = h; n && n !== document.body && chain.length < 6; n = n.parentElement) chain.push(desc(n));
    out.push({ dy, slop: desc(window.__slopTarget(x, y)), chain });
  }
  return { r: [r.left, r.top, r.width, r.height], out };
}, text), null, 1));
await browser.close();
