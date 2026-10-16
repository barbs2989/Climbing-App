// `audit:summit-pins` section 1 reports a route whose SUMMIT pin and its peak's own `areas` row
// disagree while stating the same elevation. Two survive in WA. Neither peak has a second route
// to act as a donor, so the only two records ARE the pin and the area row — and the audit
// correctly declines to say which is wrong.
//
// The ground and the gazetteer are records neither of them derives from. This measures both and
// says what they support; it writes nothing.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";
import { summitProbe } from "../lib/terrain.mjs";
import { gnis } from "./probe-gnis-reachable.mjs";

const CASES = [
  { area: "wa_reynolds_peak", route: "wa_reynolds_peak_scramble", term: "REYNOLDS", box: [-120.62, 48.33, -120.51, 48.42] },
  { area: "wa_the_pyramid_picket", route: "wa_the_pyramid_picket_south_route", term: "PYRAMID", box: [-121.35, 48.73, -121.24, 48.82] },
];

const k = anonKey();
const num = (v) => { const n = Number(v); return v !== null && v !== "" && Number.isFinite(n) ? n : null; };
const D = (a, b, c, d) => {
  const R = 6371000, t = (x) => x * Math.PI / 180, dp = t(c - a), dl = t(d - b);
  const h = Math.sin(dp / 2) ** 2 + Math.cos(t(a)) * Math.cos(t(c)) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

for (const c of CASES) {
  const ar = await fetch(`${SUPABASE_URL}/rest/v1/areas?id=eq.${c.area}&select=id,name,lat,lng,elevation_ft`, { headers: headers(k) });
  const area = (await ar.json())[0];
  const rr = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${c.route}&select=id,waypoints`, { headers: headers(k) });
  const route = (await rr.json())[0];
  if (!area || !route) { console.log(`  ${c.area}: row missing — refusing to judge`); continue; }
  const pin = (route.waypoints || []).filter(Boolean).find((w) => /summit|topout/i.test(String(w.type || "")));
  if (!pin || num(pin.lat) == null) { console.log(`  ${c.area}: no placed summit pin`); continue; }

  let feat = null;
  for (const layer of [5, 7]) {
    try { const hits = await gnis(c.term, c.box, layer);
      const s = hits.filter((h) => /summit/i.test(h.cls || ""));
      const named = s.filter((h) => String(h.name || "").toLowerCase().replace(/[^a-z]/g, "") === String(area.name).toLowerCase().replace(/[^a-z]/g, ""));
      if (named.length === 1) { feat = named[0]; break; }
      if (named.length > 1) { console.log(`  ${c.area}: the gazetteer holds ${named.length} features of that name — ambiguous`); break; }
    } catch { /* reported below */ }
  }

  const gA = await summitProbe(num(area.lat), num(area.lng), 12);
  const gP = await summitProbe(num(pin.lat), num(pin.lng), 12);
  console.log(`\n${area.name} states ${area.elevation_ft} ft; the two records are ${Math.round(D(num(area.lat), num(area.lng), num(pin.lat), num(pin.lng)))} m apart`);
  const line = (label, la, ln, g) => {
    const dg = feat ? `${String(Math.round(D(la, ln, feat.lat, feat.lng))).padStart(4)} m from GNIS` : "gazetteer unread";
    console.log(`  ${label.padEnd(14)} ${`${la},${ln}`.padEnd(26)} ground ${g.centre == null ? "  UNREAD" : String(Math.round(g.centre)).padStart(6) + " ft"}  isMax=${String(g.isMax).padEnd(5)} ${String(g.note).padEnd(28)} ${dg}`);
  };
  line("areas row", num(area.lat), num(area.lng), gA);
  line("route pin", num(pin.lat), num(pin.lng), gP);
  if (gA.centre == null || gP.centre == null) { console.log(`  3DEP could not answer for both — no evidence is not agreement; re-run.`); continue; }
  console.log(`  ground separates them by ${Math.round(Math.abs(gA.centre - gP.centre))} ft`);
}
console.log(`\nReport only; nothing was changed. A repair here would copy one stored record onto the`);
console.log(`other — there is no third route to act as a donor on either peak.`);
