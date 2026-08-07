// End-to-end: open a route whose rack is PROSE, tap the RACK box's Edit, and prove the
// real Suggest-a-fix flow opens at the rack section with the prose seeded and editable.
import { chromium } from "playwright-core";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ID = process.argv[2] || "wa_south_face_7";
const URL = `http://localhost:5199/Climbing-App/?debugRoute=${ID}`;
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 390, height: 780 } });
const errs = [];
page.on("pageerror", (e) => { errs.push(e.message); console.log("PAGEERROR", e.message); });
await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 120000 });
await page.waitForTimeout(7000);

const body = await page.innerText("body");
console.log("route opened:", /South Face|East Buttress|Rack/i.test(body));
// go to the Plan tab, where the RACK box lives
const plan = page.locator('button:has-text("Plan")').first();
if (await plan.count()) { await plan.click(); await page.waitForTimeout(2000); }

// find the RACK box and its edit control
const rackHeading = page.locator('text="RACK"').first();
console.log("RACK box present:", await rackHeading.count() > 0);
const before = await page.innerText("body");
const proseOnScreen = (before.match(/Typically climbed with no protection[^\n]*/) || [""])[0];
console.log("prose rack on screen:", JSON.stringify(proseOnScreen.slice(0, 80)));

const editBtn = page.locator('button[aria-label*="rack correction"], button[aria-label*="Add the rack"]').first();
console.log("rack Edit button found:", await editBtn.count() > 0);
await editBtn.click();
await page.waitForTimeout(2500);

const dlgTxt = await page.evaluate(() => {
  const d = [...document.querySelectorAll('[role="dialog"]')].pop();
  return d ? d.innerText : null;
});
console.log("contribute modal opened:", !!dlgTxt);
const ta = page.locator('textarea[aria-label="Rack description"]').first();
const found = await ta.count() > 0;
console.log("free-text rack field present:", found);
if (found) {
  const v = await ta.inputValue();
  console.log("seeded with current rack:", JSON.stringify(v.slice(0, 90)));
  await ta.fill(v + "\nNo cams needed on the standard line.");
  await page.waitForTimeout(600);
  const after = await ta.inputValue();
  console.log("editable:", after.includes("No cams needed"));
}
await page.screenshot({ path: "/Users/nathanbarber/.claude/jobs/d9fa6f07/tmp/rack-flow.png" });
console.log("page errors:", errs.length);
await browser.close();
