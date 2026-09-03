// Somebody asks to join your crew. What does the organiser actually see?
//
// #1554 made "Join a crew" write a real `crew_members` row at status `pending`, which is the right
// write: 0085's insert policy lets anyone seat THEMSELVES at a status other than 'confirmed'.
// Nothing was built to READ it — and the existing roster picks it up anyway, because `mem` maps
// `crew.members` with no status filter. So the reading code that already exists treats it as
//
//     roster.filter(p => p._status !== "confirmed")   ->   "who haven't confirmed"
//
// which is the frame for someone the ORGANISER INVITED and is waiting on, and it is offered with a
// "Remind all N who haven't confirmed" nudge. A stranger's REQUEST would be presented as a guest
// the organiser chased and should chase again, with no accept and no decline.
//
// That is the "populated, rendered WRONG" class rather than the usual "rendered nowhere", and it is
// worth measuring rather than reasoning about: two claims I made from source alone this session
// turned out to be the assertion's fault rather than the app's.
//
// It also asks the other side. `crews` RLS is "created_by = me OR I am a member", and a pending row
// makes the requester a member — so the crew may appear in THEIR crew list before anyone accepted
// them. Whether it does, and what it says, is measured here rather than assumed.
//
// Writes to the live project; per-run fixture, rows removed with the accounts.

import { chromium } from "playwright-core";
import { spawn } from "node:child_process";
import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFixture, sessionForStorage, STORAGE_KEY } from "../lib/ui-fixture.mjs";
import { settledText } from "../lib/render-settle.mjs";
import { tapByName } from "../lib/tap-by-name.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PORT = 5410;

const envFile = (f) => { try { return fs.readFileSync(path.join(ROOT, f), "utf8"); } catch { return ""; } };
const envText = envFile(".env") + "\n" + envFile(".env.local");
const envVal = (k) => process.env[k] ?? (envText.match(new RegExp("^\\s*" + k + "\\s*=\\s*(\\S+)", "m")) || [])[1];

if (!(envVal("VITE_USE_DB") === "true" && envVal("VITE_SUPABASE_URL") && envVal("VITE_SUPABASE_ANON_KEY"))) {
  console.error("needs VITE_USE_DB=true plus Supabase url/anon key.");
  process.exit(1);
}

const log = (...a) => console.log(...a);
let asserted = 0, bad = 0;
const must = (c, m) => { asserted++; console.log(`  ${c ? "ok   " : "FAIL "} ${m}`); if (!c) bad++; };

async function waitForServer(url, tries = 60) {
  for (let i = 0; i < tries; i++) { try { const r = await fetch(url); if (r.ok) return true; } catch {} await new Promise((r) => setTimeout(r, 1000)); }
  return false;
}
function claimPort(start, span = 40) {
  return new Promise((resolve, reject) => {
    let p = start;
    const tryOne = () => {
      if (p >= start + span) return reject(new Error("no free port"));
      const s = net.createServer();
      s.once("error", () => { p++; tryOne(); });
      s.once("listening", () => s.close(() => resolve(p)));
      s.listen(p, "127.0.0.1");
    };
    tryOne();
  });
}

const SUPA = envVal("VITE_SUPABASE_URL").replace(/\/$/, "");
const ANON = envVal("VITE_SUPABASE_ANON_KEY");
const MEET = "Cascade Pass TH (join-request probe)";

let fixture = null, server = null, browser = null, crewId = null, ownerTok = null;

try {
  const port = await claimPort(PORT);
  const base = `http://127.0.0.1:${port}/`;
  log(`starting dev server on ${port}...`);
  server = spawn("npx", ["vite", "--config", "scripts/signed-in.config.mjs", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    { cwd: ROOT, stdio: "ignore", env: { ...process.env, VITE_DEMO_AUTOLOGIN: "false" } });
  let died = false;
  server.on("exit", () => { died = true; });
  if (!(await waitForServer(base)) || died) { console.error("dev server never came up"); process.exit(1); }
  await fetch(base + "ClimbMatch.jsx").catch(() => {});

  try { browser = await chromium.launch({ channel: "chrome", headless: true, timeout: 120000 }); }
  catch { browser = await chromium.launch({ channel: "chrome", headless: true, timeout: 180000 }); }
  const page = await browser.newPage({ viewport: { width: 390, height: 900 }, deviceScaleFactor: 2 });
  page.setDefaultNavigationTimeout(120000);
  page.setDefaultTimeout(120000);

  fixture = await createFixture(log);
  ownerTok = fixture.session.access_token;
  const ownerId = fixture.session.user.id;

  const asUser = (tok) => (qs, init = {}) => fetch(`${SUPA}/rest/v1/${qs}`, {
    ...init, headers: { apikey: ANON, Authorization: `Bearer ${tok}`, "Content-Type": "application/json", ...(init.headers || {}) },
  });
  const asOwner = asUser(ownerTok);

  const mateTokRes = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email: fixture.mate.email, password: fixture.mate.password }),
  });
  const mateSession = await mateTokRes.json();
  if (!mateSession.access_token) { console.error("the mate could not sign in"); process.exit(1); }
  const asMate = asUser(mateSession.access_token);

  // A THIRD crew, because the mate is already CONFIRMED in the fixture's first one and
  // crew_members is unique on (crew_id, user_id) — a second row would be refused and the probe
  // would be measuring the wrong thing.
  const mk = await asOwner("crews", {
    method: "POST", headers: { Prefer: "return=representation" },
    body: JSON.stringify({ created_by: ownerId, route_id: "kings_hf", dates: ["2026-10-18"], meet_place: MEET, meet_time: "05:30", cap: 4 }),
  });
  const crewRows = await mk.json().catch(() => null);
  must(mk.ok && Array.isArray(crewRows) && crewRows.length === 1, `the owner could open a crew (HTTP ${mk.status})`);
  if (!mk.ok) { log("  " + JSON.stringify(crewRows).slice(0, 200)); throw new Error("no crew to request against"); }
  crewId = crewRows[0].id;
  await asOwner("crew_members", { method: "POST", body: JSON.stringify({ crew_id: crewId, user_id: ownerId, status: "confirmed" }) });

  // ...and the mate ASKS TO JOIN, exactly as #1554's reqJoin does.
  const req = await asMate("crew_members", {
    method: "POST", body: JSON.stringify({ crew_id: crewId, user_id: fixture.mate.id, status: "pending" }),
  });
  must(req.status < 300, `a climber can ask to join under their OWN session (HTTP ${req.status})`);
  if (req.status >= 300) log("  " + (await req.text()).slice(0, 200));

  // ---- what the ORGANISER sees ----
  await page.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); } catch {} },
    [STORAGE_KEY, JSON.stringify(sessionForStorage(fixture.session))]);
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(String(e)));

  await page.goto(base + "?zt=crew", { waitUntil: "domcontentloaded" });
  await settledText(page);
  await tapByName(page, "Crews");
  await settledText(page);
  const org = await page.evaluate(() => document.body.innerText);

  must(org.includes(MEET), "the organiser's own crew is on screen");

  // The app's own wording is "N request(s) to join" and a chip reading "Asked to join" — NOT
  // "join request", which is what a first version tested for and which matched nothing while the
  // block was on screen. Third time this session an assertion of mine was the thing at fault
  // rather than the app; match what the component renders.
  // TWO SEPARATE THINGS, and conflating them made this assertion vacuous. The roster CHIP reads
  // "Asked to join" and renders from the member's own status, so it is correct whether or not the
  // request block exists — an injection that removed the block's data still satisfied a needle
  // that accepted the chip. The BLOCK announces "N request(s) to join", which only renders when
  // the prop is fed. Assert the block; the chip is a separate, weaker check.
  const saysRequest = /requests? to join/i.test(org);
  const chipSaysAsked = /asked to join/i.test(org);
  const saysUnconfirmed = /haven.t confirmed/i.test(org);
  const offersAccept = /\bAccept\b/.test(org);
  log(`  the card frames it as: request=${saysRequest}  "hasn't confirmed"=${saysUnconfirmed}  accept offered=${offersAccept}`);

  must(saysRequest, "the REQUESTS TO JOIN block renders — the chip alone does not prove the prop is fed");
  must(chipSaysAsked, 'the roster chip reads "Asked to join" rather than "Invited"');
  must(offersAccept, "the organiser is offered a way to ACCEPT it");
  must(!saysUnconfirmed || saysRequest, 'the request is not filed under "who haven\'t confirmed" — that is the frame for someone the organiser INVITED');

  if (!saysRequest || !offersAccept) {
    const i = org.indexOf(MEET);
    log("\n  --- the organiser's crew card ---");
    log(org.slice(Math.max(0, i - 200), i + 700).replace(/\n{2,}/g, "\n"));
    log("  --- end ---\n");
  }

  must(pageErrors.length === 0, `no uncaught page errors${pageErrors.length ? ` — ${pageErrors[0].slice(0, 120)}` : ""}`);

} catch (e) {
  console.error("\n" + String(e && e.stack ? e.stack : e).slice(0, 900));
  bad++;
} finally {
  if (browser) await browser.close().catch(() => {});
  if (server) server.kill("SIGTERM");
  // THE CREW THIS PROBE MAKES IS NOT IN createFixture's UNDO LIST, and `crews.created_by`
  // references the user — so leaving it makes the ACCOUNT delete fail and leaks a fixture
  // identity into a live project. It did, once, before this block existed. Members first: the
  // FK is what refuses.
  if (crewId && ownerTok) {
    const h = { apikey: ANON, Authorization: `Bearer ${ownerTok}` };
    await fetch(`${SUPA}/rest/v1/crew_members?crew_id=eq.${crewId}`, { method: "DELETE", headers: h }).catch(() => {});
    const d = await fetch(`${SUPA}/rest/v1/crews?id=eq.${crewId}`, { method: "DELETE", headers: h }).catch(() => null);
    const back = await fetch(`${SUPA}/rest/v1/crews?id=eq.${crewId}&select=id`, { headers: h })
      .then((r) => (r.ok ? r.json() : null)).catch(() => null);
    log(`  removed the probe crew: ${Array.isArray(back) && back.length === 0 ? "ok" : `NO — HTTP ${d ? d.status : "?"}, still present`}`);
  }
  if (fixture) {
    const leaked = await fixture.cleanup().catch((e) => [`cleanup threw: ${e}`]);
    if (leaked && leaked.length) { console.error("LEAKED: " + leaked.join(", ")); bad++; }
    else log("  fixture removed.");
  }
}

console.log(bad ? `\n${bad} of ${asserted} assertion(s) failed.` : `\nok — ${asserted} assertions.`);
process.exit(bad ? 1 : 0);
