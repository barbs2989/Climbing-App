// What does the PLAN tab actually SAY on a bare route that still shows it?
//
// The live bare-route walk found `Plan` present on bare SCRAMBLING routes (alpine-family
// gating) while absent on bare crag routes. Plan is where #641 lived: `scarfHrs` coerced
// `+distKm||0`, so "no approach data" and "a zero approach" were identical — the tiles added a
// 0.0hr hike leg, the return tile went GREEN, and the "After dark" warning could never fire.
//
// A leak scan cannot see that. It is not a forbidden string; it is a confident number computed
// from nothing. So: dump the tab and look for a time estimate presented without its inputs.
import { chromium } from "playwright-core";

const SITE = "https://barbs2989.github.io/Climbing-App/";
const id = process.argv[2] || "wa_gully_1";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto(`${SITE}?debugRoute=${id}`, { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForTimeout(9000);

const clicked = await page.evaluate(() => {
  const b = [...document.querySelectorAll("button")]
    .filter((e) => { for (let p = e; p; p = p.parentElement) { const q = getComputedStyle(p).position; if (q === "fixed" || q === "sticky") return false; } return true; })
    .find((e) => (e.innerText || "").trim() === "Plan");
  if (!b) return false;
  b.click();
  return true;
});
if (!clicked) { console.log("no Plan tab on this route"); await browser.close(); process.exit(0); }
await page.waitForTimeout(2500);

const txt = await page.innerText("body");
console.log(`=== ${id} — PLAN tab, ${txt.length} chars ===\n`);
console.log(txt.replace(/\n{3,}/g, "\n\n"));

// The #641 fingerprints, stated so a reader can judge rather than trust a verdict.
console.log("\n--- fingerprints ---");
for (const [label, re] of [
  ["a 0.0 / 0h time leg", /\b0(\.0)?\s*(hr|hrs|h)\b/i],
  ["an 'after dark' warning", /after dark/i],
  ["an estimate of any kind", /est\.|estimate|total/i],
  ["says it lacks the data", /no approach|not recorded|unknown|don't know|isn’t recorded|no data/i],
]) console.log(`  ${label.padEnd(28)} ${re.test(txt) ? "PRESENT" : "absent"}`);

await browser.close();
