// Applies researched corrections to a route's HEADLINE facts (name, grades, commitment, pitches,
// length, first ascent, aspect) from the 2026-10-01 guidebook audit.
//
//   node scripts/oneoff/apply-guidebook-fixes.mjs fixes.json          # dry run
//   node scripts/oneoff/apply-guidebook-fixes.mjs fixes.json --apply  # write, with a rollback file
//
// fixes.json: [{ id, field, from, to, why }]. Compare-and-set: a field whose live value is no longer
// `from` is REFUSED, never overwritten. `to: null` clears a value shown to be some other quantity
// (a peak's prominence copied into length_m) — clearing is allowed, inventing is not.
// A changed `grade` re-derives grade_num through lib/grade.js (the ONE parser, check:grade-parser),
// and fills mixed_grade_num / ice_grade_num only where they are empty, as the MP importer does.
import fs from "fs";
import { SUPABASE_URL, requireServiceKey, headers, patchRow } from "../lib/supabase-env.mjs";
import { gradeNumFor, gradeNumFrom } from "../../lib/grade.js";
// The live API sometimes answers 5xx / "upstream connect error" under load: retry reads with backoff.
async function getJSON(url, init) {
  for (let t = 0; ; t++) {
    try { const r = await fetch(url, { ...init, signal: AbortSignal.timeout(30000) }); const txt = await r.text(); if (r.ok) return JSON.parse(txt); if (r.status < 500 || t >= 6) return { error: r.status, body: txt.slice(0, 200) }; }
    catch (e) { if (t >= 6) return { error: "timeout", body: String(e).slice(0, 120) }; }
    await new Promise((z) => setTimeout(z, 5000 * (t + 1)));
  }
}

const FIELDS = new Set(["overview", "name", "grade", "rock_grade", "ice_grade", "alpine_grade", "aid_grade", "commitment", "pitches", "length_m", "fa", "aspect", "face", "gain_ft",
  "descent", "gear", "detailed_rack", "stars", "prot_rating", "season", "rock", "start_type", "landing", "pads", "crux", "max_angle", "rope_length_m",
  "bolts", "guide_stars", "alt_names", "variations", "ffa", "fwa", "anchor", "features"]);
// A grade proposed with a protection suffix ("5.10a R") is split: the grade keeps the difficulty, prot_rating takes the suffix.
const PROT = /^(.*\S)\s+(PG-?13|R|X)$/i;
const [file, flag] = process.argv.slice(2);
const APPLY = flag === "--apply";
const key = requireServiceKey();
const fixes = JSON.parse(fs.readFileSync(file, "utf8")).flatMap((f) => {
  const m = f.field === "grade" && typeof f.to === "string" && f.to.match(PROT);
  return m ? [{ ...f, to: m[1] }, { id: f.id, field: "prot_rating", from: f.prot_from ?? null, to: m[2].toUpperCase().replace("PG13", "PG13"), why: f.why, soft: true }] : [f];
});
const byId = new Map();
for (const f of fixes) {
  if (!FIELDS.has(f.field)) throw new Error(`${f.id}: field ${f.field} is not a headline fact this script may write`);
  (byId.get(f.id) || byId.set(f.id, []).get(f.id)).push(f);
}
const same = (a, b) => (a ?? null) === (b ?? null) || String(a ?? "") === String(b ?? "");
const rbFile = `scripts/rollback-guidebook-fixes-${Date.now()}.json`;
const rollback = [];
let ok = 0, refused = 0;
for (const [id, fs_] of byId) {
  // only the columns this route's fixes touch: a column a pending migration has not added yet must not fail every read
  const sel = "id,discipline,grade_num,ice_grade_num,mixed_grade_num," + [...new Set(fs_.map((f) => f.field))].join(",");
  const rows = await getJSON(`${SUPABASE_URL}/rest/v1/routes?id=eq.${encodeURIComponent(id)}&select=${sel}`, { headers: headers(key) });
  if (!Array.isArray(rows) || rows.length !== 1) { console.log(`REFUSED ${id}: not exactly one row`); refused++; continue; }
  const row = rows[0];
  for (let i = fs_.length - 1; i >= 0; i--) if (fs_[i].soft && !same(row[fs_[i].field], fs_[i].from)) fs_.splice(i, 1); // a split-off prot_rating never overwrites one already set
  for (let i = fs_.length - 1; i >= 0; i--) if (!same(row[fs_[i].field], fs_[i].from) && same(row[fs_[i].field], fs_[i].to)) fs_.splice(i, 1); // already written by an earlier run
  if (!fs_.length) { console.log(`ALREADY ${id}`); continue; }
  const stale = fs_.filter((f) => !same(row[f.field], f.from));
  if (stale.length) { for (const f of stale) console.log(`REFUSED ${id}.${f.field}: live ${JSON.stringify(row[f.field])} is not ${JSON.stringify(f.from)}`); refused++; continue; }
  const body = {};
  for (const f of fs_) body[f.field] = f.to;
  if ("grade" in body) {
    body.grade_num = gradeNumFor(body.grade, row.discipline);
    const m = String(body.grade || "").match(/\bM\d+[+-]?/), wi = String(body.grade || "").match(/\b[WA]I\s?\d[+-]?/);
    if (m && row.mixed_grade_num == null) body.mixed_grade_num = gradeNumFrom(m[0], "m");
    if (wi && row.ice_grade_num == null) body.ice_grade_num = gradeNumFrom(wi[0], "wi");
  }
  console.log(`\n${id}`); for (const [k, v] of Object.entries(body)) console.log(`  ${k}: ${JSON.stringify(row[k])} -> ${JSON.stringify(v)}`);
  if (APPLY) {
    rollback.push({ id, before: Object.fromEntries(Object.keys(body).map((k) => [k, row[k]])) });
    fs.writeFileSync(rbFile, JSON.stringify(rollback, null, 1));
    for (let t = 0; ; t++) { // the live DB times out under load (57014): back off and retry rather than abandon the batch
      try { await Promise.race([patchRow("routes", id, body, { filter: "select=id" }), new Promise((_, no) => setTimeout(() => no(new Error("timeout: patch hung 45s")), 45000))]); break; }
      catch (e) { if (t >= 4 || !/-> 5[0-9][0-9]|57014|timeout|fetch failed/.test(String(e))) throw e; console.log(`  retry ${id} after ${String(e).slice(0, 60)}`); await new Promise((z) => setTimeout(z, 15000 * (t + 1))); }
    }
    const back = (await getJSON(`${SUPABASE_URL}/rest/v1/routes?id=eq.${encodeURIComponent(id)}&select=${Object.keys(body).join(",")}`, { headers: headers(key) }))[0];
    for (const [k, v] of Object.entries(body)) if (!same(back[k], v)) throw new Error(`${id}.${k}: re-read ${JSON.stringify(back[k])} is not ${JSON.stringify(v)}`);
  }
  ok++;
}
if (APPLY && rollback.length) console.log(`\nrollback: ${rbFile}`);
console.log(`\n${APPLY ? "WRITTEN and re-read" : "DRY RUN"}: ${ok} routes ok, ${refused} refused`);
if (refused) process.exitCode = 1;
