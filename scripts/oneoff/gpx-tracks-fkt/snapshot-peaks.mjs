// One read of the catalog for matching routes that have NO pins: every alpine, mountaineering and
// scrambling route with its area, and every area of type peak with a coordinate. Read-only, paced
// pages through selectAll. Writes research-data/gpx-tracks-fkt-peaks-2026-10-29/{routes,peaks}.json.
import fs from "fs";
import { selectAll } from "../../lib/supabase-env.mjs";
const D = "research-data/gpx-tracks-fkt-peaks-2026-10-29";
fs.mkdirSync(D, { recursive: true });
const routes = await selectAll("routes", "id,name,area_id,discipline,grade", "discipline=in.(alpine,mountaineering,scrambling)", { pageSize: 200 });   // 1000 a page returned HTTP 500 under load
fs.writeFileSync(`${D}/routes.json`, JSON.stringify(routes));
const peaks = await selectAll("areas", "id,name,area_type,lat,lng,elevation_ft,parent_id", "area_type=eq.peak&lat=not.is.null", { pageSize: 200 });   // 1000 a page returned HTTP 500 under load
fs.writeFileSync(`${D}/peaks.json`, JSON.stringify(peaks));
console.log(routes.length, "routes;", peaks.length, "peaks with a coordinate");
