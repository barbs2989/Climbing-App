// Read-only: print one LIVE route row as JSON (gpx summarised). usage: node row.mjs <route id>
import { SUPABASE_URL, headers, requireServiceKey } from "../../lib/supabase-env.mjs";
const key = requireServiceKey();
const id = process.argv[2];
const [r] = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?select=*&id=eq.${encodeURIComponent(id)}`, { headers: headers(key) })).json();
if (!r) { console.log("no row", id); process.exit(1); }
const { name_search, gpx, ...rest } = r;
console.log(JSON.stringify({ ...rest, gpx_summary: Array.isArray(gpx) ? { points: gpx.length, first: gpx[0], last: gpx[gpx.length - 1], all: gpx.length <= 30 ? gpx : undefined } : gpx }, null, 1));
