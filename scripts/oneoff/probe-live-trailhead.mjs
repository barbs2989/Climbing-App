// The point of the write was a card that RENDERS. Check it on the live site, which reads the
// DB directly, so this needs no deploy. A populated column is not a rendered one.
import { chromium } from "playwright-core";
import { WRITE } from "./trailhead-nocard-plan.mjs";

const BASE = process.env.PROBE_URL || "https://barbs2989.github.io/Climbing-App/";
const IDS = (process.env.PROBE_IDS || WRITE.slice(0, 4).map(w => w.id).join(",")).split(",");
const browser = await chromium.launch({ channel: "chrome", headless: true });
let bad = 0;

for (const id of IDS) {
  const e = WRITE.find(w => w.id === id);
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const errs = [];
  page.on("pageerror", x => errs.push(String(x).slice(0, 120)));
  await page.goto(BASE + "?debugRoute=" + id, { waitUntil: "commit", timeout: 90000 });
  let txt = "";
  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(1000);
    txt = await page.evaluate(() => document.body.innerText);
    if (txt.length > 900) break;
  }
  // the trailhead card lives on the Plan tab
  await page.evaluate(() => {
    const b = [...document.querySelectorAll("button,[role='button'],div,span")]
      .filter(x => (x.innerText || "").trim() === "Plan")
      .sort((a, c) => (a.innerText || "").length - (c.innerText || "").length)[0];
    if (b) b.click();
  });
  await page.waitForTimeout(2500);
  const plan = await page.evaluate(() => document.body.innerText);

  // Match a distinctive fragment of the trailhead name (the app may render it whole).
  const frag = e.trailhead.replace(/\s*\(.*$/, "").trim();
  const hasName = plan.includes(frag);
  const hasHead = /TRAILHEAD/i.test(plan);
  const ok = hasName && hasHead && errs.length === 0;
  if (!ok) bad++;
  console.log((ok ? "  ok    " : "  FAIL  ") + id.padEnd(38) +
    " card:" + (hasHead ? "yes" : "NO") + "  name:" + (hasName ? "yes" : "NO") +
    "  chars:" + plan.length + (errs.length ? "  ERRORS:" + errs[0] : ""));
  if (!ok) console.log("        looked for: " + JSON.stringify(frag));
  await page.close();
}
await browser.close();
console.log(bad ? "\n" + bad + " route(s) did not render the card" : "\nevery checked route renders its trailhead card");
process.exit(bad ? 1 : 0);
