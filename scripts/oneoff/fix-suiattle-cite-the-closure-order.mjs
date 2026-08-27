// The Suiattle corridor is the CLEANEST cluster read so far, and that is the finding.
//
// Roughly twenty WA routes describe the Suiattle River Road (FR 26) washout closure, and
// audit:expiring-closures flags exactly ONE of them. The rest already cite USFS closure order
// #06-05-26-03 and its window (2 Apr 2026 - 1 Jan 2028), which is the SELF-LIMITING form the audit
// treats as acceptable: a reader in 2028 can see the claim has lapsed rather than trusting it.
//
// VERIFIED CURRENT before writing, against the Forest Service's own alert page rather than a search
// summary: order 06-05-26-03, effective April 2 2026 to January 1 2028 unless rescinded sooner, FSR
// 26 closed to all motorized vehicles from the Suiattle Mountain Road junction to the Suiattle River
// Trailhead, page last updated 5 June 2026. The catalog's numbers match it exactly.
//
// THIS ADDS NO CLOSURE. The row already says the road is shut at MP 4-4.5; what is copied is the
// ORDER NUMBER and WINDOW that four sibling rows carry, replacing "as of a June 2026 alert" — a
// date the reader cannot judge — with the order's own stated expiry.
// [[a-transient-closure-in-a-permanent-field-becomes-a-lie]]
//
// DELIBERATELY NOT ADDED: the alert also announces temporary bridge construction 15 July - 30 Aug
// 2026. That is a six-week fact in a column nothing re-reads — exactly the defect this audit exists
// to catch, and writing it would reproduce it.
// [[stale-closure-grind-is-half-viable-and-blind-to-missing-ones]]
//
// Exact find -> replace, refused unless `find` matches EXACTLY once in the live value.
import { requireServiceKey, selectAll, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const ORDER = "#06-05-26-03";
const WINDOW = "April 2, 2026 through January 1, 2028 unless rescinded sooner";

/* Split by what each row actually evidences, the correction the FR 6200 applier had to make: a
   witness demanded to carry BOTH the order number and the dates refuses rows that carry one. */
const WITNESSES = [
  { id: "wa_mount_buckindy_scramble", col: "access", key: "closures", needs: "order number", re: /06-05-26-03/ },
  { id: "wa_dome_peak_dome_glacier",  col: "road",   key: "driveNote", needs: "order number", re: /06-05-26-03/ },
  { id: "wa_gunsight_peak_standard",  col: "road",   key: "status",    needs: "end date", re: /1\/1\/2028|January 1,? 2028/ },
];

const EDITS = [
  { id: "wa_dome_peak_indian_summer", col: "road", key: "status",
    find: "confirmed still closed as of a June 2026 Mt. Baker-Snoqualmie NF alert",
    repl: `closed under USFS order ${ORDER}, in effect ${WINDOW}` },
];

if (APPLY) requireServiceKey();

const ids = [...new Set([...EDITS.map(e => e.id), ...WITNESSES.map(w => w.id)])];
const rows = await selectAll("routes", "id,road,access", `id=in.(${ids.join(",")})`);
if (rows.length !== ids.length) { console.error(`read ${rows.length} of ${ids.length} routes — refusing`); process.exit(1); }
const byId = Object.fromEntries(rows.map(r => [r.id, r]));

let ok = true;
for (const w of WITNESSES) {
  const v = byId[w.id] && byId[w.id][w.col] && byId[w.id][w.col][w.key];
  const good = typeof v === "string" && w.re.test(v);
  console.log(`${good ? "witness ok  " : "REFUSE      "}${w.id} ${w.col}.${w.key} — records the ${w.needs}`);
  if (!good) ok = false;
}
for (const need of ["order number", "end date"]) {
  if (!WITNESSES.some(w => w.needs === need)) { console.log(`REFUSE — no witness records the ${need}`); ok = false; }
}
if (!ok) { console.error("\nrefusing — the catalog no longer records the order this copies"); process.exit(1); }

const patches = new Map();
for (const e of EDITS) {
  const key = `${e.id}|${e.col}`;
  const working = patches.get(key) || { id: e.id, col: e.col, obj: { ...byId[e.id][e.col] } };
  const cur = working.obj[e.key];
  if (typeof cur !== "string") { console.log(`REFUSE ${e.id} ${e.col}.${e.key} — not a string`); ok = false; continue; }
  const hits = cur.split(e.find).length - 1;
  if (hits !== 1) { console.log(`REFUSE ${e.id} ${e.col}.${e.key} — find matched ${hits}x, expected 1`); ok = false; continue; }
  const next = cur.replace(e.find, e.repl);
  if (!next.includes(ORDER)) { console.log(`REFUSE ${e.id} — result does not cite the order`); ok = false; continue; }
  working.obj[e.key] = next;
  patches.set(key, working);
  console.log(`\n${e.id}  ${e.col}.${e.key}`);
  console.log(`   -  ${cur}`);
  console.log(`   +  ${next}`);
}
if (!ok) { console.error("\nrefusing to apply"); process.exit(1); }
if (!APPLY) { console.log("\ndry run — pass --apply to write"); process.exit(0); }

for (const p of patches.values()) await patchRow("routes", p.id, { [p.col]: p.obj });

const after = await selectAll("routes", "id,road,access", `id=in.(${EDITS.map(e => e.id).join(",")})`);
let bad = 0;
for (const e of EDITS) {
  const r = after.find(x => x.id === e.id);
  const v = r && r[e.col] && r[e.col][e.key];
  if (typeof v !== "string" || !v.includes(ORDER)) { console.log(`NOT WRITTEN  ${e.id} ${e.col}.${e.key}`); bad++; }
}
console.log(bad ? `\n${bad} edit(s) did not land` : `\nverified: now cites ${ORDER} and its own end date.`);
process.exit(bad ? 1 : 0);
