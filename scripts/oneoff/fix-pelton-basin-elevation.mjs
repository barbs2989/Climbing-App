// A CAMP 622 FT ABOVE THE GROUND IT SITS ON, ON 25 ROWS — AND I SPREAD IT TODAY.
//
// audit:camp-elevations reports exactly one disagreement in the whole camp store: "Pelton Basin"
// stores 5,400 ft against 4,767 ft of ground, on 25 rows. Four of those were written this morning
// by solve-camp-elevations' WAYPOINT-DONOR path, copying 5,400 from the catalog waypoint "Pelton
// Basin Camp" — so if the waypoint is wrong, the fill propagated it.
//
// IT IS WRONG, by the same three facts that settled Skagit Queen
// (check-pelton-basin-elevation.mjs):
//   1. THE PIN IS REAL — 48.46268,-121.04877, five decimals, no interpolation residue.
//   2. THE GAZETTEER FEATURE IS THE SAME PLACE — "Pelton Basin, Water Access Trail, Chelan County"
//      is FOURTEEN METRES from the pin. Agreeing on height only counts when the two records are
//      also in the same place; at 14 m this is not a coincidence.
//   3. BOTH GROUND READS AGREE AND THE STATED VALUE DOES NOT — 4,778 ft under the pin, 4,767 ft
//      under the gazetteer feature, against a stated 5,400.
//
// THE GATE CUTS BOTH WAYS, which is why this was checked rather than swept. Sahale Glacier Camp's
// pin sits 458 m from its gazetteer feature, so the ground under it speaks for somewhere else and
// the stored value stands. Here the distance is 14 m. The SAME audit line looks identical in both
// cases; only the distance separates them.
//
// TWO OTHER PINS MENTION PELTON BASIN AND ARE NOT TOUCHED: "Cascade Pass — cross and descend east
// toward Pelton Basin" on two Magic Mountain routes states 5,392 ft with ground of 5,321 (-71 ft,
// self-consistent) and sits 1,037 m from the gazetteer feature. Those are CASCADE PASS; the name
// merely mentions where you are heading. A repair that matched on the name alone would have moved
// them 600 ft.
//
// DECLARED-STATE CONTRACT: the expected values and the pin are named, the ground is RE-MEASURED at
// apply time rather than trusted from this file, and the run refuses if anything has moved.
import { SUPABASE_URL, requireServiceKey, headers, patchRow, selectAll } from "../lib/supabase-env.mjs";
import { elevationAt } from "../lib/terrain.mjs";

const WP_ROUTE = "wa_hurry_up_peak_south_ridge";
const WP_NAME = "Pelton Basin Camp";
const EXPECT_STATED = 5400;
const PIN = { lat: 48.46268, lng: -121.04877 };
const GAZ = { lat: 48.462612, lng: -121.048625 };   // "Pelton Basin, Water Access Trail" — 14 m off
const EXPECT_ROWS = 25;

const H = headers(requireServiceKey());
const get = async (id, sel) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=${sel}&id=eq.${id}`, { headers: H });
  if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
  const j = await r.json();
  if (j.length !== 1) throw new Error(`${id}: ${j.length} rows`);
  return j[0];
};

// ---- re-measure, so the argument has to still hold when this runs -------------------------
const gPin = Math.round(await elevationAt(PIN.lat, PIN.lng));
const gGaz = Math.round(await elevationAt(GAZ.lat, GAZ.lng));
console.log(`ground under the pin ${gPin} ft; under the gazetteer feature ${gGaz} ft; stated ${EXPECT_STATED} ft`);
if (Math.abs(gPin - gGaz) > 60) {
  console.log("REFUSED — the two ground reads no longer agree; they are not describing one place.");
  process.exit(1);
}
if (EXPECT_STATED - gPin < 300) {
  console.log("REFUSED — the stated value is no longer far above the ground. The disagreement is gone.");
  process.exit(1);
}

// ---- the waypoint --------------------------------------------------------------------------
const wrow = await get(WP_ROUTE, "id,waypoints");
const wps = Array.isArray(wrow.waypoints) ? wrow.waypoints : [];
const wi = wps.findIndex((w) => w && String(w.name || "").trim() === WP_NAME);
if (wi < 0) { console.log(`REFUSED — no waypoint "${WP_NAME}" on ${WP_ROUTE}`); process.exit(1); }
if (Number(wps[wi].elev) !== EXPECT_STATED) {
  console.log(`REFUSED — waypoint states ${wps[wi].elev}, expected ${EXPECT_STATED}`); process.exit(1);
}
if (Math.abs(Number(wps[wi].lat) - PIN.lat) > 0.0002 || Math.abs(Number(wps[wi].lng) - PIN.lng) > 0.0002) {
  console.log("REFUSED — the pin has moved; the ground under it is different ground."); process.exit(1);
}

// ---- the camp rows -------------------------------------------------------------------------
// Matched on the camp's own name, NEVER on a name that merely mentions Pelton Basin — the two
// Cascade Pass waypoints are why.
const NAME_RE = /^pelton basin( camp)?$/i;
const rows = await selectAll("routes", "id,bivy", "bivy=not.is.null", { pageSize: 1000 });
const targets = [];
for (const r of rows) (r.bivy || []).forEach((b, i) => {
  if (b && NAME_RE.test(String(b.name || "").trim()) && Number(b.elev) === EXPECT_STATED)
    targets.push({ route: r.id, idx: i, name: b.name });
});
console.log(`${targets.length} camp row(s) store ${EXPECT_STATED} ft under this name`);
if (targets.length !== EXPECT_ROWS) {
  console.log(`REFUSED — expected ${EXPECT_ROWS}. The store has moved since this was reasoned about.`);
  process.exit(1);
}

if (!process.argv.includes("--apply")) {
  console.log(`\ndry run — would set the waypoint to ${gPin} ft and ${targets.length} camp row(s) to ${gGaz} ft`);
  console.log("pass --apply to write");
  process.exit(0);
}

const nextW = JSON.parse(JSON.stringify(wps));
nextW[wi] = { ...nextW[wi], elev: gPin };
await patchRow("routes", WP_ROUTE, { waypoints: nextW });
console.log(`\nwaypoint ${WP_ROUTE}: ${EXPECT_STATED} -> ${gPin} ft`);

const byRoute = new Map();
for (const t of targets) {
  if (!byRoute.has(t.route)) byRoute.set(t.route, []);
  byRoute.get(t.route).push(t);
}
let wrote = 0;
for (const [route, ts] of byRoute) {
  const row = await get(route, "id,bivy");
  const next = JSON.parse(JSON.stringify(row.bivy));
  for (const t of ts) {
    if (!next[t.idx] || next[t.idx].name !== t.name || Number(next[t.idx].elev) !== EXPECT_STATED) {
      console.log(`REFUSED mid-run — ${route} bivy[${t.idx}] has moved`); process.exit(1);
    }
    next[t.idx] = { ...next[t.idx], elev: gGaz };
  }
  await patchRow("routes", route, { bivy: next });
  wrote++;
}
console.log(`wrote ${wrote} route(s) covering ${targets.length} camp row(s)`);

let ok = 0;
for (const t of targets) {
  const back = (await get(t.route, "id,bivy")).bivy[t.idx];
  if (back && Number(back.elev) === gGaz) ok++;
  else console.log(`  MISMATCH ${t.route} bivy[${t.idx}]`);
}
const wBack = (await get(WP_ROUTE, "id,waypoints")).waypoints[wi];
const wOk = Number(wBack.elev) === gPin && Number(wBack.lat) === PIN.lat;
console.log(`verified ${ok}/${targets.length} camp row(s); waypoint ${wOk ? "ok" : "MISMATCH"}`);
process.exitCode = (ok === targets.length && wOk) ? 0 : 1;
