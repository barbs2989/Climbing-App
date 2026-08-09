// Drive to the Route finder, open the Filters sheet, and measure whether the app
// header/nav paints over the top of it.
import { chromium } from "playwright-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const URL = process.argv[2] || "http://localhost:5199/Climbing-App/";
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 780 } });
page.on("pageerror", (e) => console.log("PAGEERROR", e.message));
await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForTimeout(6000);

const click = async (text, note) => {
  const el = page.locator(`text="${text}"`).first();
  await el.waitFor({ timeout: 12000 });
  await el.click();
  await page.waitForTimeout(1400);
  console.log("clicked:", note || text);
};

await click("Climbs");
for (let i = 0; i < 25; i++) { if (!/Loading climbs/.test(await page.innerText("body"))) break; await page.waitForTimeout(1500); }
// The state picker is a controlled <select> — dispatch a real change event.
await page.evaluate(() => {
  const sel = document.querySelector("select");
  const opt = [...sel.options].find((o) => o.label === "Washington" || o.label.startsWith("Washington "));
  sel.value = opt.value;
  sel.dispatchEvent(new Event("change", { bubbles: true }));
});
await page.waitForTimeout(3500);
const rf = page.locator('button:has-text("Route finder")').first();
await rf.waitFor({ timeout: 15000 });
await rf.click();
await page.waitForTimeout(6000);
const filters = page.locator('button:has-text("Filters")').first();
await filters.waitFor({ timeout: 10000 });
await filters.click();
await page.waitForTimeout(900);

const m = await page.evaluate(() => {
  const dlg = [...document.querySelectorAll('[role="dialog"]')].pop();
  if (!dlg) return { err: "no dialog" };
  const panel = dlg.firstElementChild;
  const pb = panel.getBoundingClientRect();
  const nav = document.querySelector('[role="navigation"][aria-label="Primary"]');
  const banner = document.querySelector('[role="banner"]');
  const nb = nav.getBoundingClientRect(), bb = banner.getBoundingClientRect();
  const title = [...panel.querySelectorAll("div")].find(d => d.textContent.trim() === "Filter routes");
  const tb = title ? title.getBoundingClientRect() : null;
  const close = panel.querySelector('[aria-label="Close"]');
  const cb = close ? close.getBoundingClientRect() : null;
  const hit = (r) => { const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return e ? (e.getAttribute("aria-label") || e.id || e.tagName) : null; };
  return {
    sheetTop: Math.round(pb.top), sheetH: Math.round(pb.height),
    headerBottom: Math.round(Math.max(nb.bottom, bb.bottom)),
    titleTop: tb && Math.round(tb.top), titleHitTest: tb && hit(tb),
    closeTop: cb && Math.round(cb.top), closeHitTest: cb && hit(cb),
    overlapPx: Math.round(Math.max(nb.bottom, bb.bottom) - pb.top),
  };
});
console.log(JSON.stringify(m, null, 1));
await page.screenshot({ path: "/Users/nathanbarber/.claude/jobs/d9fa6f07/tmp/finder-sheet.png" });
console.log("screenshot -> /Users/nathanbarber/.claude/jobs/d9fa6f07/tmp/finder-sheet.png");
await browser.close();
