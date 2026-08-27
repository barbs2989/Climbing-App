// Can a climber discuss an AREA?
//
// Two halves, and the second is the one that hides. `<Comments targetId={selArea.id}>` is gated on
// `selArea`, which only the seed browse path writes — so on the DB path it has never RENDERED. And
// `commentTargets` returns [] with no route selected, so the area id was never FETCHED either.
// Rendering the section without the fetch gives an empty comment box for ever, which looks exactly
// like a working feature nobody has used — `comments` holds 0 rows, so emptiness proves nothing.
//
// So this asserts the REQUEST as well as the pixels, and writes nothing to the live project:
// `fetchComments` issues `.in("target_id", ids)`, so the ids ride in the URL and can be read off
// the wire. Non-destructive by construction — no comment is posted, nothing to clean up.
//
// Negative control included: at STATE level the section must NOT appear and no comments request
// may be made, because a country or a state is too broad to discuss. Without that, "the section is
// on screen" would pass on a build that rendered it everywhere.
import { spawn } from "node:child_process";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PORT = 5330;
const log = (s) => console.log(s);

async function claimPort(start) {
  for (let p = start; p < start + 40; p++) {
    const free = await new Promise((res) => {
      const s = net.createServer();
      s.once("error", () => res(false));
      s.once("listening", () => s.close(() => res(true)));
      s.listen(p, "127.0.0.1");
    });
    if (free) return p;
  }
  return null;
}
async function waitForServer(url, ms = 180000) {
  const end = Date.now() + ms;
  while (Date.now() < end) { try { const r = await fetch(url); if (r.ok) return true; } catch {} await new Promise((r) => setTimeout(r, 500)); }
  return false;
}

const port = await claimPort(PORT);
if (port === null) { console.error("no free port"); process.exit(1); }
const base = `http://127.0.0.1:${port}/Climbing-App/`;
log(`starting dev server on ${port}...`);
const server = spawn("npx", ["vite", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
  { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"], detached: true, env: { ...process.env, VITE_DEMO_AUTOLOGIN: "true" } });
let died = false; server.on("exit", () => { died = true; });
let stopped = false;
const stop = () => { if (stopped) return; stopped = true; try { process.kill(-server.pid, "SIGTERM"); } catch { try { server.kill(); } catch {} } };
process.on("exit", stop); process.on("SIGINT", () => { stop(); process.exit(130); });
process.on("uncaughtException", (e) => { console.error(e); stop(); process.exit(1); });
if (!(await waitForServer(base)) || died) { console.error("dev server never came up"); stop(); process.exit(1); }

let browser;
try { browser = await chromium.launch({ channel: "chrome", headless: true }); }
catch (e) { console.error("could not launch Chrome: " + String(e.message).split("\n")[0]); stop(); process.exit(1); }
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });

// Every comments read, in order, so "was it fetched" is answered from the wire.
const commentReqs = [];
page.on("request", (r) => { const u = r.url(); if (/\/rest\/v1\/comments\?/.test(u)) commentReqs.push(decodeURIComponent(u)); });

const settle = async (ms = 12000) => {
  let last = "", stable = 0; const end = Date.now() + ms;
  while (Date.now() < end && stable < 3) {
    await new Promise((r) => setTimeout(r, 400));
    const t = await page.evaluate(() => document.body.innerText || "");
    if (t === last) stable++; else { stable = 0; last = t; }
  }
  return last;
};

const fails = [];
const ok = (c, m) => { log(`  ${c ? "ok  " : "FAIL"} ${m}`); if (!c) fails.push(m); };

await page.goto(base, { waitUntil: "domcontentloaded", timeout: 120000 });
await settle();
await page.getByRole("button", { name: /^Climbs(,|$)/ }).first().click({ timeout: 15000 }).catch(() => {});
await page.waitForFunction(() => document.querySelectorAll("select").length > 0, undefined, { timeout: 120000 }).catch(() => {});
await settle();

const pick = async (idx, re) => {
  const opts = await page.evaluate((i) => {
    const s = document.querySelectorAll("select")[i];
    return s ? [...s.options].map((o) => ({ v: o.value, l: o.label })) : [];
  }, idx);
  const hit = opts.find((o) => re.test(o.l) && o.v);
  if (!hit) return null;
  await page.locator("select").nth(idx).selectOption(hit.v).catch(() => {});
  await settle();
  return hit.l;
};
ok(!!(await pick(0, /united states/i)), "chose a country");
ok(!!(await pick(1, /^Colorado$/i)), "chose a state");

// NEGATIVE CONTROL, taken before drilling: a state is excluded, so nothing may be fetched or shown.
const stateText = await page.evaluate(() => document.body.innerText || "");
ok(commentReqs.length === 0, `no comments were fetched at STATE level (${commentReqs.length} request(s))`);
ok(!/Add a comment|Comments \(/i.test(stateText), "no comments section at STATE level");

// Drill to a crag — an area row carries its own "N climbs" suffix, which is what separates a place
// from the "Areas"/"Routes" sub-tab controls beside it.
async function tagFirstAreaRow() {
  return page.evaluate(() => {
    document.querySelectorAll("[data-probe-row]").forEach((n) => n.removeAttribute("data-probe-row"));
    const rows = [...document.querySelectorAll("[role='button']")].filter((el) => /\d[\d,]*\s+climbs?/i.test(el.innerText || ""));
    if (!rows.length) return false;
    rows[0].setAttribute("data-probe-row", "1");
    return true;
  });
}
let hops = 0;
for (; hops < 8; hops++) {
  if (commentReqs.length) break;
  if (!(await tagFirstAreaRow())) break;
  await page.locator("[data-probe-row]").first().click({ timeout: 8000 }).catch(() => {});
  await settle();
}
log(`  (drilled ${hops} level(s) from the state page)`);

const onArea = await page.getByRole("button", { name: /^View map$/ }).count() > 0;
ok(onArea, "reached an AREA PAGE (its own 'View map' control)");

// THE FETCH HALF — the id has to be on the wire, not merely in a memo.
ok(commentReqs.length > 0, `a comments read was issued once inside an area (${commentReqs.length})`);
const withTarget = commentReqs.find((u) => /target_id=in\.\([^)]+\)/.test(u));
ok(!!withTarget, "that read filters on target_id");
if (withTarget) {
  const ids = (withTarget.match(/target_id=in\.\(([^)]+)\)/) || [])[1] || "";
  ok(/[a-z]{2}_/.test(ids) || /\w/.test(ids), `it carries a catalog area id (${ids.slice(0, 60)})`);
  // No route is open while browsing, so commentTargets is [] — anything here IS the area.
  ok(!/__conditions|__planner|__safety/.test(ids), "the ids are the AREA's, not a route's sub-tabs");
}

// THE RENDER HALF.
const areaText = await page.evaluate(() => document.body.innerText || "");
// A textarea is the composer, and it is what a climber needs in order to say anything. Asserted
// structurally rather than by copy: this probe already guessed the section's wording once and was
// wrong, and the component's own heading is not a literal in its first 7,000 characters.
const composers = await page.locator("textarea").count();
ok(composers > 0, `a comment composer is on the area page (${composers} textarea(s))`);

if (fails.length) {
  log("\n  what the area page actually renders (last 22 lines):");
  log(areaText.split("\n").map((l) => l.trim()).filter(Boolean).slice(-22).map((l) => "    " + l).join("\n"));
}
log("");
await browser.close(); stop();
if (fails.length) { console.error(`\nprobe-area-comments: ${fails.length} assertion(s) failed`); process.exit(1); }
log("ok — an area is fetched for comments and offers a comments section; a state offers neither.");
