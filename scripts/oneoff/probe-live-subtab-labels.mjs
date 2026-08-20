// What ARE the route page's sub-tab labels on a live bare route?
// Two guesses ("Reports", "Send Reports") both failed to navigate. Ask the page.
import { chromium } from "playwright-core";
const SITE = "https://barbs2989.github.io/Climbing-App/";
const id = process.argv[2] || "wa_nebula";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
await page.goto(`${SITE}?debugRoute=${id}`, { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForTimeout(9000);

const out = await page.evaluate(() => {
  // The sub-tab bar is a horizontal strip of buttons directly under the header. Report every
  // button's exact innerText plus its computed accessible-ish label, so a mismatch is visible.
  const btns = [...document.querySelectorAll("button")]
    .filter((e) => { for (let p = e; p; p = p.parentElement) { const q = getComputedStyle(p).position; if (q === "fixed" || q === "sticky") return false; } return true; })
    .map((e) => ({
      text: JSON.stringify((e.innerText || "").trim()),
      aria: e.getAttribute("aria-label"),
      cur: e.getAttribute("aria-current"),
      w: Math.round(e.getBoundingClientRect().width),
      y: Math.round(e.getBoundingClientRect().top),
    }))
    .filter((b) => b.text.length > 2 && b.w > 20);
  return btns.slice(0, 18);
});
console.log(`route ${id} — buttons on the page (text | aria-label | aria-current | y):`);
for (const b of out) console.log(`  ${b.text.padEnd(24)} ${String(b.aria || "-").padEnd(22)} ${String(b.cur || "-").padEnd(6)} y=${b.y}`);
await browser.close();
