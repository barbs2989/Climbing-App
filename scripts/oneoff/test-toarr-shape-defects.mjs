// Proves the two shape defects in dbRouteToCamel's array coercion, against the REAL rows
// that carry them, using the REAL function (bundled out of lib/db.js — not a copy, so it
// cannot drift from what ships).
//
//   gear   — 2 of 1,067 rows hold {rack:[…],gearTiers:{…}} instead of an array. toArr fell
//            through to String(v) and produced the literal "[object Object]", as the gear
//            list AND as the RACK box (rack falls back to gear when the rack column is
//            null, which it is on both).
//   watch_out — 79 of 1,070 rows are strings separated by ;/newline, not commas. One
//            run-on bullet each, fragments mid-clause where commas appear, and 3 rows that
//            are nothing but separators drew a bullet of pure punctuation.
//
// usage: node scripts/oneoff/test-toarr-shape-defects.mjs
import { build } from "esbuild";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { requireServiceKey, headers, SUPABASE_URL } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const require_ = createRequire(import.meta.url);
const ENTRY = `import { dbRouteToCamel } from ${JSON.stringify(path.join(ROOT, "lib/db.js"))};\nexport { dbRouteToCamel };`;
const out = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "cm-toarr-")), "b.cjs");
await build({ stdin: { contents: ENTRY, resolveDir: ROOT, loader: "js" }, bundle: true,
  format: "cjs", platform: "node", jsx: "automatic", loader: { ".jsx": "jsx" },
  define: { "import.meta.env": "{}" }, outfile: out, logLevel: "error" });
const { dbRouteToCamel } = require_(out);

const H = headers(requireServiceKey());
async function row(id) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=*&id=eq.${id}`, { headers: H });
  const [x] = await r.json();
  if (!x) { console.error(`ANCHOR LOST: ${id} is not in the live DB — nothing below was checked.`); process.exit(1); }
  return x;
}

let fail = 0;
const ok = (c, m) => { console.log(`  ${c ? "ok  " : "FAIL"} ${m}`); if (!c) fail++; };

console.log("gear stored as an object:");
for (const id of ["wa_mount_baker_boulder_park_cleaver", "wa_mount_shuksan_beckey_schmidtke"]) {
  const c = dbRouteToCamel(await row(id));
  ok(!JSON.stringify(c.gear).includes("[object Object]"), `${id} gear has no [object Object]`);
  ok(!JSON.stringify(c.rack).includes("[object Object]"), `${id} rack has no [object Object]`);
  ok(c.gear.length > 1, `${id} recovered ${c.gear.length} real gear items (not blanked)`);
  ok(c.gear.every((x) => typeof x === "string" && x.length > 2), `${id} every gear item is real text`);
}

console.log("\nwatch_out stored as a separator-joined string:");
for (const id of ["adams_avalanche_glacier", "adams_northwest_ridge", "rainier_north_mowich_headwall"]) {
  const c = dbRouteToCamel(await row(id));
  ok(c.watchOut.length === 0, `${id} renders no WATCH OUT bullet (was "${String((await row(id)).watch_out)}")`);
}
{
  const src = await row("az_north_face_3");
  const c = dbRouteToCamel(src);
  ok(typeof src.watch_out === "string", "az_north_face_3 still stores a string (fixture is valid)");
  ok(c.watchOut.length > 3, `az_north_face_3 splits into ${c.watchOut.length} warnings, not 2 run-ons`);
  ok(c.watchOut.every((w) => !/^[\s;,.-]*$/.test(w)), "no bullet is pure punctuation");
  ok(!c.watchOut.some((w) => /^\d{3} ft/.test(w)), "no bullet begins mid-number (the comma-split fragment)");
}

console.log("\narray rows must be left alone:");
{
  // 237 array rows contain a semicolon inside ONE item; splitting them would shred data.
  const src = await row("wa_abernathy_peak_south_ridge");
  const c = dbRouteToCamel(src);
  ok(Array.isArray(src.watch_out), "wa_abernathy_peak_south_ridge stores an array (fixture is valid)");
  ok(c.watchOut.length === src.watch_out.length, `passed through unchanged (${c.watchOut.length} items)`);
  ok(c.watchOut.some((w) => /;/.test(w)), "an item still contains its internal semicolon");
}

console.log(fail ? `\n${fail} assertion(s) failed` : "\nall assertions passed");
process.exit(fail ? 1 : 0);

// Injection-tested 2026-08-09:
//   remove the `typeof v === "object"` line from toArr  -> 6 failures naming both gear rows
//   collapse gearArr to `return toArr(v)`              -> same 6
//   map watchOut back through toArr                    -> 5 failures, incl. the mid-number
//                                                         fragment and all three punctuation rows
// Restoring each makes it green. The array-passthrough block is what stops an
// over-eager fix: it fails if a future splitter shreds the 237 rows whose items
// legitimately contain a semicolon.
