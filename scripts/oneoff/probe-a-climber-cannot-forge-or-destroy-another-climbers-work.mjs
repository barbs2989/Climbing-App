// Can a second real climber FORGE your identity, or DESTROY your work?
//
// Every existing check on this asks the UI (does the app offer the control?) and none asks the
// DATABASE. `check:photo-removal` is the clearest case: it proves only your own photo strip renders
// a remove button. An attacker does not use the button. So the question of whether RLS refuses has
// never been put, on any of these paths.
//
// FORGERY — three columns name WHO DID SOMETHING, and all three are client-supplied:
//
//   contributions.contributor  0165 pins it to auth.uid(). Its own column comment states the stake:
//                              "consensus counts DISTINCT contributors, so a client-supplied value
//                              lets one account manufacture '3 climbers agree'." That is the gate
//                              deciding whether a correction goes live on a route the whole catalog
//                              reads. And lib/db.js `submitContribution` passes a caller-supplied
//                              `contributor` through VERBATIM — it only fills it in when null — so
//                              the policy is not defence in depth, it is the only thing there.
//   vouches.from_id            0038 pins it to auth.uid(). A vouch is a trust signal FROM SOMEONE
//                              ELSE; forging one raises your own server trust score (1 pt each),
//                              and trust gates joining a group at 55.
//   user_reports.reporter      0165 allows null-or-self: a signed-out report is intended,
//                              impersonating another account is not.
//
// DESTRUCTION — two paths reach somebody else's row:
//
//   contributions DELETE       0151, scoped to kind='photo' AND contributor = auth.uid()::text.
//   climb_logs    ALL          0037 `manage own logs` USING (user_id = auth.uid()) with NO with-check,
//                              so Postgres falls back to USING for the check. A logged climb is a
//                              trip report other climbers read and it feeds the trust score.
//
// A NOTE ON WHY THIS IS WORTH MEASURING RATHER THAN READING. 0002 shipped
// `"anyone can contribute" ... with check (true)`; policies are OR'd, so if that one were still live
// 0165 would be bypassed entirely. 0080 drops it, and 0080's own header says "Confirm: expect exactly
// one INSERT policy" — an instruction nothing runs. This probe answers it empirically: a stray
// permissive policy makes the attack below simply succeed.
//
// WHY TWO ACCOUNTS: the service role bypasses RLS, so a service-key probe reports success either
// way. Everything under test goes through the anon key plus that climber's own JWT.
//
// A STATUS CODE DECIDES NOTHING. PostgREST answers a with-check violation 403, a zero-row PATCH 200
// and a zero-row DELETE 204 — the last two are indistinguishable from success. Every attack is
// settled by reading the row back with the service key, which sees everything.
//
// CLEANUP IS EXPLICIT, and that is not tidiness. `contributions.contributor` is plain `text` with NO
// foreign key, and `user_reports.reporter` is `on delete set null` — so BOTH survive the account
// delete. A leaked report would sit in the moderation queue forever as an anonymous complaint about
// a fixture account. Rows are tagged and removed with a read-back.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { createFixture } from "../lib/ui-fixture.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const envFile = (f) => { try { return fs.readFileSync(path.join(ROOT, f), "utf8"); } catch { return ""; } };
const envText = envFile(".env") + "\n" + envFile(".env.local");
const envVal = (k) => process.env[k] ?? (envText.match(new RegExp("^\\s*" + k + "\\s*=\\s*(\\S+)", "m")) || [])[1];

const SUPA = (envVal("VITE_SUPABASE_URL") || "").replace(/\/$/, "");
const ANON = envVal("VITE_SUPABASE_ANON_KEY");
const SERVICE = envVal("SUPABASE_SERVICE_KEY");
if (!SUPA || !ANON || !SERVICE) { console.error("needs the Supabase url, anon key and service key."); process.exit(1); }

const log = (...a) => console.log(...a);
let bad = 0, asserted = 0;
const must = (c, m) => { asserted++; console.log(`  ${c ? "ok   " : "FAIL "} ${m}`); if (!c) bad++; };
const dead = (m) => { throw new Error(m); };  // never process.exit(): it skips `finally`

// TWO TRAPS HERE, AND BOTH MAKE A PERMITTED WRITE LOOK LIKE A REFUSED ONE.
//
// 1. AN RLS REFUSAL ARRIVES AS 401 FOR THE ANON ROLE AND 403 FOR AN AUTHENTICATED ONE. Same
//    refusal, two status codes — so a probe that reads 401 as "malformed request" reports a real
//    policy decision as its own bug, and one that reads it as "auth layer" never looks at the body.
//    Judge on the PostgREST error code (42501) instead. This project's anon key is also
//    `sb_publishable_...` rather than a JWT, which makes the auth-layer story superficially
//    plausible; it is not what happens.
//
// 2. `Prefer: return=representation` MAKES AN INSERT READ THE NEW ROW BACK, so it needs the SELECT
//    policy to admit it as well. `user_reports` SELECT is `reporter = auth.uid()`, which a NULL
//    reporter cannot satisfy — so a signed-out report is INSERTABLE and un-readable, and asking for
//    the representation turns a permitted write into 42501. 0078 and 0079 both record this;
//    `fileUserReport` in lib/db.js omits `.select()` for exactly this reason. Ask for the
//    representation only when the row is actually needed back.
async function req(key, jwt, method, pathQ, body, opts) {
  const h = { apikey: key, "Content-Type": "application/json" };
  if (jwt) h.Authorization = `Bearer ${jwt}`;
  const wantRow = !opts || opts.represent !== false;
  if ((method === "POST" || method === "PATCH") && wantRow) h.Prefer = "return=representation";
  const r = await fetch(`${SUPA}/rest/v1/${pathQ}`, { method, headers: h, body: body ? JSON.stringify(body) : undefined });
  let out = null; try { out = await r.json(); } catch {}
  return { status: r.status, body: out };
}
const asUser = (jwt, m, p, b, o) => req(ANON, jwt, m, p, b, o);
const asAnon = (m, p, b, o) => req(ANON, null, m, p, b, o);   // no session at all: auth.uid() is null
const asService = (m, p, b) => req(SERVICE, SERVICE, m, p, b);

async function signIn(email, password) {
  const r = await fetch(`${SUPA}/auth/v1/token?grant_type=password`, {
    method: "POST", headers: { apikey: ANON, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const j = await r.json();
  if (!j.access_token) dead(`could not sign in as ${email}`);
  return j.access_token;
}

const TAG = process.env.GITHUB_RUN_ID || `local-${process.pid}-${Date.now()}`;
const ROUTE_ID = "wa_mount_baker_north_ridge";   // the fixture's route
const GHOST = crypto.randomUUID();               // a third identity belonging to nobody
let fixture = null;

// Every contribution this run writes carries TAG inside `value`, so cleanup and the
// distinct-contributor count below can find its own rows and nobody else's.
const mine = (rows) => (Array.isArray(rows) ? rows : []).filter((r) => JSON.stringify(r.value || "").includes(TAG));
const myContribs = async () =>
  mine((await asService("GET", `contributions?route_id=eq.${ROUTE_ID}&select=id,contributor,kind,value`)).body);

try {
  fixture = await createFixture(log);
  if (!fixture.mate || !fixture.mate.password) dead("no mate password — this probe must write AS the second climber.");
  const ownerTok = await signIn(fixture.owner.email, fixture.owner.password);
  const mateTok  = await signIn(fixture.mate.email,  fixture.mate.password);

  // ── VACUITY GUARD ───────────────────────────────────────────────────────────────────────────
  // Every refusal below only discriminates if the attacker is a real authenticated climber whose
  // OWN writes land. A policy refusing everything would pass every attack assertion while having
  // broken contributing entirely.
  log("\n  CONTROL — the mate is a real climber who CAN contribute as themselves:");
  const ctl = await asUser(mateTok, "POST", "contributions",
    { route_id: ROUTE_ID, kind: "field", field: "descent", value: { note: `control ${TAG}` }, contributor: fixture.mate.id });
  must(ctl.status === 201, `a signed-in climber's own contribution lands (http ${ctl.status})`);

  // ── 1. FORGING A CONSENSUS (0165) ───────────────────────────────────────────────────────────
  log("\n  ATTACK — one account manufactures \"3 climbers agree\" by supplying other contributors:");
  const forgeOwner = await asUser(mateTok, "POST", "contributions",
    { route_id: ROUTE_ID, kind: "field", field: "descent", value: { note: `forged-owner ${TAG}` }, contributor: fixture.owner.id });
  const forgeGhost = await asUser(mateTok, "POST", "contributions",
    { route_id: ROUTE_ID, kind: "field", field: "descent", value: { note: `forged-ghost ${TAG}` }, contributor: GHOST });
  const forgeAnon = await asUser(mateTok, "POST", "contributions",
    { route_id: ROUTE_ID, kind: "field", field: "descent", value: { note: `forged-anon ${TAG}` }, contributor: "anon" });

  const after = await myContribs();
  const byContributor = new Set(after.map((r) => r.contributor));
  must(!after.some((r) => r.contributor === fixture.owner.id),
    `a climber cannot file a contribution AS another real account (http ${forgeOwner.status})`);
  must(!after.some((r) => r.contributor === GHOST),
    `...nor as an invented third identity (http ${forgeGhost.status}) — the move that fabricates a majority`);
  must(!after.some((r) => r.contributor === "anon"),
    `...nor as the literal "anon" fallback (http ${forgeAnon.status})`);
  // THE ASSERTION THAT SPEAKS TO THE STAKE. The gate counts DISTINCT contributors, so what matters
  // is not that each insert was refused but that one account is left holding exactly one identity.
  must(byContributor.size === 1 && byContributor.has(fixture.mate.id),
    `after four attempts this account holds ${byContributor.size} distinct contributor identity, not 3 (${[...byContributor].join(", ")})`);

  // ── 2. DESTROYING ANOTHER CLIMBER'S PHOTO (0151) ────────────────────────────────────────────
  log("\n  A photo belongs to the climber who posted it:");
  const photo = await asUser(ownerTok, "POST", "contributions",
    { route_id: ROUTE_ID, kind: "photo", value: { url: `https://example.invalid/${TAG}.jpg` }, contributor: fixture.owner.id });
  const photoId = (photo.body && photo.body[0] && photo.body[0].id) || null;
  must(photo.status === 201 && photoId, `the owner posts a route photo (http ${photo.status})`);

  const steal = await asUser(mateTok, "DELETE", `contributions?id=eq.${photoId}`);
  const stillThere = await asService("GET", `contributions?id=eq.${photoId}&select=id`);
  must(Array.isArray(stillThere.body) && stillThere.body.length === 1,
    `another climber CANNOT delete it (http ${steal.status}) — a 204 is not evidence a row went`);

  const ownDel = await asUser(ownerTok, "DELETE", `contributions?id=eq.${photoId}`);
  const gone = await asService("GET", `contributions?id=eq.${photoId}&select=id`);
  must(Array.isArray(gone.body) && gone.body.length === 0,
    `...and the owner CAN take their own photo down (http ${ownDel.status}) — so the refusal above is about authorship`);

  // ── 3. FORGING A TRUST SIGNAL (0038 + 0169) ─────────────────────────────────────────────────
  log("\n  A vouch is a trust signal FROM SOMEONE ELSE:");
  const forgedVouch = await asUser(mateTok, "POST", "vouches",
    { from_id: fixture.owner.id, to_id: fixture.mate.id, reason: `forged ${TAG}` });
  const vouchRows = await asService("GET", `vouches?to_id=eq.${fixture.mate.id}&select=from_id,reason`);
  must(!(vouchRows.body || []).some((v) => v.from_id === fixture.owner.id),
    `a climber cannot write a vouch FOR THEMSELVES in another climber's name (http ${forgedVouch.status})`);

  const selfVouch = await asUser(mateTok, "POST", "vouches",
    { from_id: fixture.mate.id, to_id: fixture.mate.id, reason: `self ${TAG}` });
  const selfRows = await asService("GET", `vouches?from_id=eq.${fixture.mate.id}&to_id=eq.${fixture.mate.id}&select=id`);
  must(Array.isArray(selfRows.body) && selfRows.body.length === 0,
    `...nor vouch for themselves directly (http ${selfVouch.status}, 0169's CHECK constraint)`);

  const realVouch = await asUser(mateTok, "POST", "vouches",
    { from_id: fixture.mate.id, to_id: fixture.owner.id, reason: `real ${TAG}` });
  must(realVouch.status === 201, `CONTROL: a genuine vouch for a partner still works (http ${realVouch.status})`);

  // ── 4. REWRITING SOMEBODY ELSE'S TRIP REPORT (0037) ─────────────────────────────────────────
  log("\n  A logged climb is the climber's own record:");
  const logRow = await asService("GET", `climb_logs?user_id=eq.${fixture.owner.id}&select=id,notes,stars`);
  const owned = (logRow.body || [])[0];
  if (!owned) dead("the fixture's climb_log is missing — nothing to attack.");

  const rewrite = await asUser(mateTok, "PATCH", `climb_logs?id=eq.${owned.id}`, { notes: `rewritten ${TAG}`, stars: 1 });
  const afterRewrite = await asService("GET", `climb_logs?id=eq.${owned.id}&select=notes,stars`);
  const nowIs = (afterRewrite.body || [])[0] || {};
  must(nowIs.notes === owned.notes,
    `another climber cannot rewrite the notes (still "${nowIs.notes}", http ${rewrite.status} — a zero-row PATCH answers 200)`);
  must(nowIs.stars === owned.stars, `...nor restar it (still ${nowIs.stars})`);

  const wipe = await asUser(mateTok, "DELETE", `climb_logs?id=eq.${owned.id}`);
  const logStill = await asService("GET", `climb_logs?id=eq.${owned.id}&select=id`);
  must(Array.isArray(logStill.body) && logStill.body.length === 1,
    `...nor delete it (http ${wipe.status})`);

  const ownEdit = await asUser(ownerTok, "PATCH", `climb_logs?id=eq.${owned.id}`, { notes: `own edit ${TAG}` });
  const afterOwn = await asService("GET", `climb_logs?id=eq.${owned.id}&select=notes`);
  must(((afterOwn.body || [])[0] || {}).notes === `own edit ${TAG}`,
    `CONTROL: the climber CAN edit their own report (http ${ownEdit.status})`);

  // ── 5. FILING A SAFETY REPORT AS SOMEBODY ELSE (0165) ───────────────────────────────────────
  log("\n  A report says who filed it:");
  const impersonated = await asUser(mateTok, "POST", "user_reports",
    { reporter: fixture.owner.id, reported_id: fixture.mate.id, reported_name: `probe ${TAG}`, reason: "other", detail: TAG });
  const repRows = await asService("GET", `user_reports?detail=eq.${TAG}&select=id,reporter`);
  must(!(repRows.body || []).some((r) => r.reporter === fixture.owner.id),
    `a climber cannot file a report in another climber's name (http ${impersonated.status})`);

  const ownReport = await asUser(mateTok, "POST", "user_reports",
    { reporter: fixture.mate.id, reported_id: fixture.owner.id, reported_name: `probe ${TAG}`, reason: "other", detail: TAG });
  must(ownReport.status === 201, `CONTROL: they CAN file one as themselves (http ${ownReport.status})`);

  // Documented as deliberate in 0165: "a signed-out report is intended". Worth confirming, because
  // a policy tightened until it refuses this has broken reporting for anyone not signed in.
  // No representation asked for: the row is deliberately un-readable by the reporter who filed it,
  // which is the privacy behaviour rather than something to work around. So the write is confirmed
  // by a service-key read, which is what every other attack here is settled by anyway.
  const anonReport = await asAnon("POST", "user_reports",
    { reported_id: fixture.owner.id, reported_name: `probe ${TAG}`, reason: "other", detail: TAG },
    { represent: false });
  const anonLanded = await asService("GET", `user_reports?detail=eq.${TAG}&reporter=is.null&select=id`);
  must(Array.isArray(anonLanded.body) && anonLanded.body.length === 1,
    `CONTROL: a signed-out climber CAN still file a report (http ${anonReport.status}, ${(anonLanded.body || []).length} row) — deliberate, per 0165`);

} catch (e) {
  console.error("\n" + String(e && e.stack ? e.stack : e).slice(0, 900));
  bad++;
} finally {
  // NEITHER of these tables cascades on account delete — `contributions.contributor` is plain text
  // with no FK, `user_reports.reporter` is `on delete set null`. Read back rather than trusting the
  // status: this repo has a 204 on record reading as a DELETE that RLS had refused.
  await asService("DELETE", `user_reports?detail=eq.${TAG}`).catch(() => {});
  const repLeft = await asService("GET", `user_reports?detail=eq.${TAG}&select=id`).catch(() => ({ body: [] }));
  const rn = Array.isArray(repLeft.body) ? repLeft.body.length : -1;
  if (rn !== 0) { console.error(`LEAKED: ${rn} user_reports row(s) survived cleanup.`); bad++; }
  else log("  reports removed.");

  const left = await myContribs().catch(() => []);
  for (const r of left) await asService("DELETE", `contributions?id=eq.${r.id}`).catch(() => {});
  const cn = (await myContribs().catch(() => [])).length;
  if (cn !== 0) { console.error(`LEAKED: ${cn} contributions row(s) survived cleanup.`); bad++; }
  else log(`  contributions removed (${left.length}).`);

  if (fixture) {
    const leaked = await fixture.cleanup().catch((e) => [`cleanup threw: ${e}`]);
    if (leaked && leaked.length) { console.error("LEAKED: " + leaked.join(", ")); bad++; }
    else log("  fixture removed.");
  }
}

console.log(bad ? `\n${bad} of ${asserted} assertion(s) failed.` : `\nok — ${asserted} assertions.`);
process.exit(bad ? 1 : 0);
