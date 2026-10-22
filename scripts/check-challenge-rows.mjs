// Do the Challenges tick-list rows say anything true?
//
// THE FAILURE THIS EXISTS FOR, shipped by me across #849/#857/#866/#879 and found only by reading
// the code afterwards. Seven peak rosters were added — 185 objectives — and every single row
// rendered the literal text `undefined · undefined`.
//
// The row's meta is `{(ct.label||catOf(r))+" · "+r.grade}`. It CONCATENATES, so a missing field is
// not blank, it is the five characters "undefined". React swallows a bare `{undefined}`; it does
// not swallow `"" + undefined`. Peak objectives are areas — they have no `discipline` and no
// `grade` — so the whole list read as broken data. Same class as the `undefined · 0` rows fixed in
// #715 and #876; this is the third instance, which is why it now gets a script rather than care.
//
// A second defect rode along: the row's own tick was `got(r.id)`, which matches a LOGGED ROUTE
// id, while a peak objective carries an AREA id. So a card header could read `1 / 18` while the
// very row it counted showed an empty circle.
//
// WHY NOTHING CAUGHT IT, and the gap is structural rather than an oversight. Every other browser
// guard reaches overlays through the `?z=` opener, which injects into App's state. `showLists` is
// local state INSIDE the Challenges component, so no URL can open it — the same blind spot
// check:overlay-discovery already records for RouteDetail's five overlays. check:zero walked six
// tabs and 45 overlays and passed, because it never opened the panel where these rows live.
//
// So this guard does the one thing the others cannot: it clicks through to the panel and reads it.
import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertDbReachable } from "./lib/db-preflight.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PORT = 5370;
const log = (m) => console.log(m);

async function claimPort(start, span = 40) {
  for (let p = start; p < start + span; p++) {
    const free = await new Promise((resolve) => {
      const probe = net.createServer();
      probe.once("error", () => resolve(false));
      probe.once("listening", () => probe.close(() => resolve(true)));
      probe.listen(p, "127.0.0.1");
    });
    if (free) return p;
  }
  return null;
}

await assertDbReachable({ label: "check:challenge-rows" });
const port = await claimPort(PORT);
if (port === null) { console.error(`no free port in ${PORT}-${PORT + 39}`); process.exit(1); }
if (port !== PORT) log(`  port ${PORT} is in use — using ${port} instead`);
const base = `http://127.0.0.1:${port}/Climbing-App/`;
log(`starting dev server on ${port}...`);
// Borrow the a11y-badges config: same populated demo, same opener, so this cannot drift on which
// screens exist.
const server = spawn("npx", ["vite", "--config", "scripts/a11y-badges.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"], detached: true, env: { ...process.env, VITE_DEMO_AUTOLOGIN: "true" } });
let died = false;
server.on("exit", () => { died = true; });
let stopped = false;
const stopServer = () => { if (stopped) return; stopped = true; try { process.kill(-server.pid, "SIGTERM"); } catch { try { server.kill(); } catch {} } };
process.on("exit", stopServer);
process.on("SIGINT", () => { stopServer(); process.exit(130); });
process.on("SIGTERM", () => { stopServer(); process.exit(143); });
process.on("uncaughtException", (e) => { console.error(e); stopServer(); process.exit(1); });
let up = false;
for (let i = 0; i < 60; i++) {
  if (died) break;
  try { const r = await fetch(base); if (r.ok) { up = true; break; } } catch {}
  await new Promise((r) => setTimeout(r, 2000));
}
if (!up || died) { console.error(died ? "the dev server exited during startup" : "dev server never came up"); stopServer(); process.exit(1); }

let browser;
try { browser = await chromium.launch({ channel: "chrome", headless: true }); }
catch (e) { console.error("could not launch Google Chrome: " + String(e.message).split("\n")[0]); stopServer(); process.exit(1); }
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
page.setDefaultNavigationTimeout(120000);

const fail = [];
try {
  await page.goto(base + "?zt=logbook", { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(2500);

  // Reach the Challenges sub-tab by its visible text.
  const tapText = async (t) => page.evaluate((txt) => {
    const els = [...document.querySelectorAll("button,div,span")];
    const hit = els.reverse().find(e => e.textContent && e.textContent.trim() === txt && e.getBoundingClientRect().width > 0);
    if (hit) { hit.click(); return true; }
    return false;
  }, t);

  if (!(await tapText("Challenges"))) fail.push("could not reach the Challenges sub-tab — this guard verified nothing");
  await page.waitForTimeout(1500);

  // Open the full list panel. Every list chip sets the same `showLists` state, so any one will do;
  // prefer a ROSTER-backed list because those are the rows this guard is about.
  const opened = await page.evaluate(() => {
    const els = [...document.querySelectorAll("span,div,button")];
    const hit = els.find(e => /^(The Bulgers|Desert Towers|Cascade Volcanoes|Colorado 14ers)\b/.test((e.textContent || "").trim()) && e.getBoundingClientRect().width > 0);
    if (hit) { hit.click(); return (hit.textContent || "").trim().slice(0, 40); }
    return null;
  });
  if (!opened) fail.push("no roster-backed list chip on screen — nothing to open");
  else log(`  opened via chip: ${opened}`);
  await page.waitForTimeout(2000);

  // OPENING THE PANEL IS NOT ENOUGH, and the first draft of this guard got that wrong — it read
  // the panel, found no "undefined", and reported ok against the very code it was written to
  // catch. The rows are gated a second time on `isOpen = open===L.key`, so each list CARD has to
  // be expanded before a single row exists. Both runs printed an identical 1362 chars, which is
  // what a guard measuring nothing looks like.
  const before = (await page.evaluate(() => document.body.innerText || "")).length;
  const expanded = await page.evaluate(() => {
    const want = /^(The Bulgers|Desert Towers|Cascade Volcanoes|Colorado 14ers|National Park Highpoints)/;
    const els = [...document.querySelectorAll("div")];
    // The card's own header is the click target; take the SMALLEST matching node so the click
    // lands on the header rather than an ancestor that wraps every card.
    const hits = els.filter(e => want.test((e.textContent || "").trim()) && e.getBoundingClientRect().width > 0);
    const hit = hits.sort((a, b) => (a.textContent || "").length - (b.textContent || "").length)[0];
    if (!hit) return null;
    hit.click();
    return (hit.textContent || "").trim().slice(0, 40);
  });
  if (!expanded) fail.push("could not expand a roster-backed list card — no rows to read");
  else log(`  expanded card: ${expanded}`);
  await page.waitForTimeout(1500);

  const text = await page.evaluate(() => document.body.innerText || "");
  log(`  panel text: ${before} -> ${text.length} chars`);

  // Fails CLOSED, twice over. A panel that never opened has no rows, and "no rows" must not read
  // as "no undefined" — that is precisely how this bug survived four merges AND how this guard's
  // own first draft passed on broken code. Expanding a list must MAKE THE PAGE GROW; if it does
  // not, nothing was measured.
  if (text.length < 400) fail.push(`the list panel does not look open (${text.length} chars) — refusing to report a clean scan`);
  if (text.length <= before) fail.push(`expanding the list added no text (${before} -> ${text.length}) — the rows never rendered, so this run proves nothing`);

  for (const bad of ["undefined", "NaN", "[object Object]", "null ·"]) {
    if (text.includes(bad)) {
      const at = text.indexOf(bad);
      fail.push(`the list panel renders "${bad}" — context: ${JSON.stringify(text.slice(Math.max(0, at - 60), at + 40))}`);
    }
  }

  // A peak row's meta is its elevation. Seeing one proves the peak branch is actually taken,
  // rather than the panel happening to show only route-backed lists.
  if (!/\d{1,3},\d{3} ft|\d{1,3},\d{3} m/.test(text)) {
    fail.push("no elevation on any row — the peak branch never rendered, so this run proves nothing about peak objectives");
  }

  /* A CARD MUST NOT ADVERTISE A TOTAL IT CAN NEVER REACH. Colorado is the only list with a
     permanent ceiling: the standard roster is 53 and Mount Bross is excluded on purpose, because
     its summit is privately owned and closed to the public (0146). While `total` stayed 53 the
     card read `0 / 53`, `cpl` is `d>=t` so it could never say Complete, and the gap rendered as
     "+ 1 more on the full list — fills in as the catalog grows" — a promise about a summit nobody
     is allowed to stand on. Desert Towers hit the same thing and the TOTAL was corrected (30->27);
     this asserts Colorado stays corrected too, and that the reason is on screen rather than
     leaving 52 unexplained.

     Expanded separately from the card above, because that one takes whichever roster card sorts
     shortest — it is not guaranteed to be this one, and a guard that might look at the right card
     is not a guard. */
  const co = await page.evaluate(() => {
    const els = [...document.querySelectorAll("div")];
    const hits = els.filter(e => /^Colorado 14ers/.test((e.textContent || "").trim()) && e.getBoundingClientRect().width > 0);
    const hit = hits.sort((a, b) => (a.textContent || "").length - (b.textContent || "").length)[0];
    if (!hit) return null;
    hit.click();
    return true;
  });
  if (!co) fail.push("no Colorado 14ers card on screen — its ceiling copy was not checked");
  else {
    await page.waitForTimeout(1200);
    const t2 = await page.evaluate(() => document.body.innerText || "");
    if (/fills in as the catalog grows/i.test(t2)) {
      fail.push('the Colorado card says the missing peak "fills in as the catalog grows" — Mount Bross is closed to the public and is never being added');
    }
    if (/\/\s*53\b/.test(t2)) fail.push("the Colorado card advertises 53, a total only 52 achievable peaks can reach");
    if (!/Mount Bross/i.test(t2)) fail.push("the Colorado card does not name Mount Bross, so its 52 is unexplained");
    if (!/closed to the public/i.test(t2)) fail.push("the Colorado card does not say why Mount Bross is excluded");
  }

  /* NO ROW'S TEXT MAY RUN INTO ANOTHER'S, IN ANY LIST, ON A PHONE. The owner saw Liberty Crack and
     Liberty Ridge print over their own facts in the Fifty Classics list: the name was a one-line
     flex item and the "Alpine · grade" column refused to shrink, so a long grade pushed the name
     under it. #2575 let both columns wrap (facts capped at 45%); this measures that it holds.
     Every list card is expanded in turn, at 390 and at 320px, and every text run's own box in a
     row is compared with every other one in that row, and with the row's right edge — reading the
     boxes, not the text, because overlapping text is still all there in innerText.
     Fails closed: a card that expands to no rows, or a Fifty Classics list without Liberty Crack,
     means nothing was measured. */
  const geometry = async () => page.evaluate(() => {
    const dlg = [...document.querySelectorAll('[role="dialog"]')].find(d => /Challenges & Lists/.test(d.textContent || ""));
    if (!dlg) return { rows: 0, bad: ["the Challenges & Lists panel is not open"] };
    const rows = [...dlg.querySelectorAll('div[style*="gap: 9px"][style*="padding: 8px 6px"]')];
    const bad = [];
    const hit = (a, b) => !(a.right <= b.left + 0.5 || b.right <= a.left + 0.5 || a.bottom <= b.top + 0.5 || b.bottom <= a.top + 0.5);
    for (const row of rows) {
      const runs = [];
      const walk = document.createTreeWalker(row, NodeFilter.SHOW_TEXT);
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        if (!n.textContent.trim()) continue;
        const rg = document.createRange(); rg.selectNodeContents(n);
        for (const b of rg.getClientRects()) if (b.width > 0) runs.push({ t: n.textContent.trim(), b });
      }
      const rb = row.getBoundingClientRect();
      const label = (row.innerText || "").replace(/\s+/g, " ").slice(0, 60);
      for (let i = 0; i < runs.length; i++) {
        if (runs[i].b.right > rb.right + 1) bad.push(`"${runs[i].t}" runs past the row's edge — row: ${label}`);
        for (let j = i + 1; j < runs.length; j++) if (hit(runs[i].b, runs[j].b)) bad.push(`"${runs[i].t}" overlaps "${runs[j].t}" — row: ${label}`);
      }
    }
    return { rows: rows.length, bad, text: dlg.innerText || "" };
  });
  const tapCard = (name) => page.evaluate((nm) => {
    const dlg = [...document.querySelectorAll('[role="dialog"]')].find(d => /Challenges & Lists/.test(d.textContent || ""));
    const b = dlg && [...dlg.querySelectorAll('[role="button"]')].find(x => (x.textContent || "").trim().startsWith(nm.slice(0, 16)));
    if (b) b.click();
    return !!b;
  }, name);
  // The Colorado card above was left open; close it, so each card below is measured against a
  // panel with nothing expanded.
  if (co) { await tapCard("Colorado 14ers"); await page.waitForTimeout(600); }
  // Show every list, not just the filter the panel happened to open on; the click re-renders, so
  // the cards are read in a SEPARATE step after it lands.
  await page.evaluate(() => {
    const dlg = [...document.querySelectorAll('[role="dialog"]')].find(d => /Challenges & Lists/.test(d.textContent || ""));
    const all = dlg && [...dlg.querySelectorAll('[role="button"]')].find(b => (b.textContent || "").trim() === "All");
    if (all) all.click();
  });
  await page.waitForTimeout(800);
  const cardNames = await page.evaluate(() => {
    const dlg = [...document.querySelectorAll('[role="dialog"]')].find(d => /Challenges & Lists/.test(d.textContent || ""));
    if (!dlg) return [];
    // A card's HEADER, not a row of an open list — rows are role=button too, and tapping one leaves the panel.
    return [...dlg.querySelectorAll('[role="button"]')].filter(b => !b.matches('div[style*="padding: 8px 6px"]')).map(b => (b.textContent || "").trim())
      // Discipline Quiver is the one card with no route rows: it expands to discipline chips (`quiver:true`).
      .filter(t => t && !/^(All|Your region|State|Regional|National|Global)$/.test(t) && !/^Discipline Quiver/.test(t));
  });
  await page.waitForTimeout(800);
  log(`  list cards: ${cardNames.map(n => n.slice(0, 22)).join(" | ")}`);
  if (cardNames.length < 5) fail.push(`only ${cardNames.length} list card(s) found in the panel — the overlap scan measured almost nothing`);
  let fiftySeen = false;
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(600);
    for (const name of cardNames) {
      const closed = await geometry();
      if (!(await tapCard(name))) { fail.push(`list card "${name.slice(0, 30)}" vanished at ${width}px`); continue; }
      await page.waitForTimeout(900);
      const g = await geometry();
      if (g.rows <= closed.rows) fail.push(`expanding "${name.slice(0, 30)}" at ${width}px drew no rows — its overlap was not measured`);
      for (const b of g.bad) fail.push(`${width}px, ${name.slice(0, 24)}: ${b}`);
      if (/^Fifty Classic/.test(name)) {
        fiftySeen = true;
        if (!/Liberty Crack/.test(g.text) || !/Liberty Ridge/.test(g.text)) fail.push(`the Fifty Classics list at ${width}px has no Liberty Crack/Liberty Ridge row — the rows the owner saw overlap were not measured`);
      }
      await tapCard(name);
      await page.waitForTimeout(400);
    }
  }
  if (!fiftySeen) fail.push("no Fifty Classic Climbs card in the panel — the list the owner saw overlap was not measured");
  else log(`  overlap scan: ${cardNames.length} lists at 390 and 320px, no text overlapping`);
} catch (e) {
  fail.push("threw: " + String(e.message).split("\n")[0]);
}

await browser.close();
stopServer();
if (fail.length) {
  console.error(`\ncheck:challenge-rows: ${fail.length} problem(s):\n`);
  for (const f of fail) console.error("  " + f);
  process.exit(1);
}
console.log("\ncheck:challenge-rows: ok — the tick-list panel opens and every row says something true.");
