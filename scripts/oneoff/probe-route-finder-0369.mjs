// Probes 0369's new Route finder filters through PostgREST with the ANON key, as the app calls them.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";
const call = async (fn, body) => {
  const t = Date.now();
  const r = await fetch(SUPABASE_URL + "/rest/v1/rpc/" + fn, { method: "POST", headers: headers(anonKey(), { "Content-Type": "application/json" }), body: JSON.stringify(body) });
  const j = await r.json();
  return { ms: Date.now() - t, status: r.status, j };
};
const cases = [
  ["old call shape, Washington, sport", { root_id: "washington", disc: "sport", sort_by: "lr", lim: 3 }],
  ["WA prominence >= 2000 ft", { root_id: "washington", min_prom_ft: 2000, sort_by: "lr", lim: 5 }],
  ["WA peaks >= 9000 ft", { root_id: "washington", min_elev_ft: 9000, sort_by: "lr", lim: 5 }],
  ["WA gain 3000-5000 ft", { root_id: "washington", min_gain_ft: 3000, max_gain_ft: 5000, sort_by: "lr", lim: 5 }],
  ["WA round trip <= 8 km", { root_id: "washington", max_trip_km: 8, sort_by: "lr", lim: 5 }],
  ["within 40 km of Seattle, nearest", { root_id: "washington", near_lat: 47.6062, near_lng: -122.3321, within_km: 40, sort_by: "near", lim: 5 }],
  ["California gain >= 3000 (whole state)", { root_id: "california", min_gain_ft: 3000, sort_by: "lr", lim: 5 }],
  ["California within 50 km of Yosemite Valley", { root_id: "california", near_lat: 37.7456, near_lng: -119.5936, within_km: 50, sort_by: "near", lim: 5 }],
  ["name search 'liberty' WA, prom >= 1000", { root_id: "washington", q: "liberty", min_prom_ft: 1000, lim: 5 }],
];
for (const [label, body] of cases) {
  const rows = await call("routes_in_subtree", body);
  const { lim, off, sort_by, ...cb } = body;
  const n = await call("routes_in_subtree_count", cb);
  const names = Array.isArray(rows.j) ? rows.j.map(r => r.name + (r.gain_ft ? " " + r.gain_ft + "ft" : "")).join(" | ") : JSON.stringify(rows.j).slice(0, 200);
  console.log(`${label}: count=${JSON.stringify(n.j)} (${n.ms} ms, ${n.status}); rows ${rows.ms} ms ${rows.status}: ${names}`);
}
