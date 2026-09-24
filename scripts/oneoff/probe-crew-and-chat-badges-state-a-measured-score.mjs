#!/usr/bin/env node
/* The crew JOIN-REQUEST card and the CHAT HEADER each printed a trust score for a real climber that
   nobody measured. Both resolved the person correctly and then handed that object to `vScore` — the
   CLIENT model — and a DB-derived profile carries no vouches, no logs, no belay catches and no
   verification, while every one of those denominators still counts against it. So both printed 0,
   which `trustTier` renders as "New" in red: on the card where an organiser decides whether to
   accept a stranger, and beside the name of somebody you may have climbed with for years.

   WHY A PROBE AND NOT A RENDER: effects do not run under renderToStaticMarkup, so a server render
   can only ever show the "no score yet" branch — it would pass against a fix that never displays a
   fetched score at all. This executes the DECISION instead, over every state the surfaces can be in.

   NOTHING HERE IS RETYPED. Both decisions are LIFTED from the app's own source with ANCHOR LOST if
   they move, because a hand-typed copy of a rule agrees with itself whatever the app does — which is
   the entire question. The only transform is turning the JSX element into a marker call, and the
   substitution count is asserted.

   No browser, no database. */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
let pass = 0, fail = 0;
const ok = (m) => { pass++; console.log("  ok    " + m); };
const bad = (m) => { fail++; console.log("  FAIL  " + m); };
const dead = (m) => { console.log("\nBROKEN: " + m); process.exit(1); };

/* ---------------- the app's own helpers, executed ---------------- */
const bundle = path.join(ROOT, ".tmp-crewchat-badges-" + process.pid + ".mjs");
process.on("exit", () => { try { fs.unlinkSync(bundle); } catch {} });
execFileSync("npx", ["esbuild", path.join(ROOT, "ClimbMatchCore.jsx"),
  "--bundle", "--format=esm", "--platform=node", "--jsx=automatic",
  "--define:import.meta.env={}",
  "--external:react", "--external:react-dom", "--external:@tanstack/react-query",
  "--log-level=error", "--outfile=" + bundle], { cwd: ROOT, stdio: ["ignore", "ignore", "inherit"] });

const core = await import(bundle);
for (const n of ["vScore", "trustTier", "realProfileId", "seedIdentity", "useRealTrustScore"])
  if (typeof core[n] !== "function") dead(`core does not export ${n} — ANCHOR LOST`);
const { vScore, trustTier, realProfileId, seedIdentity } = core;

/* ---------------- lift the two decisions ---------------- */
function lift(file, startNeedle, endNeedle, label) {
  const src = fs.readFileSync(path.join(ROOT, file), "utf8");
  const n = src.split(startNeedle).length - 1;
  if (n !== 1) dead(`${label}: its anchor occurs ${n} times in ${file}, expected 1 — ANCHOR LOST`);
  const a = src.indexOf(startNeedle) + startNeedle.length;
  const b = src.indexOf(endNeedle, a);
  if (b < 0) dead(`${label}: no ${JSON.stringify(endNeedle)} after the anchor — ANCHOR LOST`);
  const raw = src.slice(a, b);
  if (raw.length < 40 || raw.length > 400) dead(`${label}: lifted ${raw.length} chars, which is not an expression — ANCHOR LOST`);
  return raw;
}

/* The join-request badge. `<TrustBadge score={X}/>` becomes `B(X)` so the expression can be run;
   the count is asserted, or a lift that silently matched nothing would evaluate to null always. */
/* Anchored on the requester's own NAME, because a bare `marginTop:2` div also opens the crew safety
   check's copy and would lift a paragraph of prose instead. */
const jrRaw = lift("ClimbMatchCore.jsx", `{pubName(c)}</div><div style={{marginTop:2}}>`, `</div>`, "join-request badge");
const jrSubs = (jrRaw.match(/<TrustBadge score=\{/g) || []).length;
if (jrSubs !== 2) dead(`join-request badge: expected 2 TrustBadge elements in the lifted expression, found ${jrSubs} — ANCHOR LOST`);
const jrExpr = jrRaw.replace(/<TrustBadge score=\{([^}]*)\}\/>/g, "B($1)").replace(/^\{|\}$/g, "");
const jrDecide = new Function("c", "realTrust", "seedIdentity", "vScore", "B", "return (" + jrExpr + ");");

/* The chat header's own value. Lifted as a statement and evaluated the same way. */
const chatRaw = lift("ClimbMatch.jsx", `const chatTs=`, `;`, "chat header score");
const chatDecide = new Function("chatWith", "chatRealTrust", "realProfileId", "vScore", "return (" + chatRaw + ");");

const B = (score) => ({ badge: true, score });
const show = (v) => v === null ? "no badge" : `badge ${v.score}  "${trustTier(v.score).label}"`;

/* ---------------- fixtures ---------------- */
const REAL_ID = "8f3c1d2e-aaaa-bbbb-cccc-000000000001";
/* Exactly what useProfilesByIds supplies, plus the _real the card adds. */
const realRequester = { id: REAL_ID, name: "Robin Belay", avatar: null, username: "robinbelay", showName: true, _real: true };
/* The card's last-resort fallback, for a requester no read has resolved. */
const unresolved = { name: "Climber", avatar: null, trustScore: 50 };
/* A seed climber, for whom the client model has every input it needs. */
const seedClimber = { id: 3, name: "Maya Chen", verified: true, communityVouches: 9, routesLogged: 47,
  catchLedger: [1, 2, 3], reliability: 0.9, responseRate: 0.8, partnerCount: 12, conditionsReported: 6,
  floatPlans: 2, years: 4, certifications: ["AIARE 1"], vouches: [] };

console.log("\n=== 1. the crew join-request card ===");

{
  const v = jrDecide(realRequester, {}, seedIdentity, vScore, B);
  console.log("     a real requester, score not yet fetched -> " + show(v));
  if (v === null) ok("a real requester with no measured score gets NO badge, rather than 0 -> \"New\" in red");
  else bad(`a real requester with no measured score still gets ${show(v)} — this is the defect`);
}
{
  const v = jrDecide(realRequester, { [REAL_ID]: 72 }, seedIdentity, vScore, B);
  console.log("     the same requester, server score 72   -> " + show(v));
  if (v && v.score === 72) ok("once the server score arrives the card states THAT number");
  else bad("the fetched server score does not reach the badge — the gate is showing nothing forever");
}
{
  /* 0 is a real, earned score and must not be mistaken for "unknown". */
  const v = jrDecide(realRequester, { [REAL_ID]: 0 }, seedIdentity, vScore, B);
  console.log("     a requester genuinely measured at 0   -> " + show(v));
  if (v && v.score === 0) ok("a measured 0 is still shown — the gate tests null, not falsiness");
  else bad("a genuine server score of 0 is suppressed — `!=null` has become a truthiness test");
}
{
  const v = jrDecide(unresolved, {}, seedIdentity, vScore, B);
  console.log("     the unresolvable fallback             -> " + show(v));
  if (v === null) ok("the \"Climber\" fallback gets no badge — its trustScore:50 was never read by vScore anyway");
  else bad(`the unresolvable fallback still prints ${show(v)} about a climber nobody identified`);
}
{
  const v = jrDecide(seedClimber, {}, seedIdentity, vScore, B);
  console.log("     a SEED requester                      -> " + show(v));
  if (v && v.score > 0) ok("a seed requester keeps the client model, whose inputs it actually has");
  else bad("a seed requester lost its badge — the fix has suppressed a score that was correct");
}

console.log("\n=== 2. the chat header ===");

{
  const v = chatDecide(realRequester, null, realProfileId, vScore);
  console.log("     a real connection, no score fetched   -> " + (v == null ? "no badge" : `badge ${v}`));
  if (v == null) ok("a real connection with no measured score gets NO badge");
  else bad(`a real connection still reads ${v} — "${trustTier(v).label}" — from the client model`);
}
{
  const v = chatDecide(realRequester, 65, realProfileId, vScore);
  console.log("     the same connection, server score 65  -> " + (v == null ? "no badge" : `badge ${v}  "${trustTier(v).label}"`));
  if (v === 65) ok("the fetched server score reaches the chat header");
  else bad("the fetched score does not reach the chat header");
}
{
  const v = chatDecide(seedClimber, null, realProfileId, vScore);
  console.log("     a SEED chat partner                   -> " + (v == null ? "no badge" : `badge ${v}  "${trustTier(v).label}"`));
  if (typeof v === "number" && v > 0) ok("a seed chat partner keeps the client model");
  else bad("a seed chat partner lost its score");
}
{
  const v = chatDecide(null, null, realProfileId, vScore);
  if (v === null) ok("with no chat open the value is null rather than vScore(null)'s neutral 50");
  else bad(`with no chat open the value is ${v} — vScore(null) is 50 and must not leak in as a score`);
}

console.log("\n=== 3. the defect, for the record: what the client model gives these shapes ===");
for (const [label, obj] of [["a real requester", realRequester], ["the fallback", unresolved]]) {
  const s = vScore(obj);
  console.log(`     vScore(${label}) = ${s}  ->  "${trustTier(s).label}"`);
}

console.log(`\n${pass} passed, ${fail} failed.`);
if (fail) process.exit(1);
