// Does a route's recommended ALTERNATIVE approach run up a road the catalog itself records as shut?
//
// wa_north_star_mountain_east_route says Holden Village and FSR 8301 are closed, "so the practical
// current approach is via the Phelps Creek Trailhead over Spider Gap instead". The Phelps Creek
// Trailhead sits at the end of FR 6200 — the road this catalog records as gated at milepost 18.2
// under USFS order #06-17-07-2026-11, with wa_cloudy_peak_southwest_slopes saying in as many words
// that the closure cuts off "both Phelps Creek and Trinity trailheads".
//
// If that holds, the row is not merely stale: it redirects a party from one closed approach to
// another closed approach, which is worse than saying nothing. No audit can see it — both halves are
// populated, plausible and rendered, and the contradiction is BETWEEN two routes.
//
// Report-only. Read-only, anon key. Fails closed if either side of the comparison is missing, since
// "no contradiction found" and "the rows moved" print identically otherwise.
import { selectAll } from "../lib/supabase-env.mjs";

// THE FIRST VERSION TESTED "DOES THE ROW NAME PHELPS CREEK", WHICH THE FIX ALSO SATISFIES.
// It kept reporting all three rows after they were repaired, because the repaired text still names
// the trailhead — it just says the road to it is gated too. A detector that fires on its own fix is
// worse than none: it teaches the next reader that the repair did not work. Same mistake made
// earlier in this session on the trailhead-card probe, so it is pinned here rather than re-derived.
//
// The question is whether the row OFFERS the alternative WITHOUT acknowledging the west-side gate.
const OFFERS = /phelps creek|spider gap/i;
const ACKNOWLEDGES = /milepost 18\.2|06-17-07-2026-11|6200 is gated|not a drive-to/i;

const CLAIMANTS = ["wa_north_star_mountain_east_route", "wa_north_star_mountain_cloudy_peak_traverse", "wa_copper_peak_south_route"];
const rows = await selectAll("routes", "id,name,road,access,approach", "id=like.wa_*", { pageSize: 1000 });
if (!rows.length) { console.error("empty read — refusing to report"); process.exit(1); }

/* --inject=revert strips the acknowledgement back out IN MEMORY, so this probe can be shown to fire
   on the defect it names. The expected healthy output is "0 of 3", which is exactly what a probe
   broken by its own fix also prints — the case is what separates them. Never writes. */
if (process.argv.includes("--inject=revert")) {
  let n = 0;
  for (const r of rows) for (const c of ["road", "access"]) {
    const o = r[c]; if (!o || typeof o !== "object") continue;
    for (const k of Object.keys(o)) if (typeof o[k] === "string" && /That is not a drive-to alternative either:.*?closed road\./s.test(o[k])) {
      o[k] = o[k].replace(/\s*That is not a drive-to alternative either:.*?closed road\./s, ""); n++;
    }
  }
  console.log(`[inject=revert] removed the acknowledgement from ${n} value(s) in memory\n`);
  if (!n) { console.error("FAIL — the injection changed nothing, so the case proves nothing"); process.exit(1); }
}

const text = r => {
  const rd = r.road && typeof r.road === "object" ? r.road : {};
  const ac = r.access && typeof r.access === "object" ? r.access : {};
  return [rd.name, rd.status, rd.seasonalGate, rd.driveNote, ac.closures, ac.seasonal, r.approach]
    .filter(v => typeof v === "string").join(" — ");
};

/* The west-side closure has to be established from rows that are NOT under suspicion, or the probe
   is asking the accused to corroborate itself. */
const witnesses = rows.filter(r => !CLAIMANTS.includes(r.id) && /phelps creek/i.test(text(r)));
const shut = witnesses.filter(w => { const t = text(w); return /clos(?:ed|ure)/i.test(t) && /(?:FSR?|forest road) ?6200|chiwawa/i.test(t); });
if (!witnesses.length) { console.error("FAIL — no witness describes the Phelps Creek road at all; cannot judge"); process.exit(1); }
console.log(`${shut.length} of ${witnesses.length} routes describing the Phelps Creek approach record FR 6200 as closed`);
for (const w of shut.slice(0, 3)) console.log(`   e.g. ${w.id}`);
if (!shut.length) { console.log(`\nThis catalog does not record the west road as closed, so it does not contradict the
recommendation. Re-read before acting.`); process.exit(0); }

console.log(`\nRoutes that offer the Spider Gap / Phelps Creek alternative:\n`);
let bad = 0, seen = 0;
for (const id of CLAIMANTS) {
  const r = rows.find(x => x.id === id);
  if (!r) { console.error(`FAIL — ${id} is not in the catalog; the premise has moved`); process.exit(1); }
  const t = text(r);
  if (!OFFERS.test(t)) { console.log(`     ${id} — no longer names the alternative at all`); continue; }
  seen++;
  const ok = ACKNOWLEDGES.test(t);
  if (!ok) bad++;
  console.log(`${ok ? "ok    " : "OFFERS"} ${id}${ok ? " — says the west road is gated too" : " — offers it with NO mention of the west-side gate"}`);
}
if (!seen) { console.error("\nFAIL — no claimant names the alternative; this probe is measuring nothing"); process.exit(1); }

console.log(`\n${bad} of ${seen} offer the alternative as though you could drive to it.\n`);
console.log(bad
  ? `FINDING — these rows redirect a party to a trailhead this catalog says is cut off.
The Phelps Creek Trailhead sits past FR 6200's milepost 18.2 gate, under an order running to
31 Dec 2027. The alternative is still the right LINE — Spider Gap is genuinely how parties reach
these peaks without Holden — but it is not a drive-to start, and the rows present it as one.

The repair is to SAY SO, never to delete the alternative: with Holden shut, Spider Gap is what is
left.`
  : `Every row offering the Spider Gap alternative now states that the west road is gated too.
Nothing here presents a closed trailhead as an open one.`);
process.exitCode = 0;
