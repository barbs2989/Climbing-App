#!/usr/bin/env node
// CONTROL FIRST. Can this box reach GNIS and the USGS DEM, and do they agree with places the
// catalog already knows? Asked before building a solver on them, because the expected output of a
// solver is "a plausible coordinate" — which is exactly what a broken pipeline emits.
//
// TWO TRAPS, both met here rather than reasoned about:
//   - GNIS returns geometry in the service's native WEB MERCATOR unless outSR is asked for. Without
//     it the first run came back 6108028,-13525054 and treating that as degrees is silent nonsense.
//   - a coordinate carried in from memory is not a control. The first DEM check read 4,139 ft for a
//     ~6,214 ft peak, and the peak coordinate was mine, not the catalog's.
import { selectAll } from "../lib/supabase-env.mjs";
import { elevationAt } from "../lib/terrain.mjs";

const GNIS = "https://carto.nationalmap.gov/arcgis/rest/services/geonames/MapServer";

export async function gnis(name, box, layer = 5) {
  // UPPER on BOTH sides. ArcGIS LIKE is CASE-SENSITIVE, and that is not a detail: this control
  // searched "Headlee" and found the pass, while the solver normalised its search terms to
  // lowercase and found NOTHING — for every one of 25 pins. It would have reported them all as
  // "a climbers' name, not a federal one": plausible, uniform, and completely wrong.
  const where = `UPPER(gaz_name) LIKE '%${name.replace(/'/g, "''").toUpperCase()}%'`;
  const u = `${GNIS}/${layer}/query?where=${encodeURIComponent(where)}&geometry=${box.join(",")}`
    + `&geometryType=esriGeometryEnvelope&inSR=4326&outSR=4326&spatialRel=esriSpatialRelIntersects`
    + `&outFields=*&returnGeometry=true&f=json`;
  const r = await fetch(u, { signal: AbortSignal.timeout(25000) });
  if (!r.ok) throw new Error(`GNIS HTTP ${r.status}`);
  const j = await r.json();
  if (j.error) throw new Error(`GNIS ${JSON.stringify(j.error).slice(0, 120)}`);
  return (j.features || []).map((f) => {
    const g = f.geometry || {};
    // Layer 5 (Landforms) returns {points:[[x,y]]}; layer 7 returns {x,y}. Handling only one is
    // how an earlier probe crashed on its first landform and printed "(not in GNIS)".
    const pt = g.x != null ? { lng: g.x, lat: g.y }
      : Array.isArray(g.points) && g.points.length ? { lng: g.points[0][0], lat: g.points[0][1] } : null;
    return pt && { name: f.attributes?.gaz_name, cls: f.attributes?.gaz_featureclass, ...pt };
  }).filter(Boolean);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  // Controls come from the CATALOG, not from memory: four peaks whose coordinate and height this
  // repo already stores, so agreement is a check on the DEM rather than on my recall.
  const areas = await selectAll("areas", "id,name,lat,lng", "id=in.(wa_vesper_peak,wa_guye_peak,wa_mount_spickard,wa_dome_peak)", { pageSize: 100 });
  if (!areas.length) { console.error("FAIL — read 0 control areas."); process.exit(1); }
  console.log("DEM vs the catalog's own peak coordinates:\n");
  for (const a of areas) {
    if (a.lat == null) { console.log(`  ${a.name}: no coordinate stored`); continue; }
    const e = await elevationAt(Number(a.lat), Number(a.lng));
    console.log(`  ${String(a.name).padEnd(22)} ${Number(a.lat).toFixed(5)},${Number(a.lng).toFixed(5)}   DEM ${e == null ? "UNREACHABLE" : Math.round(e) + " ft"}`);
  }

  const v = areas.find((a) => a.id === "wa_vesper_peak");
  if (v?.lat != null) {
    const box = [Number(v.lng) - 0.25, Number(v.lat) - 0.25, Number(v.lng) + 0.25, Number(v.lat) + 0.25];
    const hits = await gnis("Headlee", box);
    console.log(`\nGNIS control — "Headlee Pass" near ${v.name}: ${hits.length} hit(s)`);
    for (const h of hits) {
      const e = await elevationAt(h.lat, h.lng);
      console.log(`  ${h.name} [${h.cls}]  ${h.lat.toFixed(5)},${h.lng.toFixed(5)}  DEM ${e == null ? "?" : Math.round(e) + " ft"}   (the row states 4,720 ft)`);
    }
  }
}
