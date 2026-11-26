// Census for the Kautz Glacier traps on every OTHER mountain route (owner note, Kautz item).
//  A1  a rappel / down-climb entry that reads as a ROPED PITCH (graded 5th class or carrying an anchor)
//  A2  an ice / snow step that reads as a WALK (no tech grade, no anchor)
//  B   waypoint distMi stored as ROUND TRIP (last pin ~2x the one-way approach), or distMi going backwards
// Read-only. Writes research-data/glacier-pitch-sweep/census.json.
import fs from "node:fs";
import { selectAll, requireServiceKey } from "../../lib/supabase-env.mjs";
import { pitchEntryKind } from "../../../lib/breakdownRows.js";
const key = requireServiceKey();
const DISCS = ["mountaineering", "alpine", "ice", "mixed", "snow", "glacier", "scrambling"];
const RAP = /\b(rappel|rap|raps|abseil|down-?climb|lower(?:ing)?)\b/i;
const ICE = /\b(ice|icefall|ice step|ice pitch|ice chute|water ice|alpine ice|bergschrund|serac|steep snow|snow step|snow pitch|neve|névé)\b/i;
const out = { A1: [], A2: [], B: [], scanned: 0 };
for (const d of DISCS) {
  const rows = await selectAll("routes", "id,name,discipline,pitches,grade,ice_grade,dist_km,pitch_detail,waypoints", `discipline=eq.${d}&or=(pitch_detail.not.is.null,waypoints.not.is.null)`, { key, pageSize: 200 });
  for (const r of rows) {
    out.scanned++;
    const route = { discipline: r.discipline };
    const pd = Array.isArray(r.pitch_detail) ? r.pitch_detail : [];
    pd.forEach((p, i) => {
      if (!p) return;
      const k = pitchEntryKind(p, route);
      const lbl = String(p.pitch ?? p.n ?? "");
      const txt = lbl + " | " + (p.grade || "") + " | " + (p.note || p.notes || "");
      if (k === "pitch" && RAP.test(lbl + " " + (p.grade || ""))) out.A1.push({ id: r.id, name: r.name, d: r.discipline, pitches: r.pitches, i, lbl, grade: p.grade, anchor: p.anchor });
      if (k === "stage" && ICE.test(lbl + " " + (p.grade || "")) && !/approach|trail|camp|descent|descend/i.test(lbl)) out.A2.push({ id: r.id, name: r.name, d: r.discipline, ice: r.ice_grade, pitches: r.pitches, i, txt: txt.slice(0, 220) });
    });
    const wp = Array.isArray(r.waypoints) ? r.waypoints.filter((w) => w && typeof w.distMi === "number") : [];
    if (wp.length >= 2) {
      const max = Math.max(...wp.map((w) => w.distMi));
      const oneWayMi = r.dist_km ? r.dist_km / 1.609344 : null;
      const back = wp.some((w, j) => j && w.distMi < wp[j - 1].distMi - 0.05);
      const rt = oneWayMi && max > oneWayMi * 1.7 && max < oneWayMi * 2.3;
      if (rt || back) out.B.push({ id: r.id, name: r.name, d: r.discipline, oneWayMi: oneWayMi && +oneWayMi.toFixed(2), max, back, pins: wp.map((w) => [w.name, w.type, w.distMi]) });
    }
  }
  console.error(d, rows.length);
}
fs.mkdirSync("research-data/glacier-pitch-sweep", { recursive: true });
fs.writeFileSync("research-data/glacier-pitch-sweep/census.json", JSON.stringify(out, null, 1));
console.log("scanned", out.scanned, "A1", out.A1.length, "A2", out.A2.length, "B", out.B.length);
