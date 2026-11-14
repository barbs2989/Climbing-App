// Remove a recorded track that was recorded somewhere other than the route (owner rule: a route's
// map line is a recorded track of THAT route, or nothing). One PATCH per route, paced, rollback
// written first, row re-read after. Usage: node .../remove-offroute-tracks.mjs id1 id2 ... [--dry]
import fs from "fs";
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../../lib/supabase-env.mjs";
const key = requireServiceKey();
const dry = process.argv.includes("--dry");
const ids = process.argv.slice(2).filter(a => !a.startsWith("--"));
const read = async id => (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${id}&select=id,area_id,gpx`, { headers: headers(key) })).json())[0];
const rows = [];
for (const id of ids) { const r = await read(id); if (!r || !r.gpx) { console.log("skip (no row or no gpx)", id); continue; } rows.push(r); console.log(id, "gpx pts", Array.isArray(r.gpx) ? r.gpx.length : "?"); }
if (dry || !rows.length) process.exit(0);
const rb = `scripts/rollback-wa-offroute-tracks-${Date.now()}.json`;
fs.writeFileSync(rb, JSON.stringify(rows.map(r => ({ id: r.id, gpx: r.gpx }))));
for (const r of rows) {
  await patchRow("routes", r.id, { gpx: null }, { filter: `area_id=eq.${encodeURIComponent(r.area_id)}` });
  await new Promise(s => setTimeout(s, 1500));
  const after = await read(r.id);
  console.log(r.id, after && after.gpx === null ? "removed, read back null" : "READ-BACK MISMATCH");
}
console.log("rollback", rb);
