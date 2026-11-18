// One-off: drive Ranks › By area's picker (src/components/RankAreaPicker.tsx) SIGNED IN, at 390px, against a
// running dev server. Asserts: the card names the area; Change opens a catalog search that ranks a picked hit;
// Up walks to United States, whose states list past the old 24 cap behind "Show all N"; All countries opens the
// picker with no Change; nothing runs off the phone. Creates a throwaway account (service key) and deletes it.
//   node scripts/oneoff/probe-ranks-area-picker.mjs http://localhost:5287/Climbing-App/ [shotDir]
import { chromium } from "playwright-core";
import path from "node:path";
import { createFixture, sessionForStorage, STORAGE_KEY } from "../lib/ui-fixture.mjs";
import { assertQuietBox } from "../lib/quiet-box.mjs";
import { SUPABASE_URL, anonKey } from "../lib/supabase-env.mjs";
import fs from "node:fs";
import { createRequire } from "node:module";
const AXE = fs.readFileSync(createRequire(import.meta.url).resolve("axe-core/axe.min.js"), "utf8");
// check:axe's gate (WCAG 2.2 A/AA) plus label-in-name (2.5.3), run on the picker's own states, which no walk reaches.
async function axeScan(page, where) {
  if (!(await page.evaluate(() => !!window.axe))) await page.addScriptTag({ content: AXE });
  const v = await page.evaluate(async () => {
    const a = await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] }, resultTypes: ["violations"] });
    const b = await window.axe.run(document, { runOnly: { type: "rule", values: ["label-content-name-mismatch"] }, resultTypes: ["violations"] });
    // nested-interactive on the LEADERBOARD ROWS (a role=button row holding the points + report buttons) predates
    // this picker and is reported separately; this probe gates the picker's own controls.
    const lbRow = (n) => { const el = document.querySelector(n.target[0]); return !!(el && /^#\d+, /.test(el.getAttribute("aria-label") || "")); };
    for (const x of [...a.violations, ...b.violations]) x.nodes = x.nodes.filter((n) => !(x.id === "nested-interactive" && lbRow(n)));
    return [...a.violations, ...b.violations].map((x) => ({ id: x.id, nodes: x.nodes.filter((n) => !/partially obscured/.test(n.failureSummary || "")).map((n) => n.target.join(" ") + " [" + ((document.querySelector(n.target[0])||{}).getAttribute?.("aria-label")||"").slice(0,70) + "] — " + (n.failureSummary || "").split("\n").slice(1).join(" ").trim().slice(0, 140)) })).filter((x) => x.nodes.length);
  });
  ok(v.length === 0, "axe: no WCAG A/AA or label-in-name violation " + where + (v.length ? "\n         " + v.map((x) => x.id + ": " + x.nodes.slice(0, 3).join(" | ")).join("\n         ") : ""));
}
assertQuietBox("probe-ranks-area-picker.mjs");

const URL = process.argv[2] || "http://localhost:5173/Climbing-App/";
const SHOTS = process.argv[3] || null;
const fails = [];
const ok = (c, m) => { console.log((c ? "  ok   " : "  FAIL ") + m); if (!c) fails.push(m); };
const fixture = await createFixture(() => {});
// One partner listing, written AS the account (RLS: owner-only), so "Your areas" has something to show.
const uid = fixture.session.user.id;
const asMe = { apikey: anonKey(), Authorization: "Bearer " + fixture.session.access_token, "Content-Type": "application/json", Prefer: "return=representation" };
const ins = await fetch(`${SUPABASE_URL}/rest/v1/partner_areas`, { method: "POST", headers: asMe, body: JSON.stringify({ user_id: uid, area_id: "wa_world_wall", disciplines: ["sport"] }) });
const insRows = await ins.json().catch(() => null);
if (!Array.isArray(insRows) || insRows.length !== 1) console.log("  note: partner listing not stored (" + ins.status + "), Your areas will be skipped");
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
  const mineChip = page.getByRole("button", { name: "Rank World Wall" });
  if (Array.isArray(insRows) && insRows.length === 1) {
    await mineChip.waitFor({ timeout: 30000 }).catch(() => {});
    ok(await mineChip.count() === 1, "Your areas offers the climber's partner listing (World Wall)");
  }
  await page.waitForTimeout(800);
  await shot("2a-open");
  await axeScan(page, "with the picker open");
  await box.fill("index");
  const hit = page.locator('[aria-label^="Index"]').first();
  await hit.waitFor({ timeout: 30000 });
  await shot("2-search");
  await axeScan(page, "with search results showing");
  const hitName = (await hit.getAttribute("aria-label")).split(" · ")[0];
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
  const rows = await page.evaluate(() => [...document.querySelectorAll("button[aria-label]")].filter((b) => /^.+ [\d,]+ climbs?$/.test(b.getAttribute("aria-label"))).length);
  ok(rows === n, "Show all lists every state: " + rows + " of " + n);
  ok(n > 24, "more than the old cap of 24 is reachable (" + n + ")");
  await shot("4-show-all");
  await axeScan(page, "with every state listed");
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  ok(sw <= 390, "nothing runs off a 390px phone (scrollWidth " + sw + ")");
  await page.locator('button[aria-label^="Washington "]').click();
  await page.waitForFunction(() => document.querySelector('[aria-current="location"]')?.textContent === "Washington", null, { timeout: 30000 });
  await page.getByRole("button", { name: /^Show all \d+$/ }).or(page.getByText(/^Inside Washington$/i)).first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(1500);
  await shot("4b-washington");
  await page.locator('button[aria-label="Up to United States"]').click();
  await page.waitForFunction(() => document.querySelector('[aria-current="location"]')?.textContent === "United States", null, { timeout: 30000 });

  await page.locator('button[aria-label="Up to All countries"]').click();
  await page.waitForFunction(() => document.querySelector('[aria-current="location"]')?.textContent === "All countries", null, { timeout: 30000 });
  ok(await page.getByRole("button", { name: "Change the area these rankings cover" }).count() === 0 && await box.count() === 1, "All countries opens with the picker shown and no Change");
  const usRow = page.locator('button[aria-label^="United States "]');
  await usRow.waitFor({ timeout: 30000 }).catch(() => {});
  ok(await usRow.count() === 1 && await page.getByText("Loading areas…").count() === 0, "All countries finishes loading and lists the countries (United States among them)");
  await shot("5-all-countries");
  if (Array.isArray(insRows) && insRows.length === 1) {
    await mineChip.click();
    await page.waitForFunction(() => document.querySelector('[aria-current="location"]')?.textContent === "World Wall", null, { timeout: 30000 });
    ok(true, "tapping the Your areas chip ranks World Wall");
    await page.waitForTimeout(2500);
    await shot("6-world-wall");
  }
  ok(errs.length === 0, "no page errors" + (errs.length ? ": " + errs.join(" | ") : ""));
} finally {
  await browser.close();
  await fetch(`${SUPABASE_URL}/rest/v1/partner_areas?user_id=eq.${uid}`, { method: "DELETE", headers: asMe }).catch(() => {});
  const leaked = await fixture.cleanup().catch((e) => [`cleanup threw: ${e.message}`]);
  if (leaked && leaked.length) console.log("  cleanup: " + leaked.join("; "));
}
console.log(fails.length ? "\nFAIL — " + fails.length : "\nok — every step held");
process.exit(fails.length ? 1 : 0);
