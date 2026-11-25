// Census for the owner's 2026-11-25 note "Rope doesn't need to be in class 1 2 or three grade climbs":
// how many live routes isNoRopeClass() takes the rope off, how many Class 1-3 glacier walks keep it,
// and how many no-rope routes STORE a rope fact the hidden ROPEWORK card used to print. Read-only.
import { selectAll, requireServiceKey } from "../lib/supabase-env.mjs";
import { CORPUS_COLUMNS } from "../../lib/terrain.js";
import { isNoRackClass, isNoRopeClass } from "../../lib/rack.js";
import { ropeworkFacts } from "../../lib/ropework.js";
const camel = (c) => c.replace(/_([a-z])/g, (_, ch) => ch.toUpperCase());
const cols = Array.from(new Set(["id", "name", "discipline", "grade", "rock_grade", "alpine_grade", "ice_grade", "aid_grade", "prot_rating", "glacier_travel", "snow_in_season", "seasonal_hazards", "approach_variants", "rope_length_m", "rope_type", ...CORPUS_COLUMNS]));
const rows = await selectAll("routes", cols.join(","), "or=(grade.ilike.*class*,discipline.eq.hiking)", { key: requireServiceKey(), pageSize: 1000 });
const out = { rows: rows.length, noRack: 0, noRope: 0, glacierKeeps: 0, noRopeStoresRope: [], glacierSample: [] };
for (const r0 of rows) {
  const r = { ...r0 }; for (const k of Object.keys(r0)) r[camel(k)] = r0[k];
  if (!isNoRackClass(r)) continue;
  out.noRack++;
  if (isNoRopeClass(r)) {
    out.noRope++;
    const f = ropeworkFacts(r);
    if (r.rope_note || r.rope_length_m || r.rope_type || f.length || f.link || f.simul) out.noRopeStoresRope.push({ id: r.id, grade: r.grade, disc: r.discipline, note: String(r.rope_note || "").slice(0, 160), len: r.rope_length_m, type: r.rope_type, simul: f.simul.slice(0, 120) });
  } else { out.glacierKeeps++; if (out.glacierSample.length < 25) out.glacierSample.push(r.id + " · " + r.grade + " · " + r.glacier_travel); }
}
console.log(JSON.stringify({ ...out, noRopeStoresRopeCount: out.noRopeStoresRope.length }, null, 1));
