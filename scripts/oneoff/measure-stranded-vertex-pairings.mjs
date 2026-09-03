// WHICH HALF OF EACH STRANDED PAIR IS DECIDABLE?
//
// Every route audit:stranded-track-vertices still reports has exactly TWO adrift vertices and TWO
// orphaned pins -- and `trackIsJustTheWaypoints` tolerates ONE (#1541). So the caveat comes back by
// repairing the CONFIDENT half of each pair and leaving the other alone; nothing needs the whole
// route settled. That is the elimination CLAUDE.md prescribes after the aggregate ambiguity gate
// was found defending a wrong assignment rather than replacing it.
//
// This measures rather than assumes: for each route it prints both assignments of 2 vertices to 2
// pins, the distance of every leg, and the ratio between the best leg and the next-best claim on
// the same vertex. A leg is CONFIDENT when it is short in absolute terms AND far shorter than any
// rival; anything else is left, because a pin REPLACED rather than refined has nowhere correct to
// carry its vertex to (this catalog's documented refusal class -- 3-27 km, a different access
// point entirely).
//
// Read-only. No writes, no repairs. It answers "how many of the 8 are decidable", nothing else.
import { selectAll } from "../lib/supabase-env.mjs";

const R = 6371000;
const rad = (d) => (d * Math.PI) / 180;
function metres(a, b) {
  const dLat = rad(b[0] - a[0]), dLng = rad(b[1] - a[1]);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

// The same identity test the app's predicate uses: a vertex is "on" a pin within 5 m. Anything
// looser and a genuine recording's passing-nearby point would read as a waypoint copy.
const ON = 5;

const ROUTES = [
  "wa_andersons_thumb_standard", "wa_inner_constance_standard", "wa_mount_despair_east_route",
  "wa_mount_fury_west_west_ridge", "wa_mount_lyall_south_route", "wa_mount_rainier_liberty_ridge",
  "wa_mushroom_tower_standard", "wa_the_devils_club",
];

const rows = await selectAll("routes", "id,gpx,waypoints", `id=in.(${ROUTES.join(",")})`, { pageSize: 60 });
if (!rows.length) { console.error("FAIL-CLOSED: read returned nothing — this is not a clean catalog."); process.exit(1); }

const num = (v) => (v === null || v === undefined || v === "" ? null : (Number.isFinite(Number(v)) ? Number(v) : null));
let confident = 0, ambiguous = 0, far = 0;

for (const id of ROUTES) {
  const r = rows.find((x) => x.id === id);
  if (!r) { console.log(`  ${id}: NOT READ`); continue; }
  const line = (Array.isArray(r.gpx) ? r.gpx : []).map((p) => [num(p[0] ?? p.lat), num(p[1] ?? p.lng)]).filter((p) => p[0] !== null && p[1] !== null);
  const pins = (Array.isArray(r.waypoints) ? r.waypoints : [])
    .map((w) => ({ name: w.name || w.label || "(unnamed)", at: [num(w.lat), num(w.lng)] }))
    .filter((w) => w.at[0] !== null && w.at[1] !== null);

  const adrift = line.filter((v) => !pins.some((p) => metres(v, p.at) <= ON));
  const orphan = pins.filter((p) => !line.some((v) => metres(v, p.at) <= ON));
  if (adrift.length !== 2 || orphan.length !== 2) {
    console.log(`  ${id}: ${adrift.length} adrift / ${orphan.length} orphan — not the 2x2 shape, skipped`);
    continue;
  }

  // Both assignments, every leg.
  const d = [[metres(adrift[0], orphan[0].at), metres(adrift[0], orphan[1].at)],
             [metres(adrift[1], orphan[0].at), metres(adrift[1], orphan[1].at)]];
  console.log(`\n${id}`);
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++)
    console.log(`   v${i} -> "${orphan[j].name}"  ${Math.round(d[i][j])} m`);

  // The confident leg: the shortest overall, checked against every rival claim on EITHER endpoint.
  let bi = 0, bj = 0;
  for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) if (d[i][j] < d[bi][bj]) { bi = i; bj = j; }
  const best = d[bi][bj];
  const rivals = [d[bi][1 - bj], d[1 - bi][bj]];
  const ratio = Math.min(...rivals) / (best || 1e-9);
  const verdict = best > 1200 ? "FAR — the pin was replaced, not refined; nowhere correct to carry the vertex"
    : ratio < 3 ? `AMBIGUOUS — nearest rival is only ${ratio.toFixed(1)}x further`
    : `CONFIDENT — v${bi} belongs to "${orphan[bj].name}" (${Math.round(best)} m, ${ratio.toFixed(0)}x clear)`;
  if (verdict.startsWith("CONFIDENT")) confident++; else if (verdict.startsWith("FAR")) far++; else ambiguous++;
  console.log(`   => ${verdict}`);
  console.log(`      the OTHER vertex stays adrift, and one adrift is what #1541's slack tolerates.`);
}

console.log(`\n${confident} decidable · ${ambiguous} ambiguous · ${far} too far`);
console.log("A route needs only its CONFIDENT half repaired: the predicate allows one adrift vertex.");
