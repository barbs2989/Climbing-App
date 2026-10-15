// LIVE TWO-BROWSER PROBE OF THE CREW GEAR LIST (#2376, #2381, #2387). Hand-run, local, real database.
//
// The database half is proven by verify-crew-gear-assign.mjs (two real accounts, 33 assertions). What
// that cannot see is the SCREEN: whether a crewmate's change reaches an open card with no reload (the
// crew-gear:<id> broadcast, then a refetch), whether a claim stored in other capitals lands on the
// list's row, and whether an item two members added stays gone. This drives the real app as both:
// owner (Quinn) and mate (Robin) each sign in to their OWN browser context -- one origin keeps one
// session in localStorage, so two accounts need two contexts -- and a Node client per account does
// what an old or concurrent client would. Every assertion reads what a climber sees, or the DB where
// the claim is about storage.
//
// EVERY ASSERTION WAITS FOR TEXT TO APPEAR, and every absence is paired with a presence in the same
// card, so a slow box delays a pass rather than faking one. That is why --max-x may relax the quiet
// box gate; a MISS is still re-run on a quieter box before it is believed.
//
// TRAPS MET BUILDING IT:
//   * The mate is in TWO crews (the fixture's second is his own), and with more than one crew only one
//     card starts expanded. The first run read the other crew's empty list and reported "the change
//     never arrived". Everything here is scoped to #crewcard-db_<crew id>, expanded via "View plan".
//   * With an empty list the header's flex row has the same textContent as the header, and its
//     grandparent is the whole crew card: match the LEAF header only.
//   * The dev server serves hundreds of unbundled modules; on a loaded box the card never rendered in
//     3 minutes. --live targets the deployed site instead (bundled, what climbers run, same database).
//
// STATUS: RUN TO THE END on 2026-10-15 against the live site on a quiet box (1.4x): ok, 30 assertions.
// An owner's item reached the mate's open card in 514 ms, a claim came back the other way in 515 ms,
// a removal reached the other screen in 515 ms and every DB copy. Three earlier runs died on the
// probe's own locators (the badge prefixes the Crews label; the claim button is "I'll bring it: X";
// the open Assign button is "Done assigning X" and the chips sit beside its row) -- all fixed above.
//
//   node scripts/oneoff/probe-crew-gear-live.mjs --live                # deployed site
//   node scripts/oneoff/probe-crew-gear-live.mjs                       # local dev server of this checkout
//     [--max-x 15] [--wait-min 360] [--out DIR] [--anyway]
// Needs the service key (it creates and destroys two accounts) -- see scripts/lib/ui-fixture.mjs.
import { spawn } from "node:child_process";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import { assertQuietBox, loadLine, REFUSE_X } from "../lib/quiet-box.mjs";
import { createFixture, sessionForStorage, STORAGE_KEY } from "../lib/ui-fixture.mjs";
import { SUPABASE_URL, anonKey } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const argv = process.argv.slice(2);
const argOf = (f) => (argv.includes(f) ? argv[argv.indexOf(f) + 1] : null);
const OUT = argOf("--out") || os.tmpdir();
const WAIT_MIN = Number(argOf("--wait-min")) || 180;
// --max-x N: wait for this load-per-core instead of REFUSE_X (see the header for why that is sound here).
const MAX_X = argOf("--max-x") ? Number(argOf("--max-x")) : REFUSE_X;

// Quiet box first: spend nothing on a run whose verdict could not be believed.
const t0w = Date.now();
while (!argv.includes("--anyway") && os.loadavg()[0] / os.cpus().length > MAX_X) {
  if (Date.now() - t0w > WAIT_MIN * 60000) { console.error(`gave up after ${WAIT_MIN} min waiting for a quiet box — ${loadLine()}`); process.exit(2); }
  console.log(`[${new Date().toISOString().slice(11, 19)}] waiting for a quiet box — ${loadLine()}`);
  await new Promise((r) => setTimeout(r, 60000));
}
const qb = assertQuietBox("probe-crew-gear-live.mjs", { argv: [...process.argv, ...(argOf("--max-x") ? ["--anyway"] : [])] });
console.log("box: " + loadLine());

let fail = 0, ran = 0;
const ok = (label, cond, detail) => { ran++; console.log(`${cond ? "  ok  " : "FAIL  "}${label}${detail != null ? `  -- ${detail}` : ""}`); if (!cond) fail++; };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const claimPort = (start) => new Promise((res, rej) => { let p = start; const one = () => { if (p > start + 40) return rej(new Error("no port")); const s = net.createServer(); s.once("error", () => { p++; one(); }); s.once("listening", () => s.close(() => res(p))); s.listen(p, "127.0.0.1"); }; one(); });

let server = null, browser = null, fx = null;
const nodeClients = [];
const pageErrors = { owner: [], mate: [] };
try {
  let base;
  if (argv.includes("--live")) { base = "https://barbs2989.github.io/Climbing-App/"; console.log("target: the LIVE site"); }
  else {
    const port = await claimPort(5330);
    base = `http://127.0.0.1:${port}/Climbing-App/`;
    server = spawn("npx", ["vite", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], { cwd: ROOT, stdio: "ignore", env: { ...process.env, VITE_DEMO_AUTOLOGIN: "false" } });
    let up = false;
    for (let i = 0; i < 120 && !up; i++) { try { up = (await fetch(base)).ok; } catch {} if (!up) await sleep(1000); }
    if (!up) throw new Error("dev server never came up");
    await fetch(base + "ClimbMatch.jsx").catch(() => {});
  }
  browser = await chromium.launch({ channel: "chrome", headless: true, timeout: 180000 });

  fx = await createFixture((m) => console.log(m));
  const crewId = fx.crew.id;
  const signIn = async (u) => {
    const r = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: "POST", headers: { apikey: anonKey(), "Content-Type": "application/json" }, body: JSON.stringify({ email: u.email, password: u.password }) });
    const b = await r.json(); if (!b.access_token) throw new Error("sign in failed for " + u.email); return b;
  };
  const ownerSession = fx.session, mateSession = await signIn(fx.mate);

  // Node clients: the mate's and the owner's (an "old or concurrent client"), each also counting pings.
  const mk = async (u) => { const c = createClient(SUPABASE_URL, anonKey(), { realtime: { transport: WebSocket }, auth: { persistSession: false, autoRefreshToken: false } }); await c.auth.signInWithPassword({ email: u.email, password: u.password }); nodeClients.push(c); return c; };
  const mateNode = await mk(fx.mate), ownerNode = await mk(fx.owner);
  let pings = 0;
  const join = (c) => new Promise((res, rej) => { const ch = c.channel("crew-gear:" + crewId, { config: { broadcast: { self: false } } }); ch.on("broadcast", { event: "changed" }, () => { pings++; }).subscribe((s) => { if (s === "SUBSCRIBED") res(ch); else if (s === "CHANNEL_ERROR" || s === "TIMED_OUT") rej(new Error(s)); }); });
  const mateCh = await join(mateNode), ownerCh = await join(ownerNode);
  const ping = (ch) => ch.send({ type: "broadcast", event: "changed", payload: {} });
  const rows = async () => { const { data } = await mateNode.from("crew_members").select("user_id,gear_claims,gear_extras").eq("crew_id", crewId); return Object.fromEntries((data || []).map((r) => [r.user_id === fx.owner.id ? "owner" : r.user_id === fx.mate.id ? "mate" : r.user_id, r])); };

  // The bar button's BADGE renders BEFORE its label, so with any unread its text reads "2Crews" -- and the
  // fixture always gives the owner one. The first live run matched /^Crews\d*$/, found nothing, and both
  // browsers sat on Home ("the card never rendered"). Match the aria-label; re-tap until a card exists,
  // since a tap that lands while sign-in is still settling is undone by the sign-in reset.
  const tapCrews = async (page) => {
    for (let i = 0; i < 40; i++) {
      await page.evaluate(() => { const b = [...document.querySelectorAll("button")].find((e) => e.getAttribute("aria-label") === "Crews"); if (b) b.click(); }).catch(() => {});
      await sleep(3000);
      if (await page.evaluate(() => !!document.querySelector('[id^="crewcard-"]')).catch(() => false)) return;
    }
  };
  const open = async (who, session) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2 });
    await ctx.addInitScript(({ key, value }) => { try { window.localStorage.setItem(key, value); } catch {} }, { key: STORAGE_KEY, value: JSON.stringify(sessionForStorage(session)) });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => pageErrors[who].push(e.message.slice(0, 200)));
    await page.goto(base, { waitUntil: "domcontentloaded", timeout: 180000 });
    for (let i = 0; i < 180; i++) { const has = await page.evaluate(() => [...document.querySelectorAll("button")].some((b) => (b.textContent || "").trim() === "Home")).catch(() => false); if (has) break; await sleep(1000); }
    await tapCrews(page);
    return page;
  };
  // Everything is scoped to THIS crew's card (see TRAPS). status() is the line under one item --
  // "Bringing: Robin", "Nobody yet" -- matched ignoring case, as the list shows the first spelling stored.
  const CARD = "crewcard-db_" + crewId;
  const inCard = `[...(document.getElementById(${JSON.stringify(CARD)}) || document.createElement("div")).querySelectorAll("div")]`;
  const status = (page, item) => page.evaluate(`(${inCard}).filter((d) => d.children.length === 0 && (d.textContent || "").toLowerCase() === ${JSON.stringify(item.toLowerCase())} && d.nextElementSibling).map((d) => d.nextElementSibling.innerText)`).catch(() => []);
  const rowsNamed = async (page, item) => (await status(page, item)).length;
  const card = (page) => page.locator("#" + CARD);
  const inputIn = (page) => card(page).getByLabel("Add a gear item for this crew");
  const cardText = (page) => page.evaluate((id) => { const c = document.getElementById(id); return c ? c.innerText : ""; }, CARD).catch(() => "");
  const expand = async (page) => { const b = card(page).getByRole("button", { name: /View plan/ }); if (await b.count()) await b.first().click(); };
  const until = async (fn, ms = 60000) => { const t = Date.now(); while (Date.now() - t < ms) { if (await fn()) return Date.now() - t; await sleep(250); } return -1; };

  const A = await open("owner", ownerSession), B = await open("mate", mateSession);
  for (const pg of [A, B]) { await until(async () => (await card(pg).count()) > 0, 180000); await until(async () => /View plan|who's bringing what/i.test(await cardText(pg)), 180000); await expand(pg); }
  ok("the owner's browser shows THIS crew's gear list", (await until(async () => /who's bringing what/i.test(await cardText(A)), 180000)) >= 0, (await cardText(A)).slice(0, 160));
  ok("the mate's browser shows it too (after expanding the card)", (await until(async () => /who's bringing what/i.test(await cardText(B)), 180000)) >= 0, (await cardText(B)).slice(0, 160));
  if (fail) {
    // Say WHY before anything else times out: which crew cards exist, and what the screen shows.
    for (const [who, pg] of [["owner", A], ["mate", B]]) {
      const d = await pg.evaluate(() => ({ ids: [...document.querySelectorAll('[id^="crewcard-"]')].map((e) => e.id), url: location.href, head: document.body.innerText.slice(0, 300) })).catch((e) => ({ err: String(e) }));
      console.log(`DIAG ${who}: ${JSON.stringify(d)}`);
      await pg.screenshot({ path: path.join(OUT, `gear-diag-${who}.png`) }).catch(() => {});
    }
    throw new Error(`the fixture crew's card never rendered — see DIAG above and ${OUT}/gear-diag-*.png`);
  }
  await sleep(3000); // both cards join their channel and do the join-refetch

  console.log("\n— 1. live across the crew —");
  const p0 = pings;
  await inputIn(A).fill("Rope");
  await inputIn(A).press("Enter");
  ok("owner adds Rope: it shows as Nobody yet", (await until(async () => (await status(A, "Rope")).some((s) => /Nobody yet/.test(s)), 8000)) >= 0, JSON.stringify(await status(A, "Rope")));
  let ms = await until(async () => (await status(B, "Rope")).length > 0);
  ok("...and appears in the MATE's browser with no reload", ms >= 0, ms >= 0 ? `${ms} ms` : (await cardText(B)).slice(-400));
  ok("...because the owner's browser pinged the crew channel", pings > p0, `${pings - p0} ping(s)`);
  await card(B).getByRole("button", { name: "I'll bring it: Rope" }).click(); // the label lib/CrewGearList.jsx gives the claim button
  ok("mate taps I'll bring it: their own row says Bringing: You", (await until(async () => (await status(B, "Rope")).some((s) => /Bringing: You/.test(s)), 8000)) >= 0, JSON.stringify(await status(B, "Rope")));
  ms = await until(async () => (await status(A, "Rope")).some((s) => /Bringing: Robin/.test(s)));
  ok("...and the OWNER's browser shows Bringing: Robin, no reload", ms >= 0, ms >= 0 ? `${ms} ms` : JSON.stringify(await status(A, "Rope")));

  console.log("\n— assigning a crewmate through the chips —");
  await inputIn(A).fill("Stove");
  await inputIn(A).press("Enter");
  await until(async () => (await status(A, "Stove")).length > 0, 8000);
  await card(A).getByRole("button", { name: "Assign Stove to a crewmate" }).click();
  // Once open the button is named "Done assigning Stove", and the chip panel is the sibling of the
  // button's ROW (the flex div), not of the button -- see lib/CrewGearList.jsx.
  const chip = card(A).getByRole("button", { name: "Done assigning Stove" }).locator("xpath=../following-sibling::div[1]").getByRole("button", { name: "Robin" });
  ok("the Assign panel offers Robin as a chip", (await chip.count()) === 1, `${await chip.count()} chip(s)`);
  await chip.click();
  ok("...tapping it shows Bringing: Robin on the owner's screen", (await until(async () => (await status(A, "Stove")).some((s) => /Bringing: Robin/.test(s)), 8000)) >= 0, JSON.stringify(await status(A, "Stove")));
  ok("...the chip now reads as pressed", (await chip.getAttribute("aria-pressed")) === "true");
  ms = await until(async () => (await status(B, "Stove")).some((s) => /Bringing: You/.test(s)));
  ok("...and ROBIN's browser says Bringing: You for Stove", ms >= 0, ms >= 0 ? `${ms} ms` : JSON.stringify(await status(B, "Stove")));
  ok("...and Robin's DB row holds the claim", (await rows()).mate.gear_claims.includes("Stove"), JSON.stringify((await rows()).mate));

  console.log("\n— 2. one item whatever its capitals —");
  // An old client claims "rope" in lowercase for the owner, then pings.
  await ownerNode.rpc("assign_crew_gear", { p_crew_id: crewId, p_user_id: fx.owner.id, p_item: "rope", p_on: true });
  await ping(ownerCh);
  ms = await until(async () => (await status(A, "Rope")).some((s) => /You/.test(s) && /Robin/.test(s)));
  ok('a claim stored as "rope" shows under the "Rope" row, beside Robin\'s', ms >= 0, JSON.stringify(await status(A, "Rope")));
  ok("...and there is still ONE Rope row", (await rowsNamed(A, "rope")) === 1, `${await rowsNamed(A, "rope")} rows`);
  await inputIn(B).fill("ROPE");
  await inputIn(B).press("Enter");
  ok('typing "ROPE" on the mate\'s screen says it is already on the list', (await until(async () => /already on the list/.test(await B.evaluate(() => document.body.innerText)), 5000)) >= 0);

  console.log("\n— 3. an item two members added —");
  await inputIn(A).fill("Fuel");
  await inputIn(A).press("Enter");
  await until(async () => (await status(A, "Fuel")).length > 0, 8000);
  await mateNode.rpc("add_crew_gear_item", { p_crew_id: crewId, p_item: "FUEL" });
  await mateNode.rpc("assign_crew_gear", { p_crew_id: crewId, p_user_id: fx.mate.id, p_item: "FUEL", p_on: true });
  await ping(mateCh);
  ms = await until(async () => (await status(A, "Fuel")).some((s) => /Bringing: Robin/.test(s)));
  ok("the mate's own copy \"FUEL\" and claim join the owner's Fuel row", ms >= 0, JSON.stringify(await status(A, "Fuel")));
  ok("...one Fuel row on each screen", (await rowsNamed(A, "fuel")) === 1 && (await until(async () => (await rowsNamed(B, "fuel")) === 1, 8000)) >= 0, `owner ${await rowsNamed(A, "fuel")}, mate ${await rowsNamed(B, "fuel")}`);
  let r = await rows();
  ok("...and BOTH members store a copy (the case that used to come back)", r.owner.gear_extras.includes("Fuel") && r.mate.gear_extras.includes("FUEL"), JSON.stringify({ o: r.owner.gear_extras, m: r.mate.gear_extras }));
  await card(A).getByRole("button", { name: "Remove Fuel" }).click();
  ok("owner removes Fuel: gone from the owner's screen, with Undo offered", (await until(async () => (await rowsNamed(A, "fuel")) === 0 && /Removed “fuel”/i.test(await A.evaluate(() => document.body.innerText)), 8000)) >= 0);
  // An absence only counts beside a presence: the card must still be showing Rope.
  ms = await until(async () => (await rowsNamed(B, "fuel")) === 0 && (await rowsNamed(B, "rope")) === 1);
  ok("...gone from the MATE's screen too, no reload", ms >= 0, ms >= 0 ? `${ms} ms` : `${await rowsNamed(B, "fuel")} rows`);
  await sleep(1500);
  r = await rows();
  const anyFuel = (a) => a.some((x) => x.toLowerCase() === "fuel");
  ok("...and gone from EVERY row in the DB, both copies and both claims", !anyFuel(r.owner.gear_extras) && !anyFuel(r.mate.gear_extras) && !anyFuel(r.owner.gear_claims) && !anyFuel(r.mate.gear_claims), JSON.stringify(r));
  await B.reload({ waitUntil: "domcontentloaded" });
  await until(async () => B.evaluate(() => [...document.querySelectorAll("button")].some((b) => (b.textContent || "").trim() === "Home")).catch(() => false), 180000);
  await tapCrews(B);
  await until(async () => (await card(B).count()) > 0, 180000);
  await expand(B);
  await until(async () => (await rowsNamed(B, "rope")) === 1, 60000);
  ok("...and it does NOT come back on a reload", (await rowsNamed(B, "fuel")) === 0 && (await rowsNamed(B, "rope")) === 1, `fuel ${await rowsNamed(B, "fuel")}, rope ${await rowsNamed(B, "rope")}`);

  console.log("\n— Undo —");
  await card(A).getByRole("button", { name: "Remove Stove" }).click();
  await until(async () => (await rowsNamed(A, "stove")) === 0, 5000);
  await card(A).getByRole("button", { name: "Undo" }).click();
  ok("Undo puts Stove back on the owner's screen with Robin's claim", (await until(async () => (await status(A, "Stove")).some((s) => /Bringing: Robin/.test(s)), 8000)) >= 0, JSON.stringify(await status(A, "Stove")));
  ms = await until(async () => (await status(B, "Stove")).some((s) => /Bringing: You/.test(s)));
  ok("...and on the mate's screen, still his", ms >= 0, ms >= 0 ? `${ms} ms` : JSON.stringify(await status(B, "Stove")));

  console.log("\n— permissions, layout, errors —");
  ok("the mate has no ✕ on items the owner added", (await card(B).getByRole("button", { name: "Remove Rope" }).count()) === 0 && (await status(B, "Rope")).some((s) => /added by a crewmate/.test(s)), JSON.stringify(await status(B, "Rope")));
  ok("the owner does have one", (await card(A).getByRole("button", { name: "Remove Rope" }).count()) === 1);
  for (const [who, pg] of [["owner", A], ["mate", B]]) {
    const ov = await pg.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    ok(`${who}'s screen does not scroll sideways at 390px`, ov <= 0, `${ov}px over`);
    const box = await pg.evaluate((id) => { const c = document.getElementById(id); const h = c && [...c.querySelectorAll("div")].find((d) => d.children.length === 0 && d.textContent === "Crew gear · who's bringing what"); if (!h) return null; const root = h.parentElement.parentElement; root.scrollIntoView({ block: "start" }); const b = root.getBoundingClientRect(); return { y: b.y, height: b.height }; }, CARD);
    if (box) await pg.screenshot({ path: path.join(OUT, `gear-live-${who}.png`), clip: { x: 0, y: Math.max(0, box.y - 8), width: 390, height: Math.min(900, box.height + 16) } });
    ok(`no uncaught page error on the ${who}'s screen`, pageErrors[who].length === 0, pageErrors[who].join(" | ") || null);
  }
  console.log(`\nscreenshots: ${OUT}/gear-live-owner.png, ${OUT}/gear-live-mate.png`);
} catch (e) {
  console.error("\nprobe died: " + ((e && e.stack) || e)); fail++;
} finally {
  for (const c of nodeClients) { try { await c.removeAllChannels(); } catch {} }
  if (browser) await browser.close().catch(() => {});
  if (server) server.kill();
  if (fx) { const left = await fx.cleanup(); console.log(left.length ? `teardown could not remove: ${left}` : "\nteardown: both fixture accounts removed"); if (left.length) fail++; }
}
if (ran < 30) { console.error(`only ${ran} assertions ran — this run proved less than it claims`); fail++; }
if (qb.caveat) console.log("\n" + qb.caveat);
console.log(fail ? `\n${fail} problem(s) in ${ran} assertions.` : `\nok — ${ran} assertions, two real browsers`);
process.exit(fail ? 1 : 0);
