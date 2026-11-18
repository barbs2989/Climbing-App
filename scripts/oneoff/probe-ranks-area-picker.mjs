// One-off: drive Ranks › By area's picker (src/components/RankAreaPicker.tsx) SIGNED IN, at 390px, against a
// running dev server. Asserts: the card names the area; Change opens a catalog search that ranks a picked hit;
// Up walks to United States, whose states list past the old 24 cap behind "Show all N"; All countries opens the
// picker with no Change; nothing runs off the phone. Creates a throwaway account (service key) and deletes it.
//   node scripts/oneoff/probe-ranks-area-picker.mjs http://localhost:5287/Climbing-App/ [shotDir]
import { chromium } from "playwright-core";
import path from "node:path";
import { createFixture, sessionForStorage, STORAGE_KEY } from "../lib/ui-fixture.mjs";
import { assertQuietBox } from "../lib/quiet-box.mjs";
assertQuietBox("probe-ranks-area-picker.mjs");

const URL = process.argv[2] || "http://localhost:5173/Climbing-App/";
const SHOTS = process.argv[3] || null;
const fails = [];
const ok = (c, m) => { console.log((c ? "  ok   " : "  FAIL ") + m); if (!c) fails.push(m); };
const fixture = await createFixture(() => {});
const browser = await chromium.launch({ channel: "chrome", headless: true, timeout: 120000 });
try {
  const page = await browser.newPage({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2 });
  const errs = [];
  page.on("pageerror", (e) => errs.push(e.message));
  await page.addInitScript(({ key, value }) => { try { localStorage.setItem(key, value); } catch {} }, { key: STORAGE_KEY, value: JSON.stringify(sessionForStorage(fixture.session)) });
  await page.goto(URL, { waitUntil: "domcontentloaded" });
  const shot = async (n) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, n + ".png") }); };
  const card = () => page.locator('[aria-current="location"]').first();
  const tapText = (t) => page.evaluate((tt) => { const e = [...document.querySelectorAll('button,[role="button"],a')].filter((x) => (x.textContent || "").trim() === tt).sort((a, b) => Number(!!b.closest('[aria-label="Primary"]')) - Number(!!a.closest('[aria-label="Primary"]')))[0]; if (e) e.click(); return !!e; }, t);
  let tapped = false;
  for (let i = 0; i < 60 && !tapped; i++) { tapped = await tapText("Ranks"); if (!tapped) await page.waitForTimeout(1000); }
  if (!tapped) { await shot("0-no-ranks"); throw new Error("no Ranks control: " + (await page.evaluate(() => document.body.innerText.slice(0, 400)))); }
  await page.getByRole("button", { name: "By area", exact: true }).click({ timeout: 30000 });
  await page.getByText("Ranking in", { exact: false }).first().waitFor({ timeout: 30000 });
  const first = await card().textContent();
  ok(first === "United States" || first === "Loading…", "while the path loads the card says Loading… or the name (" + first + "), never \"this area\"");
  ok(await page.getByRole("button", { name: "Change the area these rankings cover" }).count() === 1, "a loading path does not read as All countries: Change is there and the picker is shut");
  await page.waitForFunction(() => document.querySelector('[aria-current="location"]')?.textContent === "United States", null, { timeout: 30000 });
  ok(true, "the card names United States");
  await shot("1-card");

  await page.getByRole("button", { name: "Change the area these rankings cover" }).click();
  const box = page.getByLabel("Search any crag, peak or area");
  ok(await box.count() === 1, "Change opens the catalog search");
  await box.fill("index");
  const hit = page.locator('[aria-label^="Index"]').first();
  await hit.waitFor({ timeout: 30000 });
  await shot("2-search");
  const hitName = (await hit.getAttribute("aria-label")).split(",")[0];
  await hit.click();
  await page.waitForFunction((n) => document.querySelector('[aria-current="location"]')?.textContent === n, hitName, { timeout: 30000 });
  ok(true, "picking \"" + hitName + "\" ranks it");
  ok(await box.count() === 0, "the picker closes after a search pick");
  await page.getByText(/Climbers who have logged climbs in/).first().waitFor({ timeout: 30000 });
  await shot("3-picked");

  await page.getByRole("button", { name: "Change the area these rankings cover" }).click();
  for (let g = 0; g < 8 && (await card().textContent()) !== "United States"; g++) {
    const before = await card().textContent();
    await page.locator('button[aria-label^="Up to "]').click();
    await page.waitForFunction((b) => document.querySelector('[aria-current="location"]')?.textContent !== b, before, { timeout: 30000 });
  }
  ok((await card().textContent()) === "United States", "Up walks back to United States");
  const more = page.getByRole("button", { name: /^Show all \d+$/ });
  await more.waitFor({ timeout: 30000 });
  const n = +((await more.textContent()).match(/\d+/)[0]);
  await more.click();
  const rows = await page.evaluate(() => [...document.querySelectorAll("button[aria-label]")].filter((b) => /^[^,]+, [\d,]+ climbs?$/.test(b.getAttribute("aria-label"))).length);
  ok(rows === n, "Show all lists every state: " + rows + " of " + n);
  ok(n > 24, "more than the old cap of 24 is reachable (" + n + ")");
  await shot("4-show-all");
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  ok(sw <= 390, "nothing runs off a 390px phone (scrollWidth " + sw + ")");

  await page.locator('button[aria-label="Up to All countries"]').click();
  await page.waitForFunction(() => document.querySelector('[aria-current="location"]')?.textContent === "All countries", null, { timeout: 30000 });
  ok(await page.getByRole("button", { name: "Change the area these rankings cover" }).count() === 0 && await box.count() === 1, "All countries opens with the picker shown and no Change");
  await shot("5-all-countries");
  ok(errs.length === 0, "no page errors" + (errs.length ? ": " + errs.join(" | ") : ""));
} finally {
  await browser.close();
  const leaked = await fixture.cleanup().catch((e) => [`cleanup threw: ${e.message}`]);
  if (leaked && leaked.length) console.log("  cleanup: " + leaked.join("; "));
}
console.log(fails.length ? "\nFAIL — " + fails.length : "\nok — every step held");
process.exit(fails.length ? 1 : 0);
