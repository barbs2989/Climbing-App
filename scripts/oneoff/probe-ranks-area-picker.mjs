// One-off: drive Ranks › By area (src/components/RankAreaPicker.tsx) SIGNED IN, at 390px, against a running dev
// server. Asserts: the card names the area; Change opens the Choose-an-area PAGE in place of the board, laid out as
// the Climbs tab is (state cards A to Z, then the area page’s own sub-area list with its Sort); walking it ranks
// nothing until See rankings; the path links jump up; a search hit and a Your areas chip rank at once; Back leaves
// it unchanged; nothing runs off the phone. Creates a throwaway account (service key) and deletes it.
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
    // The leaderboard rows' nested-interactive, excused here when this probe was written, is fixed
    // (probe-ranks-row-a11y.mjs), so nothing on the page is excused any more.
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
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 180000 });
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

  const change = page.getByRole("button", { name: "Change the area these rankings cover" });
  const title = () => page.locator('h2[tabindex="-1"]').first();
  const onLevel = (n) => page.waitForFunction((nn) => document.querySelector('h2[tabindex="-1"]')?.textContent === nn, n, { timeout: 30000 });
  const ranking = (n) => page.waitForFunction((nn) => document.querySelector('[aria-current="location"]')?.textContent === nn, n, { timeout: 30000 });
  const boardShown = () => page.getByLabel("Ranking discipline").count();
  const seeBtn = (n) => page.getByRole("button", { name: "See rankings for " + n, exact: true });
  const pathLink = (n) => page.locator('nav[aria-label="Area path"] button', { hasText: n }).first();
  ok(await boardShown() === 1, "the board is under the card");

  await change.click();
  await onLevel("United States");
  ok(await page.evaluate(() => document.activeElement === document.querySelector('h2[tabindex="-1"]')), "opening the page puts focus on the area's name, not nowhere");
  const box = page.getByLabel("Search any crag, peak or area");
  ok(await box.count() === 1, "Change opens the Choose-an-area page, with the catalog search");
  ok(await boardShown() === 0, "the page stands in place of the board, not above it");
  ok(await seeBtn("United States").count() === 1, "the page's header offers See rankings for United States");
  const mineChip = page.getByRole("button", { name: "Rank World Wall" });
  if (Array.isArray(insRows) && insRows.length === 1) {
    await mineChip.waitFor({ timeout: 30000 }).catch(() => {});
    ok(await mineChip.count() === 1, "Your areas offers the climber's partner listing (World Wall)");
  }
  await page.getByRole("heading", { name: "Pick a state" }).waitFor({ timeout: 30000 });
  const cardNames = () => page.evaluate(() => [...document.querySelectorAll("button")].filter((b) => /\d climbs?$/.test((b.textContent || "").trim()) && b.children.length === 2).map((b) => b.children[0].textContent));
  await page.waitForFunction(() => [...document.querySelectorAll("button")].some((b) => /^Washington[\d,]+ climbs$/.test((b.textContent || "").trim())), null, { timeout: 30000 });
  const states = await cardNames();
  ok(states.length > 24, "every state is a card, past the old cap of 24 (" + states.length + ")");
  ok(states.join("|") === [...states].sort((x, y) => x.localeCompare(y)).join("|") && states[0] === "Alabama", "the states read A to Z, as the Climbs tab lists them (first: " + states[0] + ")");
  const backs = await page.evaluate(() => [...document.querySelectorAll("button")].filter((b) => /Back to rankings/.test(b.getAttribute("aria-label") || b.textContent || "")).map((b) => { const r = b.getBoundingClientRect(); return { shown: r.width > 0 && r.height > 0, y: Math.round(r.top) }; }));
  ok(backs.filter((x) => x.shown).length === 1 && backs.filter((x) => x.shown)[0].y < 110, "one Back to rankings is drawn, in the phone's top bar (" + JSON.stringify(backs) + ")");
  await page.waitForTimeout(800);
  await shot("2a-page-united-states");
  await axeScan(page, "on the Choose-an-area page (state cards)");

  // The header between the tap and the path landing, sampled every frame: it must never name the root for the area below it.
  await page.evaluate(() => { window.__h2 = []; const t = setInterval(() => { const e = document.querySelector('h2[tabindex="-1"]'); if (e) window.__h2.push(e.textContent); }, 16); window.__h2stop = () => clearInterval(t); });
  await page.locator("button", { hasText: /^Washington[\d,]+ climbs$/ }).click();
  await onLevel("Washington");
  const seen = await page.evaluate(() => { window.__h2stop(); return [...new Set(window.__h2)]; });
  ok(seen.every((x) => ["United States", "Loading…", "Washington"].includes(x)), "while Washington's path loads the header never reads All countries (saw: " + seen.join(" ; ") + ")");
  ok((await card().count()) === 0 && await boardShown() === 0, "walking to Washington stays on the page and ranks nothing yet");
  const sort = page.getByLabel("Sort areas");
  await sort.waitFor({ timeout: 30000 });
  ok(await sort.inputValue() === "az", "below a state the Climbs area list is used, with its Sort, A to Z first");
  const rowNames = () => page.evaluate(() => [...document.querySelectorAll('[role="button"]')].filter((b) => /View area/.test(b.textContent || "")).map((b) => (b.querySelector("span span") || b).textContent));
  const rows = await rowNames();
  const headN = +((await page.getByRole("heading", { name: /^Areas \(\d+\)$/i }).first().textContent()).match(/\d+/)[0]);
  ok(rows.length === headN && rows.length > 0, "every area inside Washington is a row: " + rows.length + " of " + headN);
  ok(await pathLink("United States").count() === 1 && await pathLink("All countries").count() === 1, "the header's path links every level above");
  await page.waitForTimeout(1500);
  await shot("2b-page-washington");
  await axeScan(page, "on the Choose-an-area page (area rows)");
  const sw = await page.evaluate(() => document.documentElement.scrollWidth);
  ok(sw <= 390, "nothing runs off a 390px phone (scrollWidth " + sw + ")");

  await page.locator('[role="button"]', { hasText: rows[0] }).first().click();
  await onLevel(rows[0]);
  await seeBtn(rows[0]).click();
  await ranking(rows[0]);
  ok(await boardShown() === 1 && await box.count() === 0, "See rankings for \"" + rows[0] + "\" ranks it and returns to the board");
  await page.getByText(/Climbers who have logged climbs in/).first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(1500);
  await shot("3-ranked");

  await change.click();
  await onLevel(rows[0]);
  ok(true, "Change reopens the page on the area being ranked");
  await pathLink("Washington").click();
  await onLevel("Washington");
  await page.evaluate(() => [...document.querySelectorAll("button")].filter((b) => /Back to rankings/.test(b.getAttribute("aria-label") || b.textContent || "")).pop().click());
  await ranking(rows[0]);
  ok(await boardShown() === 1, "Back leaves the page without changing the ranked area (" + rows[0] + ")");
  ok(await page.evaluate(() => (document.activeElement?.getAttribute("aria-label") || "") === "Change the area these rankings cover"), "leaving the page hands focus back to Change");

  await change.click();
  await onLevel(rows[0]);
  await box.fill("index");
  const hit = page.locator('[aria-label^="Index"]').first();
  await hit.waitFor({ timeout: 30000 });
  await shot("4-search");
  await axeScan(page, "with search results showing");
  const hitName = (await hit.getAttribute("aria-label")).split(" · ")[0];
  await hit.click();
  await ranking(hitName);
  ok(await boardShown() === 1, "picking the search hit \"" + hitName + "\" ranks it at once");

  await change.click();
  await onLevel(hitName);
  await pathLink("All countries").click();
  await onLevel("All countries");
  await page.getByRole("heading", { name: "Pick a country" }).waitFor({ timeout: 30000 });
  await page.locator("button", { hasText: /^United States[\d,]+ climbs$/ }).waitFor({ timeout: 30000 });
  ok(await page.getByRole("button", { name: /^See rankings for/ }).count() === 0, "All countries lists the countries and offers no See rankings (it ranks nothing)");
  await shot("5-all-countries");
  if (Array.isArray(insRows) && insRows.length === 1) {
    await mineChip.click();
    await ranking("World Wall");
    ok(true, "tapping the Your areas chip ranks World Wall");
    await change.click();
    await onLevel("World Wall");
    await page.getByText(/No smaller areas inside World Wall/).waitFor({ timeout: 30000 });
    ok(true, "a wall with nothing inside says so, and still offers See rankings and its path");
    await shot("6-leaf");
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
