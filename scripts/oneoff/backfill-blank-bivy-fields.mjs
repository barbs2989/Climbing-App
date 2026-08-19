// Fill EMPTY fields on already-applied bivy sites from the zone file that produced them.
//
// Strictly a coalesce: it writes only where the stored value is missing or an empty string, and
// only from a site with the SAME NAME in a zone file. It can therefore never overwrite research
// that is already there, and — importantly now that `bivy` is contributable — never overwrite a
// climber's correction. A plain assignment here would be able to do both.
//
// --dry prints what it would do and writes nothing.
import { requireServiceKey, selectAll, patchRow } from "../lib/supabase-env.mjs";
import fs from "fs";
import path from "path";

const DRY = process.argv.includes("--dry");
const DIR = "enrichment-wip/camping-zones";
const FIELDS = ["capacity", "water", "permit", "notes"];

// name -> {field: value} from the research files
const src = new Map();
for (const f of fs.readdirSync(DIR).filter(x => x.endsWith(".json"))) {
  const j = JSON.parse(fs.readFileSync(path.join(DIR, f), "utf8"));
  for (const s of j.sites || []) {
    if (!s || !s.name) continue;
    const cur = src.get(s.name) || {};
    for (const k of FIELDS) if (s[k] && String(s[k]).trim() && !cur[k]) cur[k] = s[k];
    src.set(s.name, cur);
  }
}
if (src.size < 50) { console.log(`FAIL: only ${src.size} named sites read from zone files — the walk broke`); process.exit(1); }

requireServiceKey();
const rows = await selectAll("routes", "id,bivy", "bivy=not.is.null", { pageSize: 1000 });
if (!rows.length) { console.log("FAIL: read no routes with bivy — refusing to conclude anything"); process.exit(1); }

const blank = v => v == null || String(v).trim() === "";
let touched = 0, fills = 0;
for (const r of rows) {
  if (!Array.isArray(r.bivy)) continue;
  let dirty = false;
  const next = r.bivy.map(s => {
    if (!s || !s.name || !src.has(s.name)) return s;
    const from = src.get(s.name);
    const patch = {};
    for (const k of FIELDS) if (blank(s[k]) && from[k]) { patch[k] = from[k]; fills++; }
    if (!Object.keys(patch).length) return s;
    dirty = true;
    return { ...s, ...patch };
  });
  if (!dirty) continue;
  touched++;
  if (!DRY) await patchRow("routes", r.id, { bivy: next });
}
console.log(`${DRY ? "would fill" : "filled"} ${fills} blank field(s) across ${touched} route(s), from ${src.size} named sites`);
if (DRY || !touched) process.exit(0);

const after = await selectAll("routes", "id,bivy", "bivy=not.is.null", { pageSize: 1000 });
let left = 0;
for (const r of after) for (const s of r.bivy || []) {
  if (!s || !src.has(s.name)) continue;
  for (const k of FIELDS) if (blank(s[k]) && src.get(s.name)[k]) left++;
}
console.log(left ? `FAIL: ${left} fillable blank(s) remain` : "verified — no fillable blank remains");
process.exit(left ? 1 : 0);
