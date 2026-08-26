#!/usr/bin/env node
// The two things #1252 left REPORTED on wa_glacier_peak_kennedy_glacier, both now repairable
// from the catalog rather than from research.
//
// 1. road.status states an expiry that has PASSED — "in effect through at least Dec 31, 2025".
//    audit:expiring-closures tier T0. The catalog already holds the current status of the SAME
//    order on a different route: wa_sitkum_spire_standard records Forest Order #06-05-25-02, FS
//    Road 23, "from milepost 3.7 to its terminus at FS Road 27", as "Still closed as of spring
//    2026 per Mt. Baker-Snoqualmie NF alerts". Same road, same milepost, same terminus, same
//    forest — VERIFIED across the catalog rather than assumed from "same road, same milepost",
//    which is exactly the near-identity this catalog has been burned by.
//
//    Note what this trades: T0 (a statement that is false NOW) becomes T3 (as-of-period, a
//    statement that will age). That is an improvement rather than a dodge, and it puts this row
//    where its sibling already sits.
//
// 2. access.closures says the "Mountain Loop Highway/FR 49 corridor TO THIS TRAILHEAD" — false
//    here, because this route's trailhead is White Chuck River, which #1252 established from the
//    row's own four records. Its wilderness-wide first clause and the ranger-district contact are
//    true, so clearing the whole value would lose real information. The clause is EXCISED.
//
// Every replacement fact is lifted from the sibling row or is a deletion. Each edit is an exact
// find -> replace pair that must match EXACTLY ONCE in the live value, so a stale table cannot
// half-apply and nothing can be invented — the shape redact-road-access-citations.mjs uses.
import { selectAll, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const ID = "wa_glacier_peak_kennedy_glacier";
const DONOR = "wa_sitkum_spire_standard";

const [me] = await selectAll("routes", "id,road,access", `id=eq.${ID}`, { pageSize: 10 });
const [donor] = await selectAll("routes", "id,road", `id=eq.${DONOR}`, { pageSize: 10 });
if (!me || !donor) { console.error("FAIL — route or donor missing."); process.exit(1); }

/* Re-assert the donor still says what this repair rests on. If that row has been rewritten, the
   basis is gone and this refuses rather than writing a fact nothing supports any more. */
const dst = String((donor.road || {}).status || "");
for (const need of ["06-05-25-02", "milepost 3.7", "spring 2026"]) {
  if (!dst.includes(need)) { console.error(`REFUSED — the donor no longer says ${JSON.stringify(need)}; the basis for this repair is gone.`); process.exit(1); }
}
console.log(`donor ${DONOR} road.status:\n   ${dst.replace(/\s+/g, " ").slice(0, 260)}\n`);

const EDITS = [
  { col: "road", key: "status",
    find: "in effect through at least Dec 31, 2025",
    repl: "Forest Order #06-05-25-02, still closed as of spring 2026 per Mt. Baker-Snoqualmie NF alerts",
    why: "the stated expiry has passed; the order number and current status come from " + DONOR },
  { col: "access", key: "closures",
    find: "; the Mountain Loop Highway/FR 49 corridor to this trailhead has also seen intermittent landslide closures",
    repl: "",
    why: "this route's trailhead is White Chuck River, not on the FR 49 corridor — the clause is excised, the wilderness-wide statement and the ranger contact are kept" },
];

const patch = {};
for (const e of EDITS) {
  const cur = (me[e.col] || {})[e.key];
  if (typeof cur !== "string") { console.error(`REFUSED — ${e.col}.${e.key} is not text.`); process.exit(1); }
  const n = cur.split(e.find).length - 1;
  if (n !== 1) { console.error(`REFUSED — ${e.col}.${e.key}: the target text appears ${n} time(s), not exactly once. Already repaired, or the value moved on.`); process.exit(1); }
  const next = cur.replace(e.find, e.repl);
  patch[e.col] = { ...(patch[e.col] || me[e.col]), [e.key]: next };
  console.log(`── ${e.col}.${e.key}   (${e.why})`);
  console.log(`   before  ${cur.replace(/\s+/g, " ")}`);
  console.log(`   after   ${next.replace(/\s+/g, " ")}\n`);
}

if (!APPLY) { console.log("(dry run — pass --apply)"); process.exit(0); }
requireServiceKey();
await patchRow("routes", ID, patch);
const [after] = await selectAll("routes", "id,road,access", `id=eq.${ID}`, { pageSize: 10 });
let bad = 0;
for (const e of EDITS) {
  const v = String((after[e.col] || {})[e.key] || "");
  if (v.includes(e.find)) { console.error(`FAILED — ${e.col}.${e.key} still contains the old text.`); bad++; }
}
console.log(bad ? "re-read found the old text still present" : "written and re-read: both stale claims are gone");
console.log(`   road.status     ${String((after.road || {}).status || "").replace(/\s+/g, " ")}`);
console.log(`   access.closures ${String((after.access || {}).closures || "").replace(/\s+/g, " ")}`);
process.exitCode = bad ? 1 : 0;
