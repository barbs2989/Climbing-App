#!/usr/bin/env node
// TEN REAL CLIMBERS, EVERY WAY TO FIND A PARTNER, AND EVERY WAY TO START A CREW WITH ONE
// (owner note 2026-11-25: "create 10 real accounts and go through the process for many variations and
// report back to me how it works").
//
// The service key CREATES and DELETES the ten throwaway accounts and nothing else; every profile edit,
// listing, saved area, objective, search, crew, invite, request and accept goes through the anon key and
// that climber's OWN session, exactly as the app does it, so RLS decides what each one can see and do.
// Accounts live on the reserved .invalid domain and are deleted in a finally; the run then COUNTS what is
// left rather than trusting the deletes.
//
// The cast (the viewer is Ana; every other climber is one variation of "how could Ana find you"):
//   Ana    sport+trad 5.10, zip 84101, LISTED at Hellgate (crag), SAVED Little Cottonwood (canyon),
//          a mountain OBJECTIVE on a Mount Baker route. Has NO crew at the start.
//   Ben    listed at the SAME crag (Hellgate), zip 84105
//   Cleo   listed at the CANYON above it (Little Cottonwood)
//   Dev    listed at the RANGE above that (Wasatch)
//   Eli    saved the SAME Baker route as an objective; listed nowhere
//   Faye   listed ON the PEAK (Mount Baker, alpine); no objectives
//   Gus    nothing at all but a profile and zip 84102 -- the climber the owner met under Everyone
//   Hana   nothing, and NO zip
//   Ivo    turned "List me in partner browse" OFF
//   Jo     listed at Hellgate too, but BLOCKED Ana
//
// Then the crew half: Ana starts a crew with Gus (found only under Everyone) at Hellgate; Gus accepts.
// Ana forms a route crew with Eli on the shared Baker objective; Eli accepts. Ana invites Ben to the
// EXISTING Hellgate crew; Ben declines. Hana finds the Hellgate crew under Join a crew, asks to join,
// and Ana accepts her. Ana sends Gus a friend request; Gus accepts.
//
// With --ui <shot-dir>, it also signs Ana in on a LOCAL dev server (never the live site) at 390px and
// walks Find partners › Everyone: Gus's card must offer "Start a crew with Gus" while Ana has no crew,
// the button must open the Crew tab's "Start a crew with Gus" sheet, and after the Hellgate crew exists
// Ben's card must offer "+ Invite Ben to Hellgate" as well.
//   node scripts/oneoff/probe-ten-climbers-find-partners-and-crews.mjs [--ui <shot-dir>] [--json out.json]
import { SUPABASE_URL, anonKey, requireServiceKey } from "../lib/supabase-env.mjs";
import fs from "node:fs";
import { assertQuietBox } from "../lib/quiet-box.mjs";

const DOMAIN = "climbmatch-qa.invalid";
const CRAG = "ut_hellgate_cliffs", CANYON = "ut_little_cottonwood_canyon", RANGE = "ut_wasatch_range";
const args = process.argv.slice(2);
const UI = args.includes("--ui") ? args[args.indexOf("--ui") + 1] : null;
const JSON_OUT = args.includes("--json") ? args[args.indexOf("--json") + 1] : null;
let pass = 0, fail = 0;
const ok = (l) => { pass++; console.log("  ok   " + l); };
const bad = (l, d) => { fail++; console.log("  FAIL " + l + (d ? "  -- " + d : "")); };
const check = (cond, l, d) => (cond ? ok(l) : bad(l, d));
const say = (l) => console.log("       " + l);
const svc = requireServiceKey();
const pace = () => new Promise((r) => setTimeout(r, 250));

async function api(path, opts, key, jwt) {
  await pace();
  const r = await fetch(SUPABASE_URL + path, { ...opts, headers: { apikey: key, Authorization: "Bearer " + (jwt || key), "Content-Type": "application/json", ...((opts && opts.headers) || {}) } });
  const text = await r.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  return { status: r.status, body };
}
const made = [];
const stamp = process.pid.toString(36) + Math.random().toString(36).slice(2, 6);
async function createUser(tag, name) {
  const email = "ten-" + tag.toLowerCase() + "-" + stamp + "@" + DOMAIN, password = "Qa!" + Math.random().toString(36).slice(2, 12) + "Aa1";
  const { status, body } = await api("/auth/v1/admin/users", { method: "POST", body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name } }) }, svc);
  if (status >= 300 || !body || !body.id) throw new Error("create " + tag + " failed (" + status + ")");
  const u = { id: body.id, tag, name, email, password };
  made.push(u);
  const t = await api("/auth/v1/token?grant_type=password", { method: "POST", body: JSON.stringify({ email, password }) }, anonKey());
  if (!t.body || !t.body.access_token) throw new Error("sign in " + tag + " failed (" + t.status + ")");
  u.jwt = t.body.access_token; u.session = t.body;
  return u;
}
const as = (u, path, opts) => api(path, opts || {}, anonKey(), u && u.jwt);
const rpc = (u, fn, a) => as(u, "/rest/v1/rpc/" + fn, { method: "POST", body: JSON.stringify(a) });
const ins = (u, table, row) => as(u, "/rest/v1/" + table, { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(row) });
// A request to join cannot read the crew back yet (crew_visible_to_me), so RETURNING would be refused: the app sends it without one.
const insMin = (u, table, row) => as(u, "/rest/v1/" + table, { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify(row) });
const must = (r, what) => { if (r.status >= 300) throw new Error(what + " failed (" + r.status + "): " + JSON.stringify(r.body).slice(0, 300)); return r.body; };
const names = (rows, cast) => (Array.isArray(rows) ? rows.map((x) => (cast.find((c) => c.id === x.id) || { tag: null }).tag).filter(Boolean).sort() : ["ERR " + JSON.stringify(rows).slice(0, 120)]);

async function main() {
  console.log("Ten real climbers: finding partners and starting crews (anon key + each climber's own JWT)\n");
  const cat = await api("/rest/v1/areas?id=in.(" + [CRAG, CANYON, RANGE].join(",") + ")&select=id,name,area_type", {}, anonKey());
  if (!Array.isArray(cat.body) || cat.body.length !== 3) throw new Error("the Utah areas are not all in the catalog");
  const peakQ = await api("/rest/v1/areas?area_type=eq.peak&name=eq.Mount%20Baker&select=id,name", {}, anonKey());
  const PEAK = peakQ.body && peakQ.body[0] && peakQ.body[0].id;
  if (!PEAK) throw new Error("no Mount Baker peak in the catalog");
  const rq = await api("/rest/v1/routes?area_id=eq." + PEAK + "&discipline=in.(alpine,mountaineering)&select=id,name&order=name&limit=1", {}, anonKey());
  const BAKER_ROUTE = rq.body && rq.body[0];
  if (!BAKER_ROUTE) throw new Error("no alpine route on Mount Baker");
  say("places: " + cat.body.map((a) => a.name + " (" + a.area_type + ")").join(", ") + "; peak " + PEAK + "; route " + BAKER_ROUTE.name);

  const spec = [
    ["Ana", "Ana Viewer", { disciplines: ["sport", "trad"], sport_grade: "5.10a", trad_grade: "5.9" }, "84101"],
    ["Ben", "Ben Samecrag", { disciplines: ["sport"], sport_grade: "5.10b" }, "84105"],
    ["Cleo", "Cleo Canyon", { disciplines: ["sport", "trad"], trad_grade: "5.10a" }, "84121"],
    ["Dev", "Dev Range", { disciplines: ["trad"], trad_grade: "5.8" }, "84092"],
    ["Eli", "Eli Objective", { disciplines: ["alpine", "trad"], trad_grade: "5.8" }, "98225"],
    ["Faye", "Faye Peak", { disciplines: ["alpine", "mountaineering"] }, "98226"],
    ["Gus", "Gus Everyone", { disciplines: ["sport", "trad"], sport_grade: "5.10c" }, "84102"],
    ["Hana", "Hana Nozip", { disciplines: ["sport"], sport_grade: "5.9" }, null],
    ["Ivo", "Ivo Unlisted", { disciplines: ["sport"], sport_grade: "5.11a" }, "84101"],
    ["Jo", "Jo Blocker", { disciplines: ["sport"], sport_grade: "5.10a" }, "84101"],
  ];
  const cast = [];
  for (const [tag, name, prof, zip] of spec) {
    const u = await createUser(tag, name);
    cast.push(u);
    const un = (tag.toLowerCase() + stamp).slice(0, 20);
    must(await as(u, "/rest/v1/profiles?id=eq." + u.id, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ name, username: un, show_name: true, location: zip && zip.startsWith("98") ? "Bellingham, WA" : "Salt Lake City, UT", bio: "Test climber for the partner audit (deleted after the run).", ...prof }) }), "profile " + tag);
    if (zip) must(await ins(u, "profile_zips", { user_id: u.id, zip }), "zip " + tag);
  }
  const by = Object.fromEntries(cast.map((u) => [u.tag, u]));
  const { Ana, Ben, Cleo, Dev, Eli, Faye, Gus, Hana, Ivo, Jo } = by;
  must(await ins(Ana, "partner_areas", { user_id: Ana.id, area_id: CRAG, disciplines: ["sport", "trad"] }), "Ana lists Hellgate");
  must(await ins(Ana, "saved_areas", { user_id: Ana.id, area_id: CANYON }), "Ana saves the canyon");
  must(await ins(Ana, "objectives", { user_id: Ana.id, route_id: BAKER_ROUTE.id }), "Ana's objective");
  must(await ins(Ben, "partner_areas", { user_id: Ben.id, area_id: CRAG, disciplines: ["sport"] }), "Ben lists Hellgate");
  must(await ins(Cleo, "partner_areas", { user_id: Cleo.id, area_id: CANYON, disciplines: ["sport", "trad"] }), "Cleo lists the canyon");
  must(await ins(Dev, "partner_areas", { user_id: Dev.id, area_id: RANGE, disciplines: ["trad"] }), "Dev lists the range");
  must(await ins(Eli, "objectives", { user_id: Eli.id, route_id: BAKER_ROUTE.id }), "Eli's objective");
  must(await ins(Faye, "partner_areas", { user_id: Faye.id, area_id: PEAK, disciplines: ["alpine", "mountaineering"] }), "Faye lists the peak");
  must(await ins(Jo, "partner_areas", { user_id: Jo.id, area_id: CRAG, disciplines: ["sport"] }), "Jo lists Hellgate");
  must(await ins(Ivo, "partner_areas", { user_id: Ivo.id, area_id: CRAG, disciplines: ["sport"] }), "Ivo lists Hellgate");
  must(await as(Ivo, "/rest/v1/profiles?id=eq." + Ivo.id, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ discoverable: false }) }), "Ivo unlists");
  must(await ins(Jo, "blocked_users", { blocker: Jo.id, blocked: Ana.id }), "Jo blocks Ana");
  ok("ten accounts made, each set up on its own session");

  // ---------- 1. what Ana finds, mode by mode ----------
  console.log("\n1. What Ana finds in each Find partners mode");
  const slc = { lat: 40.76, lng: -111.89 };
  const res = {};
  res.mine_listed = names((await rpc(Ana, "partners_for_my_areas", { p_limit: 50 })).body, cast);
  res.mine_saved = names((await rpc(Ana, "partners_in_area", { p_area_id: CANYON, p_limit: 50 })).body, cast);
  res.mine_objective = names((await rpc(Ana, "partners_by_objective", { p_route_ids: [BAKER_ROUTE.id], p_area_id: null, p_limit: 50 })).body, cast);
  res.route = res.mine_objective;
  res.peak_listed = names((await rpc(Ana, "partners_in_area", { p_area_id: PEAK, p_limit: 50 })).body, cast);
  res.peak_objective = names((await rpc(Ana, "partners_by_objective", { p_route_ids: null, p_area_id: PEAK, p_limit: 50 })).body, cast);
  res.area_crag = names((await rpc(Ana, "partners_in_area", { p_area_id: CRAG, p_limit: 50 })).body, cast);
  res.area_canyon = names((await rpc(Ana, "partners_in_area", { p_area_id: CANYON, p_limit: 50 })).body, cast);
  res.area_range = names((await rpc(Ana, "partners_in_area", { p_area_id: RANGE, p_limit: 50 })).body, cast);
  res.everyone_near_zip_25mi = names((await rpc(Ana, "partners_near", { p_lat: slc.lat, p_lng: slc.lng, p_radius_mi: 25, p_limit: 50 })).body, cast);
  // Everyone at Anywhere is the browse list: discoverable profiles. Only OUR ten are counted, so the real climbers in it do not matter.
  const browse = await as(Ana, "/rest/v1/profiles?select=id&discoverable=eq.true&id=in.(" + cast.map((c) => c.id).join(",") + ")");
  res.everyone_anywhere = names(browse.body, cast).filter((t) => t !== "Ana");
  for (const k of Object.keys(res)) say(k.padEnd(24) + (res[k].join(", ") || "(nobody)"));
  const eq = (a, b) => JSON.stringify(a) === JSON.stringify([...b].sort());
  check(eq(res.mine_listed, ["Ben", "Cleo", "Dev"]), "My climbs & areas (listed half): the same crag, the canyon above it and the range above that", res.mine_listed.join(","));
  check(eq(res.mine_saved, ["Ben", "Cleo", "Dev"]), "My climbs & areas (saved half): Ana's saved canyon finds the crag listing inside it and the two above", res.mine_saved.join(","));
  check(eq(res.mine_objective, ["Eli"]), "My climbs & areas (objective half) and By Route: Eli, who saved the same Baker route", res.mine_objective.join(","));
  check(eq(res.peak_listed, ["Faye"]), "By Peak (listed half): Faye, listed on the peak", res.peak_listed.join(","));
  check(res.peak_objective.includes("Eli"), "By Peak (objective half): Eli, who saved a route on it", res.peak_objective.join(","));
  check(eq(res.area_crag, ["Ben", "Cleo", "Dev"]), "By Area at the crag: Ben (there) + Cleo and Dev (listed across it)", res.area_crag.join(","));
  check(eq(res.area_range, ["Ben", "Cleo", "Dev"]), "By Area at the range: everyone listed inside it", res.area_range.join(","));
  check(["Ben", "Gus"].every((t) => res.everyone_near_zip_25mi.includes(t)) && !res.everyone_near_zip_25mi.includes("Hana"), "Everyone within 25 mi of Ana's zip: the SLC zips, not Hana (no zip)", res.everyone_near_zip_25mi.join(","));
  check(res.everyone_anywhere.includes("Gus") && res.everyone_anywhere.includes("Hana"), "Everyone at Anywhere: Gus and Hana, who are listed nowhere, appear ONLY here (and near a zip)", res.everyone_anywhere.join(","));
  const everywhere = Object.values(res).flat();
  check(!everywhere.includes("Ivo"), "Ivo (List me in partner browse OFF) appears in no list");
  check(!Object.entries(res).filter(([k]) => k !== "everyone_anywhere").some(([, v]) => v.includes("Jo")), "Jo (blocked Ana) appears in no search result");
  if (res.everyone_anywhere.includes("Jo")) say("NOTE: Jo shows in Ana's raw profiles read; the app's browse list drops blocked climbers client-side (blocked_users is read both ways)");
  check(!everywhere.includes("Ana"), "Ana never finds herself");

  // ---------- 2. Gus: the climber only Everyone finds -- Ana starts a crew with him, with no crew to begin with ----------
  console.log("\n2. Starting a crew with a climber found only under Everyone (Ana has no crew)");
  const mineBefore = await as(Ana, "/rest/v1/crews?select=id&created_by=eq." + Ana.id);
  check(Array.isArray(mineBefore.body) && mineBefore.body.length === 0, "Ana starts with no crew (so the card's old only action, '+ Invite Gus to <crew>', had nothing to offer)");
  const day = new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10);
  const hell = must(await ins(Ana, "crews", { area_id: CRAG, discipline: "sport", created_by: Ana.id, dates: [day], cap: 4 }), "Ana's Hellgate crew")[0];
  const orgRow = await as(Ana, "/rest/v1/crew_members?select=user_id,status&crew_id=eq." + hell.id);
  say("after create, crew_members: " + JSON.stringify(orgRow.body));
  must(await ins(Ana, "crew_members", { crew_id: hell.id, user_id: Gus.id, status: "invited" }), "Ana invites Gus");
  const gusSees = await as(Gus, "/rest/v1/crew_members?select=crew_id,status&user_id=eq." + Gus.id);
  check(Array.isArray(gusSees.body) && gusSees.body.some((m) => m.crew_id === hell.id && m.status === "invited"), "Gus sees the invite on his own session");
  const acc = await as(Gus, "/rest/v1/crew_members?crew_id=eq." + hell.id + "&user_id=eq." + Gus.id + "&select=status", { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ status: "confirmed" }) });
  check(Array.isArray(acc.body) && acc.body[0] && acc.body[0].status === "confirmed", "Gus accepts: he is a confirmed member", JSON.stringify(acc.body));

  // ---------- 3. Eli: shared mountain objective -> Form crew on that route ----------
  console.log("\n3. Forming a route crew with a climber who shares an objective (Eli)");
  const bakerCrew = must(await ins(Ana, "crews", { route_id: BAKER_ROUTE.id, created_by: Ana.id, dates: [day], cap: 4 }), "Ana's Baker crew")[0];
  must(await ins(Ana, "crew_members", { crew_id: bakerCrew.id, user_id: Eli.id, status: "invited" }), "Ana invites Eli");
  const eAcc = await as(Eli, "/rest/v1/crew_members?crew_id=eq." + bakerCrew.id + "&user_id=eq." + Eli.id + "&select=status", { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ status: "confirmed" }) });
  check(Array.isArray(eAcc.body) && eAcc.body[0] && eAcc.body[0].status === "confirmed", "Eli accepts the Baker crew");

  // ---------- 4. Ben: invited to the EXISTING crew, declines ----------
  console.log("\n4. Inviting to an existing crew, and a decline (Ben)");
  must(await ins(Ana, "crew_members", { crew_id: hell.id, user_id: Ben.id, status: "invited" }), "Ana invites Ben to Hellgate");
  const bDec = await as(Ben, "/rest/v1/crew_members?crew_id=eq." + hell.id + "&user_id=eq." + Ben.id + "&select=status", { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ status: "declined" }) });
  check(Array.isArray(bDec.body) && bDec.body[0] && bDec.body[0].status === "declined", "Ben declines", JSON.stringify(bDec.body));

  // ---------- 5. Hana: no zip, listed nowhere -- finds the crew under Join a crew and asks in ----------
  console.log("\n5. Join a crew: Hana finds Ana's crew and asks to join");
  const listing = await as(Hana, "/rest/v1/crew_listings?select=id,area_id,discipline,cap&id=eq." + hell.id);
  check(Array.isArray(listing.body) && listing.body.length === 1, "Hana sees the Hellgate crew in Join a crew's listing", JSON.stringify(listing.body).slice(0, 200));
  const req = await insMin(Hana, "crew_members", { crew_id: hell.id, user_id: Hana.id, status: "pending" });
  check(req.status < 300, "Hana's ask-to-join is filed", req.status + " " + JSON.stringify(req.body).slice(0, 200));
  const aAcc = await as(Ana, "/rest/v1/crew_members?crew_id=eq." + hell.id + "&user_id=eq." + Hana.id + "&select=status", { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ status: "confirmed" }) });
  check(Array.isArray(aAcc.body) && aAcc.body[0] && aAcc.body[0].status === "confirmed", "Ana (organiser) accepts Hana", JSON.stringify(aAcc.body));

  // ---------- 6. Ivo (unlisted) and Jo (blocked Ana) ----------
  console.log("\n6. The two climbers who must stay out of reach");
  const ivoListing = await as(Ivo, "/rest/v1/crew_listings?select=id&id=eq." + hell.id);
  check(Array.isArray(ivoListing.body) && ivoListing.body.length === 1, "Ivo (unlisted himself) can still FIND and join crews -- listing is about being found, not finding");
  const joInv = await ins(Ana, "crew_members", { crew_id: hell.id, user_id: Jo.id, status: "invited" });
  check(joInv.status >= 300, "Ana cannot crew-invite Jo, who blocked her (refused by the database)", String(joInv.status));

  // ---------- 7. Friends ----------
  console.log("\n7. A friend request from a partner card (Gus)");
  must(await ins(Ana, "connections", { requester: Ana.id, addressee: Gus.id }), "Ana's request");
  const fAcc = await as(Gus, "/rest/v1/connections?requester=eq." + Ana.id + "&addressee=eq." + Gus.id + "&select=status", { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ status: "accepted" }) });
  check(Array.isArray(fAcc.body) && fAcc.body[0] && fAcc.body[0].status === "accepted", "Gus accepts: friends");

  const roster = await as(Ana, "/rest/v1/crew_members?select=user_id,status&crew_id=eq." + hell.id);
  res.hellgate_roster = (roster.body || []).map((m) => (cast.find((c) => c.id === m.user_id) || {}).tag + ":" + m.status).sort();
  say("Hellgate crew roster: " + res.hellgate_roster.join(", "));
  if (UI) await uiWalk(Ana, hell);
  if (JSON_OUT) fs.writeFileSync(JSON_OUT, JSON.stringify(res, null, 2));
}

// A LOCAL dev server only: test credentials never go into the live site.
async function uiWalk(Ana, hell) {
  assertQuietBox("probe-ten-climbers-find-partners-and-crews.mjs");
  console.log("\n8. The screens, signed in as Ana on a local dev server (390px)");
  const { chromium } = await import("playwright-core");
  const { spawn } = await import("node:child_process");
  const path = await import("node:path");
  const { NPX, NPX_PRE } = await import("../lib/npx.mjs");
  const { sessionForStorage, STORAGE_KEY } = await import("../lib/ui-fixture.mjs");
  fs.mkdirSync(UI, { recursive: true });
  const port = 5300 + Math.floor(Math.random() * 400), base = `http://127.0.0.1:${port}/Climbing-App/`;
  const server = spawn(NPX, [...NPX_PRE, "vite", "--host", "127.0.0.1", "--port", String(port), "--strictPort"], { stdio: "ignore", env: { ...process.env, VITE_DEMO_AUTOLOGIN: "false" } });
  let browser;
  try {
    for (let i = 0; i < 90; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise((r) => setTimeout(r, 1000)); }
    browser = await chromium.launch({ channel: "chrome", headless: true });
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await ctx.newPage();
    page.on("pageerror", (e) => console.log("PAGEERROR " + e.message.slice(0, 200)));
    await page.addInitScript(({ key, value }) => { try { localStorage.setItem(key, value); } catch {} }, { key: STORAGE_KEY, value: JSON.stringify(sessionForStorage(Ana.session)) });
    const shot = (n) => page.screenshot({ path: path.join(UI, n + ".png"), fullPage: false });
    const openEveryone = async () => {
      await page.goto(base, { waitUntil: "domcontentloaded", timeout: 180000 }); await page.waitForTimeout(10000);
      await page.locator('button[aria-label="Partners"], button:has-text("Partners")').first().click({ timeout: 180000 }); await page.waitForTimeout(5000);
      try { await page.locator('[role="group"][aria-label="Find partners by"] button', { hasText: /^Everyone$/ }).click({ timeout: 180000 }); } catch (e) { await shot("fail-open-everyone"); throw e; } await page.waitForTimeout(12000);
    };
    // Ana's crew already exists by now (the DB half ran first), so take it away for the "no crew" look and put it back after.
    await as(Ana, "/rest/v1/crews?id=eq." + hell.id, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ dates: ["2020-01-01"] }) });
    await openEveryone();
    const gusCard = page.locator("div", { has: page.locator("text=Gus Everyone") }).filter({ has: page.locator('[data-partner-start="crew"]') }).last();
    check(await gusCard.count() > 0, "Everyone: Gus's card is drawn with a Start a crew button");
    const startBtn = page.locator('[data-partner-start="crew"]', { hasText: "Start a crew with Gus" });
    check(await startBtn.count() === 1, "Gus's card offers 'Start a crew with Gus' while Ana has no crew to invite him to");
    check(await page.locator("button", { hasText: /^\+ Invite Gus to / }).count() === 0, "...and no '+ Invite Gus to <crew>' (Ana has no upcoming crew)");
    if (await startBtn.count()) { await startBtn.scrollIntoViewIfNeeded(); await shot("01-everyone-start-a-crew"); await startBtn.click(); await page.waitForTimeout(4000); }
    const sheet = page.locator("text=Start a crew with Gus");
    check(await sheet.count() > 0, "tapping it opens the Crew tab's 'Start a crew with Gus' sheet");
    await shot("02-start-a-crew-with-gus-sheet");
    const sheetTxt = await page.locator('[role="dialog"]').last().innerText().catch(() => "");
    say("sheet reads: " + sheetTxt.replace(/\s+/g, " ").slice(0, 400));
    check(/area|crag session/i.test(sheetTxt), "the sheet offers a crag session at an area (Ana has one saved climb, a mountain route)");
    // Put the crew back to an upcoming day: Ben's card must now ALSO offer the existing crew.
    await as(Ana, "/rest/v1/crews?id=eq." + hell.id, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ dates: [new Date(Date.now() + 10 * 864e5).toISOString().slice(0, 10)] }) });
    await openEveryone();
    const benInv = page.locator("button", { hasText: /^\+ Invite Ben to / });
    const benStart = page.locator('[data-partner-start="crew"]', { hasText: "Start a crew with Ben" });
    say("Ben's card: invite-to-existing " + (await benInv.count()) + " (0 expected: Ben already declined that crew, so it is not offered again), start-a-crew " + (await benStart.count()));
    check(await benStart.count() === 1, "with a crew, Ben's card still offers 'Start a crew with Ben' (a new crew is always one tap away)");
    if (await benStart.count()) { await benStart.scrollIntoViewIfNeeded(); await shot("03-everyone-ben-with-crew"); }
    // Cleo climbs sport and was never asked: her card offers BOTH the existing crew and a new one.
    const cleoInv = page.locator("button", { hasText: /^\+ Invite Cleo to / });
    const cleoStart = page.locator('[data-partner-start="crew"]', { hasText: "Start a crew with Cleo" });
    check(await cleoInv.count() === 1 && await cleoStart.count() === 1, "with a crew, Cleo's card offers '+ Invite Cleo to <the crew>' AND 'Start a crew with Cleo'", "invite " + (await cleoInv.count()) + ", start " + (await cleoStart.count()));
    if (await cleoInv.count()) { await cleoInv.scrollIntoViewIfNeeded(); await shot("04-everyone-cleo-invite-or-start"); }
  } finally {
    if (browser) await browser.close().catch(() => {});
    server.kill();
  }
}

async function cleanup() {
  // Their crews first, whatever crews.created_by does on a user delete.
  if (made.length) await api("/rest/v1/crews?created_by=in.(" + made.map((u) => u.id).join(",") + ")", { method: "DELETE" }, svc);
  for (const u of made) {
    const r = await api("/auth/v1/admin/users/" + u.id, { method: "DELETE" }, svc);
    if (r.status >= 300) console.log("  could not delete " + u.tag + " (" + r.status + ")");
  }
  if (!made.length) return;
  const left = await api("/rest/v1/profiles?select=id&id=in.(" + made.map((u) => u.id).join(",") + ")", {}, svc);
  check(Array.isArray(left.body) && left.body.length === 0, "cleanup: every test account is gone (" + made.length + " deleted, " + (Array.isArray(left.body) ? left.body.length : "?") + " profiles left)");
  const crewsLeft = await api("/rest/v1/crews?select=id&created_by=in.(" + made.map((u) => u.id).join(",") + ")", {}, svc);
  check(Array.isArray(crewsLeft.body) && crewsLeft.body.length === 0, "cleanup: their crews went with them (" + (Array.isArray(crewsLeft.body) ? crewsLeft.body.length : "?") + " left)");
}

main().catch((e) => bad("run stopped", e.message)).finally(async () => { await cleanup().catch((e) => bad("cleanup", e.message)); console.log("\n" + pass + " passed, " + fail + " failed"); process.exit(fail ? 1 : 0); });
