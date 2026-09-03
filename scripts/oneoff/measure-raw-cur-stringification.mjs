// The 30 contribute-form fields that show `route.<prop>` RAW as the current value: can any of
// them stringify to "[object Object]"?
//
// #1461 fixed that for the ELEVEN keyed fields, where the culprit was objStr's String(v). Thirty
// more FIELDS entries take `cur: route.<prop>` directly, so they bypass objStr entirely and the
// same coercion happens wherever the form renders `cur`. This asks the question one level out.
//
// The field list is LIFTED from RouteDetail.jsx rather than retyped — a hand list would drift from
// what the form offers, and the drift reads as a column quietly going clean.
//
// TEST THE RENDERED STRING, NOT THE TYPE. `String(["a","b"])` is "a,b" — ugly but readable — and
// an earlier version of the sibling measurement flagged `typeof v === "object"`, which counts
// arrays, and over-reported by a factor of two.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selectAll } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dead = (w) => { console.error(`\nmeasurement FAILED — ${w}. Nothing below was measured.\n`); process.exit(1); };

const rd = fs.readFileSync(path.join(ROOT, "RouteDetail.jsx"), "utf8");
const props = [...new Set([...rd.matchAll(/cur:route\.([A-Za-z_]+)/g)].map((m) => m[1]))];
if (props.length < 20) dead(`lifted only ${props.length} raw-cur field(s) from RouteDetail.jsx`);

// camelCase -> snake_case, which is how dbRouteToCamel maps them.
const snake = (s) => s.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());

// Aliases where the app's property name is not the column name. Kept SHORT and explicit: a
// silently-unreadable column would otherwise report as clean.
const ALIAS = { gainM: "gain_ft", lossM: "loss_ft", distKm: "dist_km", rockType: "rock",
  ropeLen: "rope_length_m", cruxGrade: "crux", permits: "permit" };

/* TWO OF THE THIRTY HAVE NO COLUMN AT ALL, and leaving them in the unreadable bucket would have
   left 4 of 30 unproven while the run printed a clean verdict. Both are reachable through the
   CONTRIBUTION OVERLAY instead — `dbContribs` rows are grouped by field, gated on SS, and applied
   onto the route object client-side once the 3-agree gate passes — so "absent from `routes`" does
   NOT mean "unreachable". CLAUDE.md records that for `permitUrl` specifically, after a session
   removed it from a guard on the wrong reasoning.
   A field here that GAINS a column starts failing as unreadable-and-undeclared, which is the
   right direction: it then has stored values worth checking. */
const NO_COLUMN = { permitUrl: "no permit_url column exists; the route page renders route.permitUrl from a contribution",
  style: "no style column; `rockStyle` is the SS key and it is set by another flow" };

console.log(`${props.length} field(s) show route.<prop> raw as the current value.\n`);
let checked = 0, unreadable = [], findings = [], declared = [];
for (const p of props.sort()) {
  const col = ALIAS[p] || snake(p);
  if (NO_COLUMN[p]) { declared.push(`${p} — ${NO_COLUMN[p]}`); continue; }
  const rows = await selectAll("routes", `id,${col}`, `${col}=not.is.null`, { pageSize: 1000 }).catch(() => null);
  if (!rows) { unreadable.push(`${p} (${col})`); continue; }
  checked++;
  let bad = 0, sample = null, arrays = 0;
  for (const r of rows) {
    const v = r[col];
    if (v == null) continue;
    if (Array.isArray(v)) arrays++;
    if (typeof v === "object" && String(v).includes("[object Object]")) {
      bad++;
      if (!sample) sample = JSON.stringify(v).slice(0, 120);
    }
  }
  const tag = bad ? `  <-- ${bad} would render [object Object]` : "";
  console.log(`  ${p.padEnd(14)} ${col.padEnd(16)} ${String(rows.length).padStart(5)} rows${arrays ? `, ${arrays} array` : ""}${tag}`);
  if (sample) console.log(`      ${sample}`);
  if (bad) findings.push({ p, col, bad });
}

if (!checked) dead("no column was readable — an empty run, not a clean result");
console.log(`\n${checked} of ${props.length} column(s) read.`);
for (const d of declared) console.log(`  declared column-less: ${d}`);
// A stale declaration is worse than none: it would excuse a field that now HAS stored values.
for (const p of Object.keys(NO_COLUMN)) if (!props.includes(p)) dead(`stale NO_COLUMN entry: ${p} is no longer a raw-cur field`);
if (unreadable.length) {
  console.log(`NOT READABLE (reported, never counted as clean): ${unreadable.join(", ")}`);
  console.log(`  A property whose column name differs needs an ALIAS entry, or it silently proves nothing.`);
}
if (!findings.length) {
  console.log(`\nno raw-cur field stringifies to [object Object]. The class #1461 closed was the keyed`);
  console.log(`fields only — worth knowing, since a detector for a class of zero is not worth building.`);
} else {
  console.log(`\n${findings.length} field(s) affected: ${findings.map((f) => `${f.p} (${f.bad})`).join(", ")}`);
}
