// Does audit-trailhead-agreement's own coordinate gate agree with the app's wpPlaced()?
//
// The audit tests `num(x.lat)!==null && num(x.lng)!==null`; the app tests wpPlaced(). That is a
// SECOND placement predicate, and this repo has been bitten four times by two implementations of
// one rule that agree until they don't (four grade parsers; the tenth placement predicate #1183
// swept and #1222 caught coming back). The audit is a second OPINION about the data on purpose, so
// it should not import the app's function — but if the two ever disagree, the audit's SHADOWED
// count silently stops describing what the app does.
//
// wpPlaced is LIFTED from source with ANCHOR LOST, never copied.
// [[a-probe-that-copies-its-subject-measures-a-fossil]]
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const src = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");
const s = src.indexOf("export function wpPlaced(");
if (s < 0) throw new Error("ANCHOR LOST: `export function wpPlaced(` is not in ClimbMatchCore.jsx");
let d = 0, e = -1;
for (let i = src.indexOf("{", s); i < src.length; i++) { if (src[i] === "{") d++; else if (src[i] === "}" && --d === 0) { e = i + 1; break; } }
const wpPlaced = new Function(src.slice(s, e).replace(/^export /, "") + ";return wpPlaced;")();

// The audit's gate, transcribed from scripts/audit-trailhead-agreement.mjs.
const num = v => (v === null || v === undefined || v === "" ? null : Number.isFinite(+v) ? +v : null);
const auditPlaced = w => !!w && num(w.lat) !== null && num(w.lng) !== null;

// The shapes that actually reach these functions: contributed rows store lat/lng as STRINGS, and
// `""`, `" "`, `[]` and `false` all coerce to a finite 0 — the Gulf-of-Guinea trap this repo
// already records twice ([[fail-open-coercion-hides-missing-data]]).
const cases = [
  {}, { lat: null, lng: null }, { lat: "", lng: "" }, { lat: "47.5", lng: "-121.2" },
  { lat: 47.5, lng: -121.2 }, { lat: 47.5 }, { lng: -121.2 }, { lat: 0, lng: 0 },
  { lat: "abc", lng: "1" }, { lat: NaN, lng: 1 }, { lat: Infinity, lng: 1 },
  { lat: " ", lng: " " }, { lat: "0", lng: "0" }, { lat: undefined, lng: 1 },
  { lat: false, lng: 1 }, { lat: [], lng: 1 },
];

let bad = 0;
for (const c of cases) {
  const a = wpPlaced(c), b = auditPlaced(c);
  if (a !== b) { bad++; console.log(`DISAGREE  ${JSON.stringify(c)}   wpPlaced=${a}  audit=${b}`); }
}
// Fail closed: a lift that returned a function answering `undefined` to everything would agree
// with nothing and still print zero disagreements if the loop never ran.
if (!cases.length) { console.log("no cases — this probe checked nothing"); process.exit(1); }
if (!wpPlaced({ lat: 47.5, lng: -121.2 }) || wpPlaced({ lat: "", lng: "" })) {
  console.log("FAIL  the lifted wpPlaced does not behave like a placement test — the lift is broken");
  process.exit(1);
}
console.log(bad
  ? `\n${bad} disagreement(s) — the audit's SHADOWED count no longer describes what the app does.`
  : `\nok — the audit's num() gate and wpPlaced() agree on all ${cases.length} shapes, including "", " ", [], false and a bare lat.`);
process.exit(bad ? 1 : 0);
