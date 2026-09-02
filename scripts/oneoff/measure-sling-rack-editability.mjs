// Can `sling_rack` take the app's generic keyed editor, or would the form show "[object Object]"?
//
// It is the last uncorrectable column from the contributable sweep. The recorded blocker is that
// `fmtSlingRack` returns null for a plain STRING, so a text box would be contributable and render
// nothing. That is true and it is the wrong question, because the stored shape is a KEYED OBJECT
// and the app already has a keyed editor (OBJ_KEYS / OBJ_STATE).
//
// The thing that decides it is `objStr`, which drives the form's current-value line:
//
//     keys.map(k => k[1] + ": " + _dget(o, k[0]))
//
// That is a raw `String(v)`. If a key holds an ARRAY OF OBJECTS — `cams: [{size,count}]` — the
// climber is shown "Cams: [object Object]" and edits from that. check:ui would catch it on a
// walked route, but only if a walked route happened to carry one.
//
// So: per key, how many stored values are a plain string (editable as text) versus nested?
import { selectAll } from "../lib/supabase-env.mjs";

const dead = (w) => { console.error(`\nmeasurement FAILED — ${w}. Nothing below was measured.\n`); process.exit(1); };

const rows = await selectAll("routes", "id,sling_rack", "sling_rack=not.is.null", { pageSize: 1000 })
  .catch((e) => dead("the read failed: " + (e && e.message)));
if (!rows || !rows.length) dead("empty read — not an empty column");

const per = {};
let objectRows = 0, arrayRows = 0, otherRows = 0;
for (const r of rows) {
  const v = r.sling_rack;
  if (Array.isArray(v)) { arrayRows++; continue; }
  if (!v || typeof v !== "object") { otherRows++; continue; }
  objectRows++;
  for (const [k, val] of Object.entries(v)) {
    const p = (per[k] = per[k] || { str: 0, num: 0, nested: 0, sample: null });
    if (typeof val === "string") p.str++;
    else if (typeof val === "number" || typeof val === "boolean") p.num++;
    else { p.nested++; if (!p.sample) p.sample = JSON.stringify(val).slice(0, 120); }
  }
}

console.log(`rows: ${rows.length}   keyed objects: ${objectRows}   arrays: ${arrayRows}   other: ${otherRows}\n`);
const ks = Object.entries(per).sort((a, b) => (b[1].str + b[1].num + b[1].nested) - (a[1].str + a[1].num + a[1].nested));
console.log("key".padEnd(24) + "total".padEnd(8) + "string".padEnd(8) + "num".padEnd(6) + "NESTED");
let totalNested = 0, totalFlat = 0;
for (const [k, p] of ks) {
  const t = p.str + p.num + p.nested;
  totalNested += p.nested; totalFlat += p.str + p.num;
  console.log(k.padEnd(24) + String(t).padEnd(8) + String(p.str).padEnd(8) + String(p.num).padEnd(6) + p.nested);
}
console.log(`\nflat (a text box can edit it):  ${totalFlat}`);
console.log(`nested (would show [object Object] in objStr): ${totalNested}`);
const pctNested = totalNested / (totalFlat + totalNested) * 100;
console.log(`\n${pctNested.toFixed(1)}% of key values are nested.`);

console.log(`\nnested samples, which is what a climber would be editing from:`);
for (const [k, p] of ks) if (p.sample) console.log(`  ${k}: ${p.sample}`);

// How many ROWS would show at least one [object Object] in the form's summary line?
let rowsAffected = 0;
for (const r of rows) {
  const v = r.sling_rack;
  if (!v || Array.isArray(v) || typeof v !== "object") continue;
  if (Object.values(v).some((x) => x && typeof x === "object")) rowsAffected++;
}
console.log(`\nrows whose current-value line would contain [object Object]: ${rowsAffected} of ${objectRows}`);
