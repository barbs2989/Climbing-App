#!/usr/bin/env node
/**
 * Does a filed float plan survive a reload — and does it stay OUT of the wrong hands?
 *
 * The eleven-field form (vehicle, parking, depart, TURNAROUND, HARD RETURN, comms, emergency
 * contact) was a plain `useState` at both call sites and reached no storage at all. #1577/#1581
 * fixed the TAB-SWITCH unmount; surviving a sub-tab switch is not surviving a reload, and nothing
 * had asked the second question. A DIFFERENT, smaller object ({filedAt, contact, returnBy}) is
 * what `crews.float_plan` holds, filed by another control — this is not that column.
 *
 * It runs the REAL exports from lib/offline.js over the shared IndexedDB shim, so the thing under
 * test is the shipped writer rather than a retyped copy of it. No browser, no database.
 *
 * THE NEGATIVE ASSERTIONS ARE THE LOAD-BEARING HALF. A change that simply persisted everything
 * would satisfy every round-trip assertion here and be wrong twice:
 *   - `checkedIn` must NOT come back. It is a claim about one trip's OUTCOME, so reviving it for
 *     a later trip on the same route states a safety fact that has not happened. Losing it costs
 *     a tap; reviving it wrongly is a false "✓ Checked In Safe". Not symmetric.
 *   - a plan must NOT cross accounts. This form holds somebody's emergency contact, so signing
 *     out must not hand it to the next person on the same phone.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { installIdbShim } from "../lib/idb-shim.mjs";

installIdbShim();
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

/* lib/offline.js imports `./supabase` extensionless, which node ESM cannot resolve, and
 * lib/supabase.js reads import.meta.env at module scope. Both traps are recorded in CLAUDE.md and
 * both are handled the way probe-offline-pack-roundtrip.mjs handles them — bundling with a stub
 * rather than re-typing the writer, because a retyped copy would agree with itself whatever the
 * shipped code did, which is the entire question. */
const STUB = "export const supabase = {}; export const USE_DB = false;";
const tmp = fs.mkdtempSync(path.join(ROOT, ".probe-floatplan-"));
process.on("exit", function () { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {} });
let savedFloatPlan, saveFloatPlan;
try {
  const out = path.join(tmp, "offline.mjs");
  await build({
    entryPoints: [path.join(ROOT, "lib/offline.js")],
    bundle: true, format: "esm", platform: "node", outfile: out,
    define: { "import.meta.env": "{}" },
    plugins: [{
      name: "stub-supabase",
      setup(b) {
        b.onResolve({ filter: /^\.\/supabase$/ }, () => ({ path: "stub:supabase", namespace: "stub" }));
        b.onLoad({ filter: /.*/, namespace: "stub" }, () => ({ contents: STUB, loader: "js" }));
      },
    }],
  });
  const mod = await import(out);
  savedFloatPlan = mod.savedFloatPlan;
  saveFloatPlan = mod.saveFloatPlan;
} catch (e) {
  console.error("FAIL: could not bundle lib/offline.js — nothing was checked. " + (e.stack || e.message));
  fs.rmSync(tmp, { recursive: true, force: true });
  process.exit(1);
}
// Fail closed: a bundle that resolved but exported neither would make every assertion below throw
// or pass vacuously.
if (typeof savedFloatPlan !== "function" || typeof saveFloatPlan !== "function") {
  console.error("FAIL: lib/offline.js does not export both float-plan helpers — nothing was checked.");
  fs.rmSync(tmp, { recursive: true, force: true });
  process.exit(1);
}

let ok = 0, bad = 0;
const is = (cond, msg) => { if (cond) { ok++; console.log("  ok    " + msg); } else { bad++; console.log("  FAIL  " + msg); } };

// The eleven fields floatPlanState() declares, filled the way a climber would.
const FORM = {
  route: "North Ridge", partner: "Robin", party: "2", vehicle: "grey Tacoma, plate ABC-1234",
  lot: "upper lot, second pullout", depart: "04:30", turn: "13:00", ret: "21:00",
  comms: "InReach, checking in at the col", contact: "Sam 555-0142", notes: "bailing via the gully if the wind gets up",
};

// ── 0. a broken store degrades to null rather than throwing ───────────────────
// A float plan must never be the thing that takes the page down. This runs FIRST because
// `openDb` memoises its connection: after one successful open, breaking indexedDB is invisible
// and the read is served from the cache. An open error resets that memo, so the sections below
// still see a live store.
// The stub fails the way IndexedDB actually fails — ASYNCHRONOUSLY, via req.onerror. A stub that
// threw synchronously out of `open()` is unfaithful AND poisons the run: openDb() memoises
// `_dbPromise`, and it resets that memo only in its `onerror` handler (lib/offline.js says so in
// its own comment), so a synchronous throw leaves every later caller awaiting the same dead
// promise. The first version of this case did exactly that and took the rest of the probe down.
const realIdb = globalThis.indexedDB;
globalThis.indexedDB = { open() { const rq = {}; setTimeout(() => { rq.error = new Error("no store"); if (rq.onerror) rq.onerror(); }, 0); return rq; } };
let threw = false, brokenRead = "unset";
try { brokenRead = await savedFloatPlan("acct-a", "route:wa_north_ridge"); }
catch (e) { threw = true; }
globalThis.indexedDB = realIdb;
is(!threw, "reading a broken store does not throw out of savedFloatPlan");
is(brokenRead === null, "an unreadable store reads null rather than a half-answer");

// ── 1. never stored is not empty ───────────────────────────────────────────────
is(await savedFloatPlan("acct-a", "route:wa_north_ridge") === null,
   "a scope nothing has ever stored reads null, not an empty plan");
is(await savedFloatPlan("acct-a", null) === null,
   "no scope reads null rather than throwing — an un-opted-in call site keeps today's behaviour");

// ── 2. the eleven fields round-trip ────────────────────────────────────────────
await saveFloatPlan("acct-a", "route:wa_north_ridge", { form: FORM, saved: true, checkedIn: false });
const back = await savedFloatPlan("acct-a", "route:wa_north_ridge");
is(!!back, "a stored plan reads back at all");
const missing = Object.keys(FORM).filter((k) => !back || back.form[k] !== FORM[k]);
is(missing.length === 0, `all ${Object.keys(FORM).length} fields survive the round trip${missing.length ? " — lost: " + missing.join(", ") : ""}`);
is(back && back.saved === true, "the saved flag survives, so the summary card comes back rather than a blank form");

// The two that matter most to somebody looking for you.
is(back && back.form.ret === "21:00", "HARD RETURN survives — the field an overdue search keys on");
is(back && back.form.contact === "Sam 555-0142", "the emergency contact survives");

// ── 3. checkedIn is deliberately NOT revived ───────────────────────────────────
await saveFloatPlan("acct-a", "route:checked", { form: FORM, saved: true, checkedIn: true });
const chk = await savedFloatPlan("acct-a", "route:checked");
is(chk && chk.checkedIn === undefined,
   "checkedIn is NOT restored — reviving one trip's outcome would claim a check-in that has not happened");

// ── 4. it does not cross accounts, or scopes ───────────────────────────────────
is(await savedFloatPlan("acct-b", "route:wa_north_ridge") === null,
   "another ACCOUNT on the same device reads null — the emergency contact does not leak on sign-out");
is(await savedFloatPlan("acct-a", "route:somewhere_else") === null,
   "another ROUTE reads null — two objectives do not share one plan");

// ── 5. a deliberate clear is honoured ──────────────────────────────────────────
await saveFloatPlan("acct-a", "route:wa_north_ridge", { form: { ...FORM, contact: "" }, saved: false });
const cleared = await savedFloatPlan("acct-a", "route:wa_north_ridge");
is(cleared && cleared.form.contact === "" && cleared.form.ret === "21:00",
   "clearing one field stores the clear rather than falling back to what was there before");

// ── 6. THE WIRING, AS SOURCE — the half the round trip above cannot see ───────
// Everything above proves the STORE. It would all still pass with the props dropped at a call
// site, because that changes no identifier: `audit:silent-reverts` says in its own closing caveat
// that it cannot see a change of that shape, and the form would silently go back to losing eleven
// fields with every assertion here green. Four links, each asserted where it lives.
const core = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");
const rd = fs.readFileSync(path.join(ROOT, "RouteDetail.jsx"), "utf8");
const app = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");
for (const [label, hay, needle] of [
  ["core imports the two helpers", core, "savedFloatPlan, saveFloatPlan } from \"./lib/offline\""],
  ["FloatPlan accepts who/scope", core, "function FloatPlan({defaults,coords,plan,onPlan,who,scope}"],
  ["FloatPlan WRITES on every change", core, "if(scope)saveFloatPlan(who,scope,next)"],
  ["FloatPlan HYDRATES on mount", core, "savedFloatPlan(who,scope).then("],
  ["SafetyTab accepts who/scope", core, "function SafetyTab({members,meAnswers,onComplete,who,scope})"],
  ["SafetyTab forwards them to FloatPlan", core, "<FloatPlan plan={floatPlan} onPlan={setFloatPlan} who={who} scope={scope}/>"],
  ["App scopes the crew plan by CREW", app, 'scope={safetyCrew?"crew:"+safetyCrew:null}'],
  ["App hands RouteDetail the account", app, "<RouteDetail key={selRoute.id} who={uid}"],
  ["RouteDetail destructures who", rd, "function RouteDetail({route,who,presence,"],
  ["RouteDetail scopes its plan by ROUTE", rd, 'who={who} scope={route.id?"route:"+route.id:null}'],
]) {
  const n = hay.split(needle).length - 1;
  is(n === 1, `${label}${n === 1 ? "" : ` — matched ${n}x, so the chain is broken or ambiguous`}`);
}

// A guard against the hydrate clobbering what somebody is typing, and against latching before the
// read resolves (the check:profile-edit-gate trap, where latching first made one transient failure
// permanent for the session).
is(core.includes("if(v&&!_dirty.current)"), "a stored plan does not overwrite what is already typed");
is(core.indexOf("_hyd.current=true") > core.indexOf("savedFloatPlan(who,scope).then("),
   "the hydrate latch is set AFTER the read resolves, not before it");

fs.rmSync(tmp, { recursive: true, force: true });
console.log(`\n${ok} passed, ${bad} failed`);
process.exit(bad ? 1 : 0);
