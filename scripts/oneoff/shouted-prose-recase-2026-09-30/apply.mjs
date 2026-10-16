// Splice the recased runs back into their strings and PATCH every affected route column.
// node apply.mjs [--dry] [--only <id>]
import fs from "fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../../lib/supabase-env.mjs";
const dir = new URL("./", import.meta.url);
const args = process.argv.slice(2);
const DRY = args.includes("--dry");
const ONLY = args.includes("--only") ? args[args.indexOf("--only") + 1] : null;
const key = requireServiceKey();
const uniq = JSON.parse(fs.readFileSync(new URL("uniq.json", dir)));
const fixes = new Map(); // si -> [[index, newRun, oldRun]]
for (const f of fs.readdirSync(new URL(process.env.CHUNKS || "chunks/", dir)).filter(f => /^in-\d+\.json$/.test(f))) {
  const n = f.match(/\d+/)[0];
  const inp = JSON.parse(fs.readFileSync(new URL(`${process.env.CHUNKS || "chunks/"}${f}`, dir)));
  const out = new Map(JSON.parse(fs.readFileSync(new URL(`${process.env.CHUNKS || "chunks/"}out-${n}.json`, dir))).map(o => [o.k, o.run]));
  for (const r of inp) {
    const o = out.get(r.k);
    if (o == null || o.toLowerCase() !== r.run.toLowerCase() || o.length !== r.run.length) throw new Error(`bad recase ${r.k}`);
    const [si, idx] = r.k.split(":").map(Number);
    if (!fixes.has(si)) fixes.set(si, []);
    fixes.get(si).push([idx, o, r.run]);
  }
}
const map = new Map();
for (const [si, fx] of fixes) {
  let s = uniq[si];
  for (const [idx, o, old] of fx) {
    if (s.slice(idx, idx + old.length) !== old) throw new Error(`offset drift in string ${si}`);
    s = s.slice(0, idx) + o + s.slice(idx + old.length);
  }
  // The run pattern is ASCII, so "ARÊTE" was cut at the Ê and recased as "ar" + "te" around a
  // still-capital Ê. Any non-ASCII capital sitting between lowercase letters is that seam.
  s = s.replace(/([a-z])([À-ÖØ-Þ]+)(?=[a-z])/g, (m, a, b) => a + b.toLowerCase());
  if (s !== uniq[si]) map.set(uniq[si], s);
}
console.log("strings changed", map.size);
const targets = JSON.parse(fs.readFileSync(new URL("targets.json", dir)));
const byRow = new Map();
for (const t of targets) {
  if (t.table !== "routes" || !map.has(t.s)) continue;
  if (ONLY && t.id !== ONLY) continue;
  const col = t.where.split(/[.[]/)[0];
  if (!byRow.has(t.id)) byRow.set(t.id, new Set());
  byRow.get(t.id).add(col);
}
console.log("rows", byRow.size);
const replace = v => {
  if (typeof v === "string") return map.get(v) ?? v;
  if (Array.isArray(v)) return v.map(replace);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, replace(x)]));
  return v;
};
const ROLLBACK = new URL(`rollback-${Date.now()}.json`, dir);
const rollback = {};
let done = 0;
for (const [id, cols] of byRow) {
  const sel = ["id", "area_id", ...cols].join(",");
  const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${sel}&id=eq.${encodeURIComponent(id)}`, { headers: headers(key) });
  const [row] = await res.json();
  if (!row) throw new Error(`row ${id} not found`);
  const body = {};
  for (const c of cols) { const nv = replace(row[c]); if (JSON.stringify(nv) !== JSON.stringify(row[c])) body[c] = nv; }
  if (!Object.keys(body).length) continue;
  // Only the letter case may differ from what is live.
  for (const c of Object.keys(body)) if (JSON.stringify(body[c]).toLowerCase() !== JSON.stringify(row[c]).toLowerCase()) throw new Error(`${id}.${c}: non-case difference`);
  if (DRY) { done++; continue; }
  rollback[id] = Object.fromEntries(Object.keys(body).map(c => [c, row[c]]));
  fs.writeFileSync(ROLLBACK, JSON.stringify(rollback));
  await patchRow("routes", id, body, { filter: `area_id=eq.${encodeURIComponent(row.area_id)}` });
  const re = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${Object.keys(body).join(",")}&id=eq.${encodeURIComponent(id)}`, { headers: headers(key) });
  const [after] = await re.json();
  for (const c of Object.keys(body)) if (JSON.stringify(after[c]) !== JSON.stringify(body[c])) throw new Error(`${id}.${c} did not land`);
  done++;
}
console.log(DRY ? "would patch" : "patched + re-read", done, "rows");
