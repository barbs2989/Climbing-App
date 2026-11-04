// Validate verdicts against their packets and print a review sheet of every proposed track, pin and
// fact count. Read-only. Flags: verdict area/route ids that are not in the packet (a foreign or
// clobbered file), "same" calls whose logged route is blank on a peak with several routes, off-season.
// Usage: node review.mjs <packetsDir> <verdictsDir>
import fs from "fs";
import path from "path";
const [pDir, vDir] = process.argv.slice(2);
let problems = 0, tracks = 0, pins = 0, facts = 0;
for (const f of fs.readdirSync(vDir).filter(f => f.endsWith(".json"))) {
  const v = JSON.parse(fs.readFileSync(path.join(vDir, f), "utf8"));
  const area = f.replace(/\.json$/, "");
  const pf = path.join(pDir, f);
  if (!fs.existsSync(pf)) { console.log(`!! ${f}: no packet`); problems++; continue; }
  const p = JSON.parse(fs.readFileSync(pf, "utf8"));
  if (v.area_id !== area) { console.log(`!! ${f}: area_id ${v.area_id}`); problems++; }
  const ids = new Set(p.routes.map(r => r.id));
  const vids = new Set((v.routes || []).map(r => r.route_id));
  for (const id of vids) if (!ids.has(id)) { console.log(`!! ${f}: route ${id} not in packet`); problems++; }
  for (const id of ids) if (!vids.has(id)) { console.log(`!! ${f}: packet route ${id} has no verdict`); problems++; }
  for (const r of v.routes || []) {
    facts += (r.facts || []).length; pins += (r.pins || []).length;
    const t = r.track; if (!t) continue;
    const pt = p.tracks.find(x => String(x.aid) === String(t.aid));
    if (!pt) { console.log(`!! ${r.route_id}: track ${t.aid} not in packet`); problems++; continue; }
    tracks++;
    const flags = [];
    if (t.verdict !== "same") flags.push("verdict=" + t.verdict);
    if (!pt.loggedRoute && p.routes.length > 1) flags.push("BLANK-LOGGED-ROUTE on a multi-route peak");
    if (t.inSeason !== true) flags.push("not in season");
    const type = (pt.stats || []).find(s => s[1] === "Ascent Type")?.[2] || "";
    if (!/Successful Summit/.test(type)) flags.push("not a logged summit");
    const ours = p.routes.find(x => x.id === r.route_id);
    console.log(`${r.route_id.padEnd(48)} ${String(t.aid).padEnd(8)} ${String(pt.date).padEnd(11)} ${t.kind.padEnd(8)} logged="${pt.loggedRoute}" ours="${ours?.name}"${flags.length ? "  << " + flags.join("; ") : ""}`);
  }
  for (const r of v.routes || []) for (const q of r.pins || []) console.log(`   PIN ${r.route_id} ${q.action} ${q.type} ${q.lat},${q.lng} confirmedBy=${(q.confirmedBy || "-").slice(0, 80)}`);
}
console.log(`tracks ${tracks}, pins ${pins}, facts ${facts}, validation problems ${problems}`);
