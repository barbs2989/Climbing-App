// Hand-run walk of LATEST FROM THIS AREA's see-more / sort / filter / open-the-report behaviour (0478),
// against a dev server that is ALREADY running on the real database:
//
//   npx vite --port 5483 --strictPort        # in another shell, with .env.local present
//   node scripts/oneoff/probe-area-latest-more.mjs [--base http://localhost:5483/Climbing-App/] [--shots DIR]
//
// It signs in as nobody (View as guest): the card reads public reports only. The expected counts are
// the 16 TEST example reports written under Leavenworth, WA on 2026-11-19 (five sport, four trad,
// three bouldering, two ice, one top rope, one alpine; nine with a write-up, seven without). If
// those rows are removed, the counts below are wrong and the walk says so; it is not a build guard.
// The rows are PUBLIC and marked TEST, so every climber sees them on the Leavenworth pages while they
// exist: create them, walk, then remove them (area-latest-examples.mjs create / remove). The date filters drift as the rows age (the
// counts are from 2026-11-19), so a "Last 30 / 90 days" miss on a later day is the calendar, not a bug.
import { chromium } from "playwright-core";
import path from "node:path";
import { assertQuietBox } from "../lib/quiet-box.mjs";

// A browser verdict from an oversubscribed box is not evidence either way; --anyway runs regardless.
assertQuietBox("probe-area-latest-more.mjs");

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const BASE = arg("--base", "http://localhost:5483/Climbing-App/");
const SHOTS = arg("--shots", null);
const WIDTH = Number(arg("--width", "390"));
const TRAIL = (arg("--trail", "Washington>Central-East Cascades, Wenatchee & Leavenworth>Leavenworth")).split(">");

let bad = 0;
const ok = (name, cond, detail) => { console.log((cond ? "  ok    " : "  FAIL  ") + name + (detail ? " — " + detail : "")); if (!cond) bad++; };

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: WIDTH, height: 844 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e).slice(0, 200)));
const shot = async (name) => { if (SHOTS) await page.screenshot({ path: path.join(SHOTS, name + ".png"), fullPage: false }); };
const wait = (ms) => page.waitForTimeout(ms);

await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 120000 });
// A local dev server opens straight into the app as a guest; a build with the login screen first needs the tap.
await page.getByRole("button", { name: /^Climbs/i }).first().waitFor({ timeout: 20000 }).catch(() => page.getByRole("button", { name: /guest/i }).first().click({ timeout: 40000 }));
await wait(1500);
await page.getByRole("button", { name: /^Climbs/i }).first().click({ timeout: 30000 }).catch(async () => { await page.getByText(/^Climbs$/).first().click(); });
await wait(2500);

// Drill the area browser by row name.
const clickRow = (name) => page.evaluate((n) => {
  const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
  // Rows in the page first: on a phone the fixed bottom bar must not take the click. The website draws
  // an area's sub-areas in a fixed side panel, so when the page has no such row, that panel's row is it.
  const pinned = (e) => { for (let p = e; p; p = p.parentElement) { const q = getComputedStyle(p).position; if (q === "fixed" || q === "sticky") return true; } return false; };
  const all = [...document.querySelectorAll("[role=button], button, a")].filter((e) => norm(e.innerText).startsWith(n));
  const els = all.some((e) => !pinned(e)) ? all.filter((e) => !pinned(e)) : all;
  if (!els.length) return false;
  els.sort((a, b) => norm(a.innerText).length - norm(b.innerText).length);
  els[0].click();
  return true;
}, name);
for (const step of TRAIL) {
  let hit = false;
  for (let i = 0; i < 20 && !hit; i++) { hit = await clickRow(step); if (!hit) await wait(700); }
  if (!hit) { console.log("could not find the row \"" + step + "\". On screen:\n" + (await page.innerText("body")).slice(0, 1500)); await browser.close(); process.exit(2); }
  await wait(2200);
}

const card = page.locator("section[aria-label^='Latest from']");
await card.waitFor({ timeout: 60000 });
await card.scrollIntoViewIfNeeded();
await wait(1500);
const settle = async () => { await wait(400); await page.waitForFunction(() => { const s = document.querySelector("section[aria-label^='Latest from']"); return s && !/Updating…/.test(s.innerText) && ![...s.querySelectorAll("div")].some((d) => d.style.opacity === "0.55"); }, null, { timeout: 30000 }).catch(() => {}); await wait(300); };
const rowsNow = () => card.locator("button", { hasText: /^View (trip report|logged climb)$/ }).count();
const text = () => card.innerText();
const titles = () => card.evaluate((s) => [...s.querySelectorAll("button")].filter((b) => /^View (trip report|logged climb)$/.test(b.innerText.trim())).map((b) => (b.getAttribute("aria-label") || "").replace(/^View (trip report|logged climb): /, "")));
const dates = () => card.evaluate((s) => [...s.querySelectorAll("div")].filter((d) => /^(Trip report|Logged climb) · /.test(d.innerText.trim()) && !d.children.length).map((d) => d.innerText.trim()));
const sel = (label) => card.locator("select[aria-label='" + label + "']");

console.log("\nLATEST FROM THIS AREA at " + TRAIL[TRAIL.length - 1] + ", " + WIDTH + "px");
await shot("1-collapsed");
ok("four rows before the dropdown", (await rowsNow()) === 4, (await rowsNow()) + " rows");
ok("four selects are offered", (await card.locator("select").count()) === 4);
ok("the dropdown counts the rest", /See 12 more/.test(await text()), ((await text()).match(/See \d+ more/) || ["none"])[0]);
const toggle = card.locator("button[aria-expanded]");
// 44px is the phone's touch target; the website draws the same control at 38px on purpose (lib/wideLayout.js).
const minTall = WIDTH < 700 ? 44 : 38;
const tall = (await toggle.boundingBox()).height;
ok("the dropdown is " + minTall + "px tall or more and says it is closed", tall >= minTall && (await toggle.getAttribute("aria-expanded")) === "false", Math.round(tall) + "px");
const firstNewest = (await dates())[0];
ok("newest first by default", /Nov 15/.test(firstNewest), firstNewest);

await toggle.click(); await settle();
ok("open: fourteen rows and Show fewer", (await rowsNow()) === 14 && (await toggle.getAttribute("aria-expanded")) === "true" && /Show fewer/.test(await text()), (await rowsNow()) + " rows");
ok("offers the last two", /Show 2 more/.test(await text()));
await shot("2-open");
await card.getByRole("button", { name: "Show 2 more" }).click(); await settle();
ok("all sixteen, and no further button", (await rowsNow()) === 16 && !/Show \d+ more/.test(await text()), (await rowsNow()) + " rows");
await toggle.click(); await settle();
ok("Show fewer folds back to four", (await rowsNow()) === 4 && /See 12 more/.test(await text()));

await sel("Sort the latest reports").selectOption("oldest"); await settle();
const firstOldest = (await dates())[0];
ok("oldest first", /Jul 4, 2025/.test(firstOldest), firstOldest);
await sel("Sort the latest reports").selectOption("newest"); await settle();

const discOpts = await sel("Filter the latest reports by discipline").evaluate((s) => [...s.options].map((o) => o.label));
ok("discipline options carry counts, most first", discOpts.join("|") === "All disciplines|Sport (5)|Trad (4)|Bouldering (3)|Ice (2)|Alpine (1)|Top rope (1)", discOpts.join("|"));
await sel("Filter the latest reports by discipline").selectOption("trad"); await settle();
ok("Trad: 4 of 16, every row says Trad, no dropdown", /4 of 16 match/.test(await text()) && (await rowsNow()) === 4 && (await dates()).every((d) => / · Trad$/.test(d)) && (await toggle.count()) === 0, (await dates()).join(" / "));
await sel("Filter the latest reports by discipline").selectOption("sport"); await settle();
ok("Sport: 5 of 16, See 1 more", /5 of 16 match/.test(await text()) && /See 1 more/.test(await text()));
await shot("3-sport");
await sel("Show trip reports, logged climbs or both").selectOption("log"); await settle();
ok("Sport + logged climbs only: 3, none is a trip report", /3 of 16 match/.test(await text()) && (await dates()).length === 3 && (await dates()).every((d) => /^Logged climb/.test(d)), (await dates()).join(" / "));
await sel("Filter the latest reports by the date climbed").selectOption("30"); await settle();
ok("…in the last 30 days: 1", /1 of 16 match/.test(await text()) && (await rowsNow()) === 1, (await titles()).join());
await sel("Filter the latest reports by discipline").selectOption("ice"); await settle();
ok("Ice in the last 30 days: says nothing matches", /Nothing here matches these filters/.test(await text()) && (await rowsNow()) === 0);
await shot("4-none");
await card.getByRole("button", { name: "Clear filters" }).click(); await settle();
ok("Clear filters restores all", (await rowsNow()) === 4 && /See 12 more/.test(await text()) && !/match/.test(await text()));
await sel("Filter the latest reports by the date climbed").selectOption("90"); await settle();
ok("Last 90 days: 10 of 16", /10 of 16 match/.test(await text()) && /See 6 more/.test(await text()));
await card.getByRole("button", { name: "Clear filters" }).click(); await settle();

// A row opens the report itself, over the area page.
const areaTitleBefore = await page.evaluate(() => document.querySelector("section[aria-label^='Latest from']") !== null);
await card.getByRole("button", { name: /^View trip report: / }).first().click();
await wait(2500);
const dlg = page.locator("[role=dialog]").last();
const dlgText = await dlg.innerText().catch(() => "");
ok("View trip report opens the report, with its write-up", /Good Gravy/.test(dlgText) && /Cold fingers but the rock was dry by noon/.test(dlgText), dlgText.replace(/\s+/g, " ").slice(0, 110));
await shot("5-report");
ok("…over the area page, not the route page", areaTitleBefore && (await page.evaluate(() => document.querySelector("section[aria-label^='Latest from']") !== null)));
await page.keyboard.press("Escape"); await wait(900);
if (await page.locator("[role=dialog]").count()) { await page.locator("[role=dialog] button[aria-label*='lose']").first().click().catch(() => {}); await wait(900); }
ok("closing the report returns to the card", (await card.count()) === 1 && (await page.locator("[role=dialog]").count()) === 0);

await card.getByRole("button", { name: /^View logged climb: / }).first().click();
await wait(2500);
const logText = await page.locator("[role=dialog]").last().innerText().catch(() => "");
ok("View logged climb opens that log", /14 Years/.test(logText), logText.replace(/\s+/g, " ").slice(0, 110));
await shot("6-log");
await page.keyboard.press("Escape"); await wait(900);
if (await page.locator("[role=dialog]").count()) { await page.locator("[role=dialog] button[aria-label*='lose']").first().click().catch(() => {}); await wait(900); }

// Tapping the row body is the same as its View button.
await card.locator("[role=button][aria-label^='View trip report: ']").first().click();
await wait(2500);
ok("tapping the row itself opens the report too", /Good Gravy/.test(await page.locator("[role=dialog]").last().innerText().catch(() => "")));
await page.keyboard.press("Escape"); await wait(900);
if (await page.locator("[role=dialog]").count()) { await page.locator("[role=dialog] button[aria-label*='lose']").first().click().catch(() => {}); await wait(900); }

await card.getByRole("button", { name: "Open the route page for Good Gravy" }).first().click();
// The route page's own sub-tab bar is what says "this is the route page"; wait for it rather than a fixed delay.
await page.getByRole("button", { name: /^Overview/ }).first().waitFor({ timeout: 30000 }).catch(() => {});
const body = await page.innerText("body");
ok("Route page opens the climb", /Good Gravy/.test(body) && /Overview/.test(body) && /Route facts/i.test(body) && (await page.locator("[role=dialog]").count()) === 0, body.replace(/\s+/g, " ").slice(0, 90));
await shot("7-route");
const over = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
ok("nothing runs off the right edge", !over);
ok("no page errors", errors.length === 0, errors.join(" | "));

await browser.close();
console.log(bad ? "\n" + bad + " FAILED" : "\nall passed");
process.exit(bad ? 1 : 0);
