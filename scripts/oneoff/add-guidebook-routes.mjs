// Adds routes a published guidebook describes that the catalog lacks (2026-10-02 guidebook audit; owner-approved).
//
//   node scripts/oneoff/add-guidebook-routes.mjs missing.json          # dry run
//   node scripts/oneoff/add-guidebook-routes.mjs missing.json --apply  # insert, with a rollback file of new ids
//
// Input: the high-confidence entries of the audit's missing.json that already resolve to a catalog area_id.
// Every value is a FACT the book states (grade, quality stars, protection rating, pitches, length, first ascent,
// commitment, protection) — no book wording is carried over, and no source is named on any row.
// Duplicates are refused twice: by an exact/near name test against the area here, and by the database's own
// refuse_duplicate_route trigger (0216), whose refusal is reported, never bypassed.
import fs from "fs";
import { SUPABASE_URL, requireServiceKey, headers } from "../lib/supabase-env.mjs";
import { gradeNumFor } from "../../lib/grade.js";
// The live API sometimes answers 5xx / "upstream connect error" under load: retry reads with backoff.
async function getJSON(url, init) {
  for (let t = 0; ; t++) {
    try { const r = await fetch(url, { ...init, signal: AbortSignal.timeout(30000) }); const txt = await r.text(); if (r.ok) return JSON.parse(txt); if (r.status < 500 || t >= 6) return { error: r.status, body: txt.slice(0, 200) }; }
    catch (e) { if (t >= 6) return { error: "timeout", body: String(e).slice(0, 120) }; }
    await new Promise((z) => setTimeout(z, 5000 * (t + 1)));
  }
}

const [file, flag] = process.argv.slice(2);
const APPLY = flag === "--apply";
const key = requireServiceKey();
const H = { ...headers(key), "content-type": "application/json", Prefer: "return=representation" };
const slug = (s) => ((s || "x").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 55) || "x");
const norm = (s) => String(s || "").toLowerCase().replace(/[’']/g, "").replace(/^the\s+/, "").replace(/[^a-z0-9]+/g, " ").trim();
const SYS = (disc, g) => (/^V\d/i.test(g || "") ? "v" : /^class/i.test(g || "") ? "class" : /^WI/i.test(g || "") ? "wi" : g ? "yds" : null);
const rows = JSON.parse(fs.readFileSync(file, "utf8")).filter((x) => x.confidence === "high" && x.area_id);
const rbFile = `scripts/rollback-add-guidebook-routes-${Date.now()}.json`;
const added = [], refused = [];
const areaRoutes = new Map();
async function routesIn(areaId) {
  if (!areaRoutes.has(areaId)) {
    const r = await getJSON(`${SUPABASE_URL}/rest/v1/routes?area_id=eq.${encodeURIComponent(areaId)}&select=id,name`, { headers: headers(key) });
    areaRoutes.set(areaId, Array.isArray(r) ? r : []);
  }
  return areaRoutes.get(areaId);
}
for (const x of rows) {
  const existing = await routesIn(x.area_id);
  const dup = existing.find((r) => norm(r.name) === norm(x.name));
  if (dup) { refused.push({ name: x.name, area_id: x.area_id, why: `already here as ${dup.id}` }); continue; }
  let id = `${x.area_id}_${slug(x.name)}`, n = 2;
  const taken = new Set(existing.map((r) => r.id));
  while (taken.has(id)) id = `${x.area_id}_${slug(x.name)}_${n++}`;
  const grade = x.grade || null;
  const row = {
    id, area_id: x.area_id, name: x.name, discipline: x.discipline,
    grade, grade_system: SYS(x.discipline, grade), grade_num: grade ? gradeNumFor(grade, x.discipline) : null,
    pitches: x.pitches ?? null,
    length_m: x.length_ft ? Math.round(x.length_ft * 0.3048) : null,
    fa: x.fa || null,
    guide_stars: Number.isInteger(x.stars) ? Math.min(4, Math.max(0, x.stars)) : null,
    prot_rating: x.protection_rating || null,
    commitment: x.commitment || null,
    aid_grade: x.aid || null,
    gear: x.protection ? [x.protection] : null,
    auto_generated: false, classic: false,
  };
  for (const k of Object.keys(row)) if (row[k] == null) delete row[k];
  console.log(`${APPLY ? "ADD" : "would add"} ${id} | ${x.name} | ${grade || "-"} | ${x.discipline}`);
  if (!APPLY) { added.push(id); continue; }
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes`, { method: "POST", headers: H, body: JSON.stringify(row) });
  const t = await r.text();
  if (!r.ok) { refused.push({ name: x.name, area_id: x.area_id, why: `${r.status} ${t.slice(0, 160)}` }); console.log(`  REFUSED by db: ${t.slice(0, 120)}`); continue; }
  added.push(id); existing.push({ id, name: x.name });
  fs.writeFileSync(rbFile, JSON.stringify({ added }, null, 1));
}
fs.writeFileSync(`scripts/add-guidebook-routes-refused-${APPLY ? "apply" : "dry"}.json`, JSON.stringify(refused, null, 1));
if (APPLY && added.length) console.log(`rollback (delete these ids): ${rbFile}`);
console.log(`${APPLY ? "INSERTED" : "DRY RUN"}: ${added.length} routes; refused ${refused.length}`);
