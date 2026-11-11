// Trip plan census (owner note 2026-11-11: "do full research to fill the missing data on routes").
//
// Read-only. The Trip plan (ItineraryView, Plan tab) is drawn on every route that is not a crag
// line, so this reads every non-crag row and sorts its `itinerary` into:
//   none        no itinerary at all ("No trip plan yet")
//   prose       a string, not a structured plan
//   empty-days  an object with no days
//   structured  days present; per-day gaps counted for gain / loss / hours / miles / pack / note
// Ids first (narrow select), then the wide column by id=in.(…) in chunks of 100, as
// docs/codebase/supabase-scripts.md asks. Writes the per-route list to --out (JSON).
import fs from "node:fs";
import { SUPABASE_URL, headers, requireServiceKey, selectAll } from "../lib/supabase-env.mjs";

const out = (process.argv.find((a) => a.startsWith("--out=")) || "").slice(6) || null;
const key = requireServiceKey();
const DISC = "discipline=in.(alpine,mountaineering,scrambling,ice,mixed)";
const ids = await selectAll("routes", "id,name,discipline,area_id", DISC, { pageSize: 1000, key });
console.log("non-crag rows: " + ids.length);

const wide = [];
for (let i = 0; i < ids.length; i += 100) {
  const chunk = ids.slice(i, i + 100).map((r) => r.id);
  const q = SUPABASE_URL + "/rest/v1/routes?select=id,itinerary,gain_ft,dist_km,pitches,grade&id=in.(" + chunk.map(encodeURIComponent).join(",") + ")";
  let res;
  for (let attempt = 0; attempt < 2; attempt++) {
    res = await fetch(q, { headers: headers(key), signal: AbortSignal.timeout(30000) }).catch((e) => ({ ok: false, status: String(e) }));
    if (res.ok) break;
    console.error("chunk " + i + " failed (" + res.status + "), backing off 60 s");
    await new Promise((r) => setTimeout(r, 60000));
  }
  if (!res.ok) throw new Error("STOPPED at chunk " + i + ": the database is not answering");
  wide.push(...(await res.json()));
  await new Promise((r) => setTimeout(r, 200));
}
const byId = new Map(wide.map((r) => [r.id, r]));
const FIELDS = ["gainFt", "lossFt", "hours", "miles", "packLb", "note", "objective"];
const tally = { none: 0, prose: 0, "empty-days": 0, structured: 0 };
const dayGaps = Object.fromEntries(FIELDS.map((f) => [f, 0]));
let dayN = 0, routesWithGap = 0, noTotalNote = 0;
const list = [];
for (const r of ids) {
  const w = byId.get(r.id) || {};
  const it = w.itinerary;
  let kind;
  if (it == null || it === "") kind = "none";
  else if (typeof it === "string") kind = "prose";
  else if (!Array.isArray(it.days) || !it.days.length) kind = "empty-days";
  else kind = "structured";
  tally[kind]++;
  const gaps = {};
  if (kind === "structured") {
    if (!it.totalNote) noTotalNote++;
    for (const d of it.days) {
      dayN++;
      for (const f of FIELDS) {
        const v = d[f];
        if (v == null || v === "" || v === 0) { dayGaps[f]++; gaps[f] = (gaps[f] || 0) + 1; }
      }
    }
    if (Object.keys(gaps).some((f) => ["gainFt", "hours", "miles"].includes(f))) routesWithGap++;
  }
  list.push({ id: r.id, name: r.name, discipline: r.discipline, kind, days: kind === "structured" ? it.days.length : null, gaps, gain_ft: w.gain_ft ?? null, dist_km: w.dist_km ?? null, grade: w.grade ?? null });
}
console.log(JSON.stringify(tally));
console.log("structured days: " + dayN + "; days missing each field: " + JSON.stringify(dayGaps));
console.log("structured routes missing gain/hours/miles on some day: " + routesWithGap + "; with no totalNote: " + noTotalNote);
const byState = {};
for (const x of list) { const st = String(x.id).split("_")[0]; byState[st] = byState[st] || { none: 0, prose: 0, "empty-days": 0, structured: 0 }; byState[st][x.kind]++; }
console.log("by id prefix (top 25 by none):");
for (const [st, t] of Object.entries(byState).sort((a, b) => b[1].none - a[1].none).slice(0, 25)) console.log("  " + st.padEnd(14) + JSON.stringify(t));
if (out) fs.writeFileSync(out, JSON.stringify(list, null, 1));
if (!ids.length) { console.error("FAIL - read no rows; a short read reports a clean catalog."); process.exit(1); }
