// Read-only probe: the rows the three verified facts touch (Lake Serene, Kautz camps, Glacier Peak access).
import { requireServiceKey, selectAll } from "../lib/supabase-env.mjs";
const key = requireServiceKey();
const rows = await selectAll("routes", "id,name,area_id,bivy,waypoints,access,approach", "id=like.wa_*", { key, pageSize: 1000 });
const mode = process.argv[2];
const short = s => String(s || "").replace(/\s+/g, " ").slice(0, 300);
if (mode === "serene") for (const r of rows) {
  const b = (r.bivy || []).filter(x => /serene/i.test(JSON.stringify(x))), w = (r.waypoints || []).filter(x => /serene/i.test(JSON.stringify(x)));
  if (b.length || w.length) console.log(JSON.stringify({ id: r.id, bivy: b, wps: w.map(x => ({ name: x.name, type: x.type, elev: x.elev, lat: x.lat, lon: x.lon, note: short(x.note || x.notes) })) }, null, 1));
}
if (mode === "hazard") for (const r of rows) {
  const b = (r.bivy || []).filter(x => /hazard|castle|wapowety/i.test(x.name || "")), w = (r.waypoints || []).filter(x => /hazard|castle|wapowety/i.test(x.name || ""));
  if (b.length || w.length) console.log(JSON.stringify({ id: r.id, bivy: b.map(x => ({ name: x.name, elev: x.elev, role: x.role, notes: short(x.notes) })), wps: w.map(x => ({ name: x.name, type: x.type, elev: x.elev, note: short(x.note || x.notes) })) }));
}
if (mode === "gp") {
  const RE = /suiattle|white chuck|downey|chiwawa|company creek|stehekin|north fork sauk|rat trap|buck creek|phelps creek|trinity/i;
  let n = 0; const clos = {};
  for (const r of rows) {
    const a = r.access || {}; const txt = JSON.stringify(a) + " " + (r.approach || "");
    if (!RE.test(txt)) continue; n++;
    const road = a.road_status || a.roads || a.closure || "";
    const k = short(JSON.stringify(Object.fromEntries(Object.entries(a).filter(([k]) => /road|closure|status|checked/i.test(k)))));
    (clos[k] = clos[k] || []).push(r.id);
  }
  console.log(n, "routes mention a GP-area road");
  for (const [k, ids] of Object.entries(clos).sort((a, b) => b[1].length - a[1].length)) console.log("\n#" + ids.length, ids.slice(0, 4).join(","), "\n  ", k);
}
