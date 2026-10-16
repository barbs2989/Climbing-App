// Does the contribute form already show "[object Object]" for the keyed fields it offers TODAY?
//
// `objStr` builds the current-value line every keyed editor opens with:
//
//     keys.map(k => k[1] + ": " + _dget(o, k[0]))
//
// That is a raw String(v). A key holding an object or an array therefore renders as
// "[object Object]" — the exact string check:ui bans in rendered copy. This asks the question of
// the TEN keyed fields already contributable, not of the one I was about to add: if it is already
// reachable, it is a live defect and the sling_rack question is downstream of it.
//
// Keys and the column mapping are LIFTED from lib/objKeys.js and RouteDetail.jsx rather than
// retyped, so this cannot disagree with what the form actually offers.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { selectAll } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dead = (w) => { console.error(`\nmeasurement FAILED — ${w}. Nothing below was measured.\n`); process.exit(1); };

const keysSrc = fs.readFileSync(path.join(ROOT, "lib/objKeys.js"), "utf8");
const rdSrc = fs.readFileSync(path.join(ROOT, "RouteDetail.jsx"), "utf8");

// OBJ_KEYS maps a FIELD type -> the key-spec array name.
const m = /OBJ_KEYS=\{([^}]*)\}/.exec(rdSrc);
if (!m) dead("ANCHOR LOST: OBJ_KEYS in RouteDetail.jsx");
const pairs = [...m[1].matchAll(/([A-Za-z]+):([A-Z_]+)/g)].map((x) => [x[1], x[2]]);
if (pairs.length < 8) dead(`parsed only ${pairs.length} keyed field(s) from OBJ_KEYS`);

// Each spec is `const NAME=[["key","Label",...],...]`. Take the first element of each entry.
function specKeys(name) {
  const i = keysSrc.indexOf(name + "=[");
  if (i < 0) dead(`ANCHOR LOST: ${name} in lib/objKeys.js`);
  let depth = 0, k = keysSrc.indexOf("[", i), end = k;
  for (; end < keysSrc.length; end++) {
    if (keysSrc[end] === "[") depth++;
    else if (keysSrc[end] === "]") { depth--; if (!depth) break; }
  }
  const body = keysSrc.slice(k, end + 1);
  return [...body.matchAll(/\[\s*"([^"]+)"/g)].map((x) => x[1]);
}

// camelCase field -> snake_case column.
const snake = (s) => s.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());
const dget = (o, p) => p.split(".").reduce((a, k) => (a == null ? a : a[k]), o);

console.log(`${pairs.length} keyed field(s) offered by the contribute form.\n`);
let grandRows = 0, grandVals = 0;
for (const [field, specName] of pairs) {
  const keys = specKeys(specName);
  if (!keys.length) dead(`${specName} parsed to zero keys`);
  const col = snake(field);
  const rows = await selectAll("routes", `id,${col}`, `${col}=not.is.null`, { pageSize: 1000 })
    .catch(() => null);
  if (!rows) { console.log(`${field.padEnd(22)} (column ${col} unreadable — skipped)`); continue; }
  let bad = 0, badVals = 0;
  let sample = null;
  for (const r of rows) {
    let any = false;
    for (const k of keys) {
      const v = dget(r[col], k);
      // TEST THE RENDERED STRING, not the type. `String(["a","b"])` is "a,b" — ugly but
      // readable — while `String({a:1})` is "[object Object]". A first version flagged
      // `typeof v === "object"`, which counts arrays, and reported 1,008 rows where the real
      // figure is far smaller: `requiredSkills` is an array of strings and renders fine.
      if (v && typeof v === "object" && String(v).includes("[object Object]")) {
        badVals++; any = true;
        if (!sample) sample = `${r.id}  ${k} = ${JSON.stringify(v).slice(0, 110)}`;
      }
    }
    if (any) bad++;
  }
  grandRows += bad; grandVals += badVals;
  const tag = bad ? "  <-- would render [object Object]" : "";
  console.log(`${field.padEnd(22)} ${String(rows.length).padStart(5)} rows, ${keys.length} keys offered, ${bad} affected${tag}`);
  if (sample) console.log(`      ${sample}`);
}
console.log(`\n${grandRows} row(s) across those fields would show [object Object] in the form's`);
console.log(`current-value line, from ${grandVals} offending key value(s).`);
console.log(`\nA form that opens on "[object Object]" invites a climber to replace a real value with`);
console.log(`whatever they can see, which is worse than not offering the field.`);
