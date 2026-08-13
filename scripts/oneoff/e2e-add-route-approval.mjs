#!/usr/bin/env node
// END-TO-END walk of the add-a-route flow, against the LIVE database.
//
// Everything else about this flow is now proven separately — the submit half (#794), the
// approval RPC and its 34 columns (0135/#848), the six columns rendering (#855), and the
// client-side grade_num (#867). The one link nothing had exercised is the approval itself,
// because `approve_new_route` gates on `is_admin(auth.uid())` and the only admin is a real
// person. This walks it with a throwaway account and removes every trace afterwards.
//
// IT CANNOT MAKE ITSELF AN ADMIN, AND MUST NEVER BE "FIXED" SO THAT IT CAN.
// The first version tried to set `is_admin = true` on its own fixture profile and was refused:
//
//     P0001  only an admin can change is_admin
//
// That is a TRIGGER, so the service key hits it too — 0083's own header says so, having tried
// exactly this. The only way through is to disable the trigger for one statement, and 0083
// also records why the guard is not simply loosened: `profiles` RLS lets a user update their
// own row, so any window with that trigger off is a window in which ANY signed-up user can
// make themselves an admin. Opening that in production to run a test is not a trade worth
// making. So this script never grants anything.
//
// Instead, supply a REAL admin's access token:
//
//     ADMIN_JWT=<token> node scripts/oneoff/e2e-add-route-approval.mjs
//
// With no token it still proves the submit half (which needs no admin) and then stops and
// says what is missing, rather than pretending the chain is verified.
//
// WHAT IT WRITES, and why each is acceptable:
//   1. one auth user on the reserved `.invalid` domain (RFC 2606 — can never receive mail),
//      always a PLAIN user, which is also more faithful: submitter and approver are different
//      people in reality
//   2. one `contributions` row  (kind = new_route)
//   3. one `routes` row, named ZZ-QA-… so a failed cleanup is unmistakable and greppable
//      — only when an admin token was supplied
// All are deleted in a `finally`, and every deletion is VERIFIED by re-reading rather than
// trusted: a DELETE that matches nothing reports success just the same.
//
// route_count is a subtree aggregate maintained by a trigger on `routes`, so inserting and
// deleting moves every ancestor's cache up and back down. Baselines are recorded first and
// reconciled at the end; an unrestored count is reported as a FAILURE, not a note.
import { loadEnv } from "../lib/supabase-env.mjs";
import { gradeNumFor } from "../../lib/grade.js";

const env = loadEnv();
const URL_ = env.VITE_SUPABASE_URL;
const ANON = env.VITE_SUPABASE_ANON_KEY;
const SVC = env.SUPABASE_SERVICE_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !ANON || !SVC) { console.error("need url + anon + service key"); process.exit(1); }

const DOMAIN = "climbmatch-qa.invalid";
const STAMP = `${process.pid.toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const ROUTE_NAME = `ZZ QA Approval Probe ${STAMP}`;

const svcH = { apikey: SVC, Authorization: `Bearer ${SVC}`, "Content-Type": "application/json" };
const userH = (jwt) => ({ apikey: ANON, Authorization: `Bearer ${jwt}`, "Content-Type": "application/json" });

let fails = 0;
const ok = (m) => console.log(`  ok    ${m}`);
const bad = (m) => { console.log(`  FAIL  ${m}`); fails++; };
const step = (m) => console.log(`\n── ${m}`);

async function rest(path, opts = {}, headers = svcH) {
  const r = await fetch(`${URL_}/rest/v1/${path}`, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
  const txt = await r.text();
  let body = null; try { body = txt ? JSON.parse(txt) : null; } catch { body = txt; }
  return { status: r.status, body };
}

let user = null, routeId = null, contribId = null, skipped = false;

try {
  // ── 0. leave nothing from an earlier dead run ────────────────────────────────
  step("sweep any orphaned probe rows from a previous run");
  const stale = await rest(`routes?select=id,name&name=like.ZZ%20QA%20Approval%20Probe*`);
  if (Array.isArray(stale.body) && stale.body.length) {
    for (const r of stale.body) await rest(`routes?id=eq.${encodeURIComponent(r.id)}`, { method: "DELETE" });
    console.log(`  removed ${stale.body.length} orphaned probe route(s)`);
  } else ok("no orphaned probe routes");

  // ── 1. pick a leaf area ──────────────────────────────────────────────────────
  step("pick a target area (must be a LEAF — routes_require_leaf)");
  const cand = await rest(`areas?select=id,name,parent_id,route_count,path&region=eq.Washington&area_type=eq.crag&route_count=gte.2&route_count=lte.8&limit=6`);
  let area = null;
  for (const a of cand.body || []) {
    const kids = await rest(`areas?select=id&parent_id=eq.${encodeURIComponent(a.id)}&limit=1`);
    if (Array.isArray(kids.body) && kids.body.length === 0) { area = a; break; }
  }
  if (!area) throw new Error("no leaf area found to file the probe under");
  console.log(`  ${area.id}  "${area.name}"  route_count ${area.route_count}`);

  // every ancestor's cached count, to reconcile at the end
  const ancIds = String(area.path || "").split(".").filter(Boolean);
  const before = await rest(`areas?select=id,route_count&id=in.(${ancIds.map(encodeURIComponent).join(",")})`);
  const baseline = Object.fromEntries((before.body || []).map((a) => [a.id, a.route_count]));
  console.log(`  ${Object.keys(baseline).length} ancestor(s) baselined`);

  // refuse to collide with a real climb
  const dup = await rest(`routes?select=id&area_id=eq.${encodeURIComponent(area.id)}&name=eq.${encodeURIComponent(ROUTE_NAME)}`);
  if (Array.isArray(dup.body) && dup.body.length) throw new Error("probe name already exists — aborting");

  // ── 2. throwaway PLAIN user (never an admin — see the header) ────────────────
  step("create a throwaway account on the reserved .invalid domain");
  const email = `ui-approve-${STAMP}@${DOMAIN}`;
  const password = `Qa!${Math.random().toString(36).slice(2, 12)}Aa1`;
  const cu = await fetch(`${URL_}/auth/v1/admin/users`, { method: "POST", headers: svcH,
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { name: "QA Approval Probe" } }) });
  const cub = await cu.json();
  if (!cub?.id) throw new Error(`create user failed: ${JSON.stringify(cub).slice(0, 200)}`);
  user = { id: cub.id, email, password };
  ok(`user ${user.id}`);

  const si = await fetch(`${URL_}/auth/v1/token?grant_type=password`, { method: "POST",
    headers: { apikey: ANON, "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
  const sib = await si.json();
  if (!sib?.access_token) throw new Error(`sign in failed: ${JSON.stringify(sib).slice(0, 200)}`);
  const JWT = sib.access_token;
  ok("signed in — real JWT, so auth.uid() is this account and RLS is live");

  // ── 3. submit, exactly as AddRoute does ──────────────────────────────────────
  step("submit a new_route proposal as that signed-in user");
  const proposal = {
    name: ROUTE_NAME, discipline: "rock", rockStyle: "trad", grade: "5.10a", pitchCount: "3",
    length: "400", gain: "1200", dist: "2.5", loss: "300",
    rock: "granite", aspect: "NE", approach: "QA probe approach prose.",
    season: "Jul-Sep", commit: "II", descentText: "QA probe descent prose.",
    protRating: "R", fa: "QA Probe, 1970", crux: "thin hands to a slopey topout",
    landing: "flat, clean", pads: "4", startType: "Stand",
    rap: "2 raps", turn: "2pm", comms: "no signal",
    style: ["Crack"], haz: ["Rockfall"], gear: { pads: "4" }, beta: "QA probe beta prose.",
    areaName: area.name, source: "My own ascent", sourceNote: null, climbed: true, photoCount: 0,
  };
  const ins = await rest(`contributions?select=*`, { method: "POST",
    body: JSON.stringify({ kind: "new_route", area_id: area.id, route_id: null, field: null, value: proposal }),
    headers: { ...userH(JWT), Prefer: "return=representation" } });
  if (ins.status !== 201 || !ins.body?.[0]?.id) throw new Error(`submit failed (${ins.status}): ${JSON.stringify(ins.body).slice(0, 250)}`);
  contribId = ins.body[0].id;
  ok(`contribution ${contribId}  status=${ins.body[0].status}  contributor=${ins.body[0].contributor === user.id ? "stamped from the JWT" : ins.body[0].contributor}`);
  if (ins.body[0].status !== "pending") bad(`submitter set status to "${ins.body[0].status}" — the 0127 trigger should force pending`);
  else ok("status forced to pending by trg_contribution_status (a submitter cannot self-approve)");

  // ── 3b. the gate holds for this (genuinely non-admin) account ────────────────
  step("a non-admin cannot approve — checked with a real non-admin, not a flag flipped back");
  const gn = gradeNumFor(proposal.grade, proposal.discipline);
  console.log(`  gradeNumFor("${proposal.grade}", "${proposal.discipline}") = ${gn}`);
  const deny = await fetch(`${URL_}/rest/v1/rpc/approve_new_route`, { method: "POST", headers: userH(JWT),
    body: JSON.stringify({ p_contribution_id: contribId, p_grade_num: gn }) });
  const denyB = await deny.json();
  if (deny.status === 200) bad("a NON-ADMIN approved a route — the gate is open");
  else ok(`refused: ${String(denyB.message || "").slice(0, 80)}`);

  // ── 4. approve, through the RPC the review UI calls ──────────────────────────
  const ADMIN_JWT = process.env.ADMIN_JWT;
  if (!ADMIN_JWT) {
    step("approval half SKIPPED — no ADMIN_JWT supplied");
    console.log("  The submit half above is proven. The approval itself is NOT, and this script");
    console.log("  will not grant itself admin to fake it (see the header). Re-run as:");
    console.log("    ADMIN_JWT=<an admin's access token> node scripts/oneoff/e2e-add-route-approval.mjs");
    throw new Error("SKIP");
  }
  step("approve it — the exact call RouteProposals.jsx makes");
  const ap = await fetch(`${URL_}/rest/v1/rpc/approve_new_route`, { method: "POST", headers: userH(ADMIN_JWT),
    body: JSON.stringify({ p_contribution_id: contribId, p_grade_num: gn }) });
  const apb = await ap.json();
  if (ap.status !== 200 || typeof apb !== "string") throw new Error(`approve failed (${ap.status}): ${JSON.stringify(apb).slice(0, 250)}`);
  routeId = apb;
  ok(`approved -> route id ${routeId}`);

  const expectId = `${area.id}_zz_qa_approval_probe_${STAMP.toLowerCase()}`;
  if (routeId !== expectId) bad(`id convention: expected ${expectId}, got ${routeId}`);
  else ok("id minted as area_id || '_' || route_slug(name)");

  // ── 5. did every column land? ────────────────────────────────────────────────
  step("read the row back — all 34 columns the proposal can fill");
  const got = (await rest(`routes?select=*&id=eq.${encodeURIComponent(routeId)}`)).body?.[0];
  if (!got) throw new Error("approved route not readable");

  const EXPECT = {
    area_id: area.id, name: ROUTE_NAME, classic: false, auto_generated: false,
    grade: "5.10a", grade_num: gn, discipline: "rock", pitches: 3,
    length_m: 122, gain_ft: 1200, loss_ft: 300, dist_km: 4.023,
    aspect: "NE", approach: proposal.approach, season: "Jul-Sep", commitment: "II",
    descent_text: proposal.descentText, fa: proposal.fa, beta: proposal.beta,
    rappels: "2 raps", turnaround: "2pm", comms: "no signal",
    prot_rating: "R", start_type: "Stand", landing: "flat, clean", pads: 4,
    rock: "granite", crux: proposal.crux, source: "community",
  };
  for (const [k, want] of Object.entries(EXPECT)) {
    const g = got[k];
    const same = (typeof want === "number" && typeof g === "number") ? Math.abs(g - want) < 0.01 : g === want;
    if (!same) bad(`${k}: expected ${JSON.stringify(want)}, got ${JSON.stringify(g)}`);
  }
  const arrOk = (k, want) => Array.isArray(got[k]) && got[k].length === 1 && got[k][0] === want;
  if (!arrOk("features", "Crack")) bad(`features: ${JSON.stringify(got.features)}`);
  if (!arrOk("hazards", "Rockfall")) bad(`hazards: ${JSON.stringify(got.hazards)}`);
  if (!got.gear || got.gear.pads !== "4") bad(`gear jsonb: ${JSON.stringify(got.gear)}`);
  if (!got.verif?.community_submitted || got.verif.submitted_by !== user.id || !got.verif.approved_by) {
    bad(`verif provenance: ${JSON.stringify(got.verif).slice(0, 160)}`);
  } else if (got.verif.approved_by === user.id) {
    bad("approved_by equals the SUBMITTER — a self-approval slipped through");
  } else ok("verif records submitter and a DIFFERENT approver, plus the proposal verbatim");
  if (got.verif?.proposal?.rockStyle !== "trad") bad("verif.proposal did not preserve rockStyle (the one key with no column)");
  else ok("rockStyle — the only key with no column — survives in verif.proposal");
  if (fails === 0) ok(`all ${Object.keys(EXPECT).length} scalar columns + 3 arrays/jsonb correct`);

  const c2 = (await rest(`contributions?select=status,reviewed_by&id=eq.${contribId}`)).body?.[0];
  if (c2?.status !== "approved" || !c2.reviewed_by) bad(`contribution not marked approved by the approver: ${JSON.stringify(c2)}`);
  else ok("contribution marked approved, reviewed_by set to the admin");

  // ── 6. refuses a duplicate ───────────────────────────────────────────────────
  step("the (area_id, name) duplicate refusal actually fires");
  const dup2 = await rest(`contributions?select=id`, { method: "POST",
    body: JSON.stringify({ kind: "new_route", area_id: area.id, route_id: null, field: null, value: proposal }),
    headers: { ...userH(JWT), Prefer: "return=representation" } });
  const dupId = dup2.body?.[0]?.id;
  if (dupId) {
    const ap2 = await fetch(`${URL_}/rest/v1/rpc/approve_new_route`, { method: "POST", headers: userH(ADMIN_JWT),
      body: JSON.stringify({ p_contribution_id: dupId, p_grade_num: gn }) });
    const b2 = await ap2.json();
    if (ap2.status === 200) bad("a second identical route was approved — the duplicate refusal did not fire");
    else ok(`refused: ${String(b2.message || "").slice(0, 90)}`);
    await rest(`contributions?id=eq.${dupId}`, { method: "DELETE" });
  }

} catch (e) {
  if (e.message === "SKIP") skipped = true;
  else bad(`walk aborted: ${e.message}`);
} finally {
  // ── teardown, verified rather than trusted ─────────────────────────────────
  step("teardown");
  if (routeId) {
    await rest(`routes?id=eq.${encodeURIComponent(routeId)}`, { method: "DELETE" });
    const left = (await rest(`routes?select=id&id=eq.${encodeURIComponent(routeId)}`)).body;
    Array.isArray(left) && left.length === 0 ? ok(`route ${routeId} deleted`) : bad(`ROUTE STILL PRESENT: ${routeId}`);
  }
  if (contribId) {
    await rest(`contributions?id=eq.${contribId}`, { method: "DELETE" });
    const left = (await rest(`contributions?select=id&id=eq.${contribId}`)).body;
    Array.isArray(left) && left.length === 0 ? ok("contribution deleted") : bad(`CONTRIBUTION STILL PRESENT: ${contribId}`);
  }
  if (user) {
    await fetch(`${URL_}/auth/v1/admin/users/${user.id}`, { method: "DELETE", headers: svcH });
    const chk = await fetch(`${URL_}/auth/v1/admin/users/${user.id}`, { headers: svcH });
    chk.status === 404 || chk.status === 403 ? ok("account deleted") : bad(`ACCOUNT STILL PRESENT (${chk.status}): ${user.id}`);
    const prof = (await rest(`profiles?select=id,is_admin&id=eq.${user.id}`)).body;
    Array.isArray(prof) && prof.length === 0 ? ok("profile row gone (admin flag with it)") : bad(`PROFILE STILL PRESENT: ${JSON.stringify(prof)}`);
  }
  const orphans = (await rest(`routes?select=id&name=like.ZZ%20QA%20Approval%20Probe*`)).body;
  Array.isArray(orphans) && orphans.length === 0 ? ok("no probe routes remain anywhere") : bad(`ORPHANS: ${JSON.stringify(orphans)}`);

  console.log(
    fails > 0 ? `\n${fails} FAILURE(S) — read the teardown lines above before anything else`
    : skipped ? "\nINCOMPLETE — submit half proven, approval NOT walked (no ADMIN_JWT). Nothing left behind."
    : "\nPASS — the add-route chain works end to end, and nothing was left behind");
  process.exit(fails === 0 ? 0 : 1);
}
