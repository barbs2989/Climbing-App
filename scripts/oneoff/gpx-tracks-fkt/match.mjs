// Match cached FKT tracks to incomplete catalog routes by GEOMETRY (same rule as audit-track-completeness).
// Read-only. Output: candidates.json, one row per (route, FKT track) that passes the rule.
import fs from "fs";
import path from "path";
import { assessTrack } from "./rule.mjs";
const REPO = "/Users/nathanbarber/dev/Climbing-App/.claude/worktrees/gpx-route-tracks-2026-10-25";
const { SUPABASE_URL, anonKey, headers } = await import(`${REPO}/scripts/lib/supabase-env.mjs`);

const here = path.dirname(new URL(import.meta.url).pathname);
const comp = JSON.parse(fs.readFileSync(path.join(here, "../comp.json")));
const incompleteIds = comp.routes.filter(r => !r.complete).map(r => r.id);
const rows = [];
for (let i = 0; i < incompleteIds.length; i += 100) {
  const chunk = incompleteIds.slice(i, i + 100).map(x => encodeURIComponent(x)).join(",");
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,area_id,discipline,waypoints&id=in.(${chunk})`, { headers: headers(anonKey()) });
  if (!r.ok) throw new Error("read " + r.status);
  rows.push(...(await r.json()));
}
const tracks = JSON.parse(fs.readFileSync(path.join(here, "tracks.json"), "utf8"));
for (const t of tracks) {
  let a = 90, b = -90, c = 180, d = -180;
  for (const p of t.pts) { if (p[0] < a) a = p[0]; if (p[0] > b) b = p[0]; if (p[1] < c) c = p[1]; if (p[1] > d) d = p[1]; }
  t.box = [a, b, c, d];
}
const STOP = new Set(["the", "and", "route", "climb", "via", "of", "peak", "mount", "mt", "north", "south", "east", "west", "ridge", "standard", "trail", "loop", "to", "from", "a", "in", "on", "face", "couloir", "traverse", "summit", "glacier", "slopes", "side"]);
const toks = s => (s || "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(w => w && !STOP.has(w));
const PAD = 0.01;
const out = [];
for (const r of rows) {
  const wps = (r.waypoints || []).filter(w => w.lat != null && w.lng != null);
  if (!wps.some(w => /trailhead/i.test(w.type || "")) || !wps.some(w => /summit/i.test(w.type || ""))) continue;
  const near = t => wps.some(w => w.lat >= t.box[0] - PAD && w.lat <= t.box[1] + PAD && w.lng >= t.box[2] - PAD && w.lng <= t.box[3] + PAD);
  for (const t of tracks.filter(near)) {
    const v = assessTrack(t.pts, wps);
    if (!v.complete) continue;
    const a = new Set(toks(r.name)), tt = new Set(toks(t.title));
    let hit = 0; for (const w of a) if (tt.has(w)) hit++;
    out.push({ id: r.id, name: r.name, discipline: r.discipline, slug: t.slug, fktTitle: t.title, nameHits: hit, nameTokens: a.size, points: t.pts.length });
  }
}
fs.writeFileSync(path.join(here, "candidates.json"), JSON.stringify(out, null, 1));
const byId = {};
for (const c of out) (byId[c.id] ||= []).push(c);
console.log(`routes read ${rows.length}; FKT tracks ${tracks.length}; routes with a complete FKT match ${Object.keys(byId).length}; pairs ${out.length}`);
for (const [id, cs] of Object.entries(byId)) console.log(id, "|", cs.map(c => `${c.slug} (${c.nameHits}/${c.nameTokens})`).join(" , "));
