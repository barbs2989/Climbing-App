// Read route rows side by side (with their area) to decide whether two are one climb. node read-route-pairs.mjs id1,id2 id3,id4 ...
import { SUPABASE_URL as url, requireServiceKey, headers } from "../lib/supabase-env.mjs";
const key = requireServiceKey();
const H = headers(key);
const COLS = "id,name,grade,discipline,area_id,pitches,length_m,fa,bolts,anchor,location,guide_stars,overview,areas(name,lat,lng,path)";
for (const pair of process.argv.slice(2)) {
  const ids = pair.split(",");
  const r = await fetch(`${url}/rest/v1/routes?select=${COLS}&id=in.(${ids.map(encodeURIComponent).join(",")})`, { headers: H });
  const rows = await r.json();
  if (!Array.isArray(rows)) { console.log("read failed", r.status, JSON.stringify(rows)); process.exit(1); }
  console.log("==", pair);
  for (const x of rows) console.log(JSON.stringify(x));
  for (const id of ids) {
    const refs = [];
    for (const t of ["contributions", "climb_logs"]) { const q = await fetch(`${url}/rest/v1/${t}?select=id&route_id=eq.${encodeURIComponent(id)}&limit=1`, { headers: H }); const j = await q.json(); if (Array.isArray(j) && j.length) refs.push(t); }
    console.log("  refs", id, refs.join(",") || "none");
  }
}
