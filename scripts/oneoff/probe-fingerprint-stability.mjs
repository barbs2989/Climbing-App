// Does the Home screen sit still when nothing is clicked?
//
// probe-dead-controls' self-test reported its INERT injected button as live, which can only
// mean the fingerprint moves on its own. If it does, every control reads as live and the
// sweep's "18 live, 0 dead" is noise rather than a result. Measure which field moves.
import { chromium } from "playwright-core";
import { settledText } from "../lib/render-settle.mjs";

const BASE = process.argv.find((a) => a.startsWith("--base="))?.slice(7) || "http://localhost:5199/Climbing-App/";
const TAB = process.argv.find((a) => a.startsWith("--tab="))?.slice(6) || "Home";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2 });
await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 180000 });
await page.waitForFunction(() => (document.body?.innerText || "").length > 200, { timeout: 60000 });
await settledText(page, { timeout: 45000 }).catch(() => {});
if (TAB !== "Home") {
  await page.evaluate((t) => {
    const el = [...document.querySelectorAll('button,[role="button"],a,div,span')].find((e) => (e.textContent || "").trim() === t);
    if (el) el.click();
  }, TAB);
  await page.waitForTimeout(1500);
  await settledText(page, { timeout: 30000 }).catch(() => {});
}

const fp = () => page.evaluate(() => ({
  textLen: (document.body.innerText || "").trim().length,
  text: (document.body.innerText || "").trim(),
  nodes: document.querySelectorAll("*").length,
  dialogs: document.querySelectorAll("[role='dialog']").length,
  scroll: Math.round((document.scrollingElement || document.body).scrollTop),
  href: location.href,
  aria: [...document.querySelectorAll("[aria-checked],[aria-expanded],[aria-selected]")]
    .map((e) => (e.getAttribute("aria-checked") || "") + (e.getAttribute("aria-expanded") || "") + (e.getAttribute("aria-selected") || "")).join(","),
}));

console.log(`${TAB}: sampling the page 6 times, 1400ms apart, with NO interaction.\n`);
let prev = await fp();
const moved = { text: 0, nodes: 0, dialogs: 0, scroll: 0, href: 0, aria: 0 };
for (let i = 0; i < 6; i++) {
  await page.waitForTimeout(1400);
  const cur = await fp();
  const diffs = [];
  for (const k of Object.keys(moved)) {
    if (JSON.stringify(prev[k]) !== JSON.stringify(cur[k])) { moved[k]++; diffs.push(k); }
  }
  if (diffs.includes("text")) {
    // Show WHICH lines moved -- a count alone does not say whether this is a clock or a fetch.
    const a = prev.text.split("\n"), b = cur.text.split("\n");
    const gone = a.filter((l) => !b.includes(l)).slice(0, 4);
    const added = b.filter((l) => !a.includes(l)).slice(0, 4);
    console.log(`  sample ${i + 1}: ${diffs.join(",")}  nodes ${prev.nodes}->${cur.nodes}  -${JSON.stringify(gone)} +${JSON.stringify(added)}`);
  } else {
    console.log(`  sample ${i + 1}: ${diffs.length ? diffs.join(",") : "STABLE"}  nodes ${prev.nodes}->${cur.nodes}`);
  }
  prev = cur;
}
console.log("\nfields that moved without any click:");
for (const [k, n] of Object.entries(moved)) console.log(`  ${k.padEnd(8)} ${n}/6 samples`);
await browser.close();
