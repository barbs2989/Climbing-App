#!/usr/bin/env node
// Repair the four routes audit:coord-origin found storing coordinates in the wrong part of the
// continent. Three distinct repairs, because they are three distinct defects.
//
// NO COORDINATE IS TYPED ANYWHERE IN THIS FILE, and that is the safety rather than a style: every
// operation is either a CLEAR or a MOVE to a declared area id, and each is gated on a fact the
// CATALOG already holds. A repair needing a coordinate somebody invented cannot be expressed here
// at all — the same structural safety fix-trailhead-disagreements-batch4 gets from "declare a
// winner, never a coordinate".
import { selectAll, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
const KM = (p, q) => {
  const R = 6371, t = Math.PI / 180;
  const dla = (q.lat - p.lat) * t, dln = (q.lng - p.lng) * t;
  return 2 * R * Math.asin(Math.sqrt(Math.sin(dla / 2) ** 2 + Math.cos(p.lat * t) * Math.cos(q.lat * t) * Math.sin(dln / 2) ** 2));
};
const num = (v) => (v == null || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

const PLAN = [
  {
    id: "ar_cutthroat", op: "clear-logistics",
    why: "An ARKANSAS 5.11d sport route carrying WASHINGTON's Cutthroat Peak wholesale — peak "
       + "coordinate, trailhead name, trailhead coordinate and trailhead direction, every field. "
       + "The only thing it shares with that peak is the word Cutthroat in its ROUTE name.",
    // The gate: the blob's own peak coordinate must be nowhere near this route's area. If a later
    // pass has already corrected it, this refuses rather than clearing good data.
    gate: (r, area) => {
      const al = r.approach_logistics || {};
      const p = { lat: num(al.peakLat), lng: num(al.peakLng) };
      if (p.lat == null) return "no peak coordinate left to judge — already repaired?";
      const km = KM(p, area);
      return km > 500 ? null : `peak coordinate is only ${km.toFixed(0)} km from the area; not obviously foreign any more`;
    },
  },
  {
    id: "az_cutthroat_trout", op: "clear-logistics",
    why: "The same Washington blob on an ARIZONA 5.9+ trad route. Both rows share it and no "
       + "Washington route carries that trailhead string at all, so it was written onto the two "
       + "namesakes and nowhere else.",
    gate: (r, area) => {
      const al = r.approach_logistics || {};
      const p = { lat: num(al.peakLat), lng: num(al.peakLng) };
      if (p.lat == null) return "no peak coordinate left to judge — already repaired?";
      const km = KM(p, area);
      return km > 500 ? null : `peak coordinate is only ${km.toFixed(0)} km from the area`;
    },
  },
  {
    id: "wa_true_grit", op: "clear-waypoints",
    why: "RESIDUE OF A REPAIR ALREADY RECORDED AS DONE. CLAUDE.md documents this row as a "
       + "Frenchman Coulee sport route that had carried Vesper Peak's prose, and says it was "
       + "FIXED — overview, beta and approach were cleared while the genuinely-Coulee hazards "
       + "were correctly kept. Both WAYPOINTS were missed, and still sit 160 km away on Vesper "
       + "Peak. An instance fixed by hand is not a class closed.",
    gate: (r, area) => {
      const far = (r.waypoints || []).filter((w) => { const p = { lat: num(w && w.lat), lng: num(w && w.lng) }; return p.lat != null && KM(p, area) > 50; });
      if (!far.length) return "no far waypoints left — already repaired?";
      if (far.length !== (r.waypoints || []).filter((w) => num(w && w.lat) != null).length) return "some placed waypoints are LOCAL — clearing all of them would destroy good pins";
      return null;
    },
  },
  {
    id: "wa_up_in_arms", op: "move", to: "wa_concord_tower",
    why: "MISFILED, not contaminated. Every prose field describes Concord Tower's southwest "
       + "face, both pins are at Concord Tower and the Blue Lake trailhead, and the NON-PROSE "
       + "column settles it the way it settled wa_south_face_direct: all eight siblings on "
       + "wa_upper_wall are 0-pitch single-pitch crag routes and this is 6 pitches. Concord "
       + "Tower holds no route of this name, so nothing is duplicated.",
    // THE DESTINATION IS PROVEN BY THE ROW'S OWN PINS, not asserted: the route's waypoints must
    // sit near the area it is being moved to. A wrong destination cannot pass this.
    gate: (r, area, dest) => {
      if (!dest || dest.lat == null) return "destination area has no coordinate to check against";
      const pins = (r.waypoints || []).map((w) => ({ lat: num(w && w.lat), lng: num(w && w.lng) })).filter((p) => p.lat != null);
      if (!pins.length) return "no placed pins, so the destination cannot be proven from the row";
      const worst = Math.max(...pins.map((p) => KM(p, dest)));
      return worst < 10 ? null : `the row's own pins are up to ${worst.toFixed(1)} km from the destination — not proven`;
    },
  },
];

const rows = await selectAll("routes", "id,name,area_id,waypoints,approach_logistics",
  `id=in.(${PLAN.map((p) => p.id).join(",")})`, { pageSize: 50 });
if (rows.length !== PLAN.length) { console.error(`FAIL — expected ${PLAN.length} rows, got ${rows.length}.`); process.exit(1); }
const aids = [...new Set([...rows.map((r) => r.area_id), ...PLAN.map((p) => p.to).filter(Boolean)])];
const areas = await selectAll("areas", "id,name,lat,lng", `id=in.(${aids.join(",")})`, { pageSize: 50 });
const byId = new Map(areas.map((a) => [a.id, a]));

let ok = 0, refused = 0;
for (const step of PLAN) {
  const r = rows.find((x) => x.id === step.id);
  const a = byId.get(r.area_id);
  if (!a || a.lat == null) { console.log(`REFUSED ${step.id} — its area has no coordinate to judge against`); refused++; continue; }
  const area = { lat: Number(a.lat), lng: Number(a.lng) };
  const dest = step.to ? byId.get(step.to) : null;
  const bad = step.gate(r, area, dest ? { lat: Number(dest.lat), lng: Number(dest.lng) } : null);
  if (bad) { console.log(`REFUSED ${step.id} — ${bad}`); refused++; continue; }

  const patch = step.op === "clear-logistics" ? { approach_logistics: null }
    : step.op === "clear-waypoints" ? { waypoints: [] }
    : { area_id: step.to };
  console.log(`ok ${step.id.padEnd(22)} ${step.op}${step.to ? ` -> ${step.to} (${dest.name})` : ""}`);
  console.log(`     ${step.why.replace(/\s+/g, " ").slice(0, 300)}`);
  if (APPLY) { requireServiceKey(); await patchRow("routes", step.id, patch); console.log("     written"); }
  ok++;
}
console.log(`\n${ok} repair(s)${APPLY ? " applied" : " ready (dry run — pass --apply)"}, ${refused} refused.`);
process.exitCode = refused ? 1 : 0;
