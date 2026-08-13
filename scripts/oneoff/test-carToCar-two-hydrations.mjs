// Does one climb_logs row render the same on the two screens that show it?
//
// climb_logs is hydrated in TWO places:
//   ClimbMatch.jsx   builds `logs`     — your own logbook
//   RouteDetail.jsx  builds `activity` — the same rows as what other climbers see
// Both feed the SAME chip row, ReportStats, so a column one of them drops is a fact that
// is on screen for everyone except its author.
//
// Two halves, because either alone proves nothing:
//   1. STATIC  — both hydrations exist, and only one of them reads car_to_car_minutes.
//   2. RENDER  — the real ReportStats, given each hydration's cond, puts different
//                things on screen.
// TripReport itself cannot be rendered here: it is createPortal'd, which renderToStaticMarkup
// does not support. ReportStats is the component that owns the chips, and part 1 pins the
// two mounts that feed it.
import { createRequire } from "node:module";
import { readFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const ROOT = new URL("../../", import.meta.url).pathname;
const read = (f) => readFileSync(join(ROOT, f), "utf8");

let bad = 0;
const say = (ok, msg) => { if (!ok) bad++; console.log((ok ? "  ok   " : "  FAIL ") + msg); };

// ── 1. static: two hydrations, one column ────────────────────────────────────
const CM = read("ClimbMatch.jsx"), RD = read("RouteDetail.jsx"), CORE = read("ClimbMatchCore.jsx");

console.log("\nThe two hydration sites:\n");

// Say WHICH occurrences these are, never just how many — a bare count lets a write
// masquerade as a read, and that is precisely how this went unseen: ClimbMatch.jsx did name
// the column, once, inside the payload literal it sends TO the database.
const rdHits = RD.split("car_to_car_minutes").length - 1;
const payload = (() => {
  const st = CM.indexOf("var payload={");
  let d = 0;
  for (let k = CM.indexOf("{", st); k < CM.length; k++) {
    if (CM[k] === "{") d++;
    else if (CM[k] === "}" && --d === 0) return CM.slice(st, k + 1);
  }
  return "";
})();
say(/car_to_car_minutes:/.test(payload),
  "ClimbMatch's syncLogToDb payload WRITES car_to_car_minutes");
say(/row\.car_to_car_minutes/.test(CM),
  "ClimbMatch's own-logs hydration reads row.car_to_car_minutes");
say(/r\.car_to_car_minutes/.test(RD),
  `RouteDetail's hydration reads car_to_car_minutes too (${rdHits} occurrence)`);

// The exemption this replaced. check:log let the column through as "derived on both sides
// rather than round-tripped" — a claim that requires something to re-derive it on read.
// Nothing did: the only place carToCar is computed from the legs is the LogAscent form,
// while typing. Now that it is a real round-trip the exemption must be gone, or the guard
// would go on tolerating a future regression.
const guard = read("scripts/check-log-hydration.mjs");
say(!/DERIVED = new Set\(\[[^\]]*car_to_car_minutes/.test(guard),
  "check:log no longer exempts car_to_car_minutes as DERIVED");
// Balance the braces; never take a fixed window. The hydration literal is 2,091 chars and a
// 4,000-char window runs on into syncLogToDb, whose `_carToCar` local then matches and
// reports the derivation as present. Same trap check:overlay-discovery records.
const cmCond = (() => {
  const st = CM.indexOf("var item={_dbId:row.id");
  let d = 0;
  for (let k = CM.indexOf("{", st); k < CM.length; k++) {
    if (CM[k] === "{") d++;
    else if (CM[k] === "}" && --d === 0) return CM.slice(st, k + 1);
  }
  return "";
})();
say(cmCond.length > 500 && cmCond.length < 3000,
  `own-logs hydration literal isolated by brace balance (${cmCond.length} chars)`);
say(/o\.carToCar=/.test(cmCond) && /o\.carToCarMin=/.test(cmCond),
  "...and the own-logs hydration sets BOTH carToCar and carToCarMin");
// The integer half is not decoration: loggedTimeStats reads carToCarMin and never the
// string, because carToCar is prose on the seed path ("3 days", "Turned around").
say(/carToCarMin/.test(CORE.slice(CORE.indexOf("function loggedTimeStats"), CORE.indexOf("function loggedTimeStats") + 900)),
  "...which loggedTimeStats needs — it reads carToCarMin, never the prose string");

// Both mounts, and which hydration feeds each.
say(/<ReportStats cond=\{ascent\.cond\}\/>/.test(CORE),
  "TripReport mounts <ReportStats cond={ascent.cond}/>   (fed by `logs`)");
say(/<ReportStats cond=\{a\.cond\}\/>/.test(RD),
  "RouteDetail mounts <ReportStats cond={a.cond}/>       (fed by `activity`)");

// ── 2. render: the real component, both shapes ───────────────────────────────
// Same esbuild harness check:bare uses. define:{"import.meta.env":"{}"} is required —
// lib/auth.js reads it at module scope. The render happens INSIDE the bundle: importing
// React out here against a bundle carrying its own copy gives "Invalid hook call" on every
// case, which reads exactly like the defect under test.
const ENTRY = `
import {createElement as h} from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {ReportStats} from "./ClimbMatchCore.jsx";
export function render(cond){
  try{return renderToStaticMarkup(h(ReportStats,{cond}));}catch(e){return "THREW: "+e.message;}
}
`;
const { build } = await import("esbuild");
const out = join(mkdtempSync(join(tmpdir(), "cm-c2c-")), "bundle.cjs");
await build({
  stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic",
  loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" },
  outfile: out, logLevel: "error",
});
const { render } = createRequire(import.meta.url)(out);

// One real row: a climber logged 95 + 240 + 110 minutes; car_to_car_minutes is 445.
const LEGS = { approachMin: 95, climbMin: 240, descentMin: 110 };
// What a dropped column looks like on screen — the shape ClimbMatch used to build.
const DROPPED = { ...LEGS };
// What both hydrations build now.
const HYDRATED = { ...LEGS, carToCar: "7h 25m", carToCarMin: 445 };

const strip = (s) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
const a = strip(render(DROPPED)), b = strip(render(HYDRATED));

console.log("\nWhat ReportStats puts on screen for that row:\n");

// Controls first. If these fail the harness is wrong, not the app — and on the first run
// that is exactly what happened twice (duplicate React, then the portal).
say(!/^THREW/.test(a) && !/^THREW/.test(b), "neither shape throws                  [CONTROL]");
say(/Snow/i.test(strip(render({ ...DROPPED, snow: "Firm" }))),
  "the chip row does render fields it is given  [CONTROL]");

say(/Car-to-car/i.test(b) && /7h 25m/.test(b),
  "hydrated shape shows Car-to-car 7h 25m");

// The regression case, kept because it is what the bug looked like: the three legs are NOT
// in ReportStats' item list, so dropping the column leaves nothing behind to fall back on.
// (The legs do reach a screen, but only in aggregate — loggedTimeStats' medians on the
// route page. An individual report has no other place to show its own time.)
say(a === "", "drop the column and the row renders NOTHING for a time-only report");
say(!/\b95\b/.test(a) && !/\b240\b/.test(a) && !/\b110\b/.test(a),
  "...not even the three legs, which ReportStats has no chip for");

console.log("\n  column dropped : " + (a || "(renders null)"));
console.log("  hydrated       : " + b);

if (bad) { console.error(`\n${bad} assertion(s) failed.`); process.exit(1); }
console.log("\nBoth hydrations now agree. Same row, same facts, either screen.");
