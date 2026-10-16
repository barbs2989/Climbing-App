#!/usr/bin/env node
// THE CONTRIBUTE FORM'S "CURRENT VALUE" MUST BE THE NUMBER THE PAGE SHOWS.
//
// A climber taps the pencil to correct a figure and the sheet tells them what is on file. If
// that disagrees with the headline they just read, they are invited to "correct" a number
// that was never wrong -- the class objStr's "Weather: [object Object]" belongs to -- and it
// feeds `wasEmpty`, which decides whether one climber can fill a blank or three must agree.
//
// It disagreed two ways, and the smaller one was the only one visible by reading the source:
//
//   1. TWO CONSTANTS. The form converted metres->feet with 3.281 where every other surface
//      uses 3.28084, and km->miles with 0.621 against uDist's 0.621371. 45 WA routes, and the
//      tell is that the coarse constant turns clean numbers ugly: "14001 ft" against the
//      page's "14,000 ft" on wa_gunsight_peak_standard.
//
//   2. A ROUND TRIP THROUGH WHOLE METRES, which is 30x bigger. dbRouteToCamel builds gainM as
//      Math.round(gain_ft/3.28084) and the form converted it back, losing up to 1.6 ft:
//      631 of 915 WA routes (69%) -- page "7,000 ft", form "7,001 ft".
//
// The fix for (2) is not a better constant, it is NOT CONVERTING AT ALL: read the stored feet
// through the same uElev() the page uses, so the two agree by construction rather than by
// arithmetic that happens to round the same way.
//
// This EXECUTES the app's own uElev / routeAscentFt / dbRouteToCamel against live rows rather
// than re-implementing them -- a probe that copies its subject measures a fossil.
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { selectAll } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// The form's `cur` lives inside an object literal in a component, so it cannot be imported.
// Lift it from SOURCE with ANCHOR LOST rather than retyping it: a copy agrees with the app on
// the day it is written and measures a fossil afterwards.
const src = fs.readFileSync(path.join(ROOT, "RouteDetail.jsx"), "utf8");
const anchor = (label) => {
  const i = src.indexOf(`label:"${label}"`);
  if (i < 0) return null;
  const j = src.indexOf("cur:", i);
  const k = src.indexOf('},{k:"', j);
  return j > 0 && k > j ? src.slice(j + 4, k) : null;
};
const GAIN = anchor("Elev. gain"), LOSS = anchor("Elev. loss");
if (!GAIN || !LOSS) {
  console.error("ANCHOR LOST: could not lift the form's `cur` expression for Elev. gain/loss.");
  console.error("The field spec moved. Re-anchor — a run that cannot read it proves nothing.");
  process.exit(1);
}
console.log(`  form cur (gain): ${GAIN}`);
console.log(`  form cur (loss): ${LOSS}`);

// Bundle core + db so the real functions run, with the same esbuild invocation check:bare uses.
const entry = path.join(ROOT, "scripts", "oneoff", "_curbundle.mjs");
fs.writeFileSync(entry,
  `export {uElev,routeAscentFt,uImp,uDist} from "../../ClimbMatchCore.jsx";\nexport {dbRouteToCamel} from "../../lib/db.js";\n`);
const out = path.join(ROOT, "scripts", "oneoff", "_curbundle.cjs");
execFileSync("npx", ["esbuild", entry, "--bundle", "--format=cjs", "--platform=node", "--jsx=automatic",
  "--loader:.jsx=jsx", "--define:import.meta.env={}", "--outfile=" + out, "--log-level=error"], { cwd: ROOT });
const { uElev, routeAscentFt, uImp, uDist, dbRouteToCamel } = await import("file://" + out);
// uImp/uDist are pulled in so the lifted expression can be evaluated even when it is an
// OLDER shape that converted by hand -- otherwise reverting the fix crashes the probe
// instead of reporting the disagreement, and a crash is not a measurement.
void uImp; void uDist;

const rows = await selectAll("routes", "id,gain_ft,loss_ft,dist_km", "id=like.wa_*", { pageSize: 1000 });
fs.unlinkSync(entry); fs.unlinkSync(out);
if (!rows.length) { console.error("empty read — a broken scan, not a clean catalog"); process.exit(1); }
console.log(`  ${rows.length} WA routes read`);

const curOf = (route, expr) => eval(expr); // eslint-disable-line no-eval -- the app's own text
let seen = 0, bad = 0;
const ex = [];
for (const r of rows) {
  const route = dbRouteToCamel(r);
  if (route.gainFt == null) continue;
  seen++;
  const page = uElev(routeAscentFt(route));
  const form = curOf(route, GAIN);
  if (page !== form) { bad++; if (ex.length < 6) ex.push(`${r.id}: page ${page} vs form ${form}`); }
}
console.log(`\n  gain: ${bad} of ${seen} routes disagree between the page and the form`);
for (const e of ex) console.log("     " + e);
if (!seen) { console.error("no route carried a gain — nothing was measured"); process.exit(1); }
if (bad) { console.error("\nFAIL: the form offers a different number from the one the page shows."); process.exit(1); }
console.log("\nok — the form offers the number the page shows, on every route that has one.");
