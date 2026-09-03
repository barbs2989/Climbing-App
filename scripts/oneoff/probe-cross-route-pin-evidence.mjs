// THE EVIDENCE BEHIND THREE ADJUDICATED CROSS-ROUTE PIN FINDINGS.
//
// adjudicate-cross-route-pins.mjs settles WHICH pin the gazetteer refuses. It cannot say whether
// the route MEANT that place — which is the difference between the Lake Constance repair (four
// routes describe walking the Lake Constance climbers' trail, so the pin belongs at the lake) and
// the Lake Ingalls refusal (three routes never mention the lake, so the NAME may be the wrong half).
//
// So this gathers, per finding, the four things a repair has to rest on:
//   1. does the route's own PROSE name the place?
//   2. does the prose state a DIRECTION the pin contradicts?
//   3. does the pin's own ELEVATION agree with the corroborated cluster? (if so it means that place)
//   4. what does the GROUND read at the corroborated coordinate? (does the stated elevation survive
//      the move, or would moving the coordinate strand the elevation beside it?)
//
// Report-only.
import { SUPABASE_URL, requireServiceKey, headers } from "../lib/supabase-env.mjs";
import { elevationAt } from "../lib/terrain.mjs";

const H = headers(requireServiceKey());
const T = Math.PI / 180;
const metres = (a, b) => 2 * 6371000 * Math.asin(Math.sqrt(
  Math.sin((b.lat - a.lat) * T / 2) ** 2 +
  Math.cos(a.lat * T) * Math.cos(b.lat * T) * Math.sin((b.lng - a.lng) * T / 2) ** 2));
const bearing = (a, b) => {
  const y = Math.sin((b.lng - a.lng) * T) * Math.cos(b.lat * T);
  const x = Math.cos(a.lat * T) * Math.sin(b.lat * T) -
    Math.sin(a.lat * T) * Math.cos(b.lat * T) * Math.cos((b.lng - a.lng) * T);
  return (Math.atan2(y, x) / T + 360) % 360;
};
const compass = (d) => ["N","NNE","NE","ENE","E","ESE","SE","SSE","S","SSW","SW","WSW","W","WNW","NW","NNW"][Math.round(d / 22.5) % 16];

const CASES = [
  { name: "Cache Col",     suspect: "wa_ptarmigan_traverse",        donor: "wa_mount_formidable_south_face" },
  { name: "Spire Point",   suspect: "wa_ptarmigan_traverse",        donor: "wa_spire_point_southwest_face" },
  { name: "Kool-Aid Lake", suspect: "wa_magic_mountain_south_ridge", donor: "wa_old_guard_peak_southwest_route",
    relTo: "Cache Col" },
];

const COLS = "id,name,waypoints,overview,approach,climbing_route,beta,descent_text,watch_out,pro_tips";
const get = async (id) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${COLS}&id=eq.${id}`, { headers: H });
  if (!r.ok) throw new Error(`${id}: ${r.status}`);
  const j = await r.json();
  return j[0] || null;
};
const wpOf = (row, nm) => (row.waypoints || []).find((w) => w && String(w.name || "").trim() === nm) || null;
const proseOf = (row) => ["overview","approach","climbing_route","beta","descent_text","watch_out","pro_tips"]
  .map((k) => (row[k] == null ? "" : (typeof row[k] === "string" ? row[k] : JSON.stringify(row[k])))).join("\n");

for (const c of CASES) {
  console.log(`\n================ "${c.name}"   suspect ${c.suspect}`);
  const sus = await get(c.suspect), don = await get(c.donor);
  if (!sus || !don) { console.log("   a row is missing"); continue; }
  const sw = wpOf(sus, c.name), dw = wpOf(don, c.name);
  if (!sw || !dw) { console.log("   a pin is missing"); continue; }
  const sp = { lat: Number(sw.lat), lng: Number(sw.lng) };
  const dp = { lat: Number(dw.lat), lng: Number(dw.lng) };
  console.log(`   suspect pin  ${sp.lat},${sp.lng}  ${sw.elev ?? "—"} ft  [${sw.type || "?"}]`);
  console.log(`   donor pin    ${dp.lat},${dp.lng}  ${dw.elev ?? "—"} ft  [${dw.type || "?"}]   (${c.donor})`);
  console.log(`   apart: ${Math.round(metres(sp, dp))} m`);

  // 3. does the elevation agree with the corroborated cluster?
  const se = sw.elev == null ? null : Number(sw.elev), de = dw.elev == null ? null : Number(dw.elev);
  if (se != null && de != null) {
    const gap = Math.abs(se - de);
    console.log(`   elevation gap: ${gap} ft  -> ${gap <= 60 ? "AGREES (within the DEM floor): the pin means that place"
      : "DISAGREES: moving the coordinate would strand this number"}`);
  }

  // 4. what is the ground at the corroborated coordinate?
  try {
    const g = Math.round(await elevationAt(dp.lat, dp.lng));
    console.log(`   ground at the donor coordinate: ${g} ft   (suspect states ${se ?? "—"}, donor ${de ?? "—"})`);
  } catch (e) { console.log(`   ground read failed: ${e.message}`); }

  // 1. does the suspect's own prose name the place?
  const p = proseOf(sus);
  const key = c.name.split(/[\s/]+/).filter((w) => w.length > 3)[0] || c.name;
  const re = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "ig");
  const hits = [...p.matchAll(re)];
  console.log(`   prose mentions "${key}": ${hits.length} time(s)`);
  for (const h of hits.slice(0, 4)) {
    console.log(`      …${p.slice(Math.max(0, h.index - 110), h.index + 130).replace(/\s+/g, " ")}…`);
  }

  // 2. does the prose state a direction the pin contradicts?
  if (c.relTo) {
    const rw = wpOf(sus, c.relTo);
    if (rw) {
      const rp = { lat: Number(rw.lat), lng: Number(rw.lng) };
      console.log(`   from its own "${c.relTo}" pin, the suspect lies ${compass(bearing(rp, sp))} (${Math.round(bearing(rp, sp))}°), ${Math.round(metres(rp, sp))} m`);
      console.log(`   the corroborated position lies ${compass(bearing(rp, dp))} (${Math.round(bearing(rp, dp))}°), ${Math.round(metres(rp, dp))} m`);
    }
  }
}
console.log("\nREPORT-ONLY.");
