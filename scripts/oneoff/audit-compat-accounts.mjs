// audit:compat-accounts (hand-run, read-only, service key; take a dbslot first). Scores COMPATIBILITY WITH YOU over the
// live accounts + 3 synthetic ones, every ordered pair, as the partner ROW and the PROFILE build them, and asserts 7 properties.
import fs from "node:fs"; import path from "node:path"; import { createRequire } from "node:module"; import { build } from "esbuild";
import { SUPABASE_URL, requireServiceKey, headers } from "../lib/supabase-env.mjs";
const ROOT = process.cwd(), req = createRequire(import.meta.url), K = requireServiceKey();
const get = async (p) => { const r = await fetch(SUPABASE_URL + "/rest/v1/" + p, { headers: headers(K) }); if (!r.ok) throw new Error(p + " " + r.status); return r.json(); };
const rpc = async (fn, body) => { const r = await fetch(SUPABASE_URL + "/rest/v1/rpc/" + fn, { method: "POST", headers: headers(K, { "Content-Type": "application/json" }), body: JSON.stringify(body) }); if (!r.ok) throw new Error(fn + " " + r.status); return r.json(); };
const outdir = fs.mkdtempSync(path.join(ROOT, ".cm-retest-")); process.on("exit", () => fs.rmSync(outdir, { recursive: true, force: true }));
await build({ stdin: { contents: `export { compat, compatParts, compatWhy, compatUnknown, __set_MY_PACE } from ${JSON.stringify(path.join(ROOT, "ClimbMatchCore.jsx"))};`, resolveDir: ROOT, loader: "js" },
  bundle: true, format: "cjs", platform: "node", jsx: "automatic", loader: { ".jsx": "jsx" }, define: { "import.meta.env": "{}" }, outfile: path.join(outdir, "b.cjs"), logLevel: "error" });
const M = req(path.join(outdir, "b.cjs"));
const profs = await get("profiles?select=id,username,disciplines,sport_grade,trad_grade,boulder_grade,availability,avail_week,hiking_speed_ft_hr,discoverable&order=created_at.asc");
const objs = await get("objectives?select=user_id,route_id");
const pa = await get("partner_areas?select=user_id,area_id,areas(path)");
const ver = new Set(await rpc("verified_user_ids", { p_ids: profs.map(p => p.id) }));
const rids = [...new Set(objs.map(o => o.route_id))];
const routes = rids.length ? await get("routes?select=id,name,discipline,areas(area_type)&id=in.(" + rids.map(encodeURIComponent).join(",") + ")") : [];
const rById = Object.fromEntries(routes.map(r => [r.id, r])); const CRAG = ["trad", "sport", "toprope", "aid", "bouldering"];
const counts = id => { const r = rById[id]; return !!r && (!CRAG.includes(r.discipline) || (r.areas && r.areas.area_type === "peak")); };
const A = profs.map(p => { const all = objs.filter(o => o.user_id === p.id).map(o => o.route_id); return { label: p.username, id: p.id, discoverable: p.discoverable, disciplines: p.disciplines || [], sportGrade: p.sport_grade, tradGrade: p.trad_grade, boulderGrade: p.boulder_grade, availability: p.availability || [], hikingSpeedFtHr: Number(p.hiking_speed_ft_hr) || undefined, verified: ver.has(p.id), matchObj: all.filter(counts), areas: pa.filter(a => a.user_id === p.id).map(a => a.areas && a.areas.path).filter(Boolean) }; });
const dc = routes.find(r => r.name === "Disappointment Cleaver"), nr = routes.find(r => r.name === "North Ridge");
A.push({ label: "SYN-new-empty", id: "s1", discoverable: true, disciplines: [], availability: [], verified: false, matchObj: [], areas: [] });
A.push({ label: "SYN-boulderer", id: "s2", discoverable: true, disciplines: ["bouldering"], boulderGrade: "V6", availability: ["weekday_pm"], verified: true, matchObj: [], areas: ["usa.washington.wa_centralwest.wa_stevens_pass_region.wa_index.wa_bouldering_at_index"] });
A.push({ label: "SYN-mountaineer", id: "s3", discoverable: true, disciplines: ["mountaineering", "alpine"], availability: ["weekends"], hikingSpeedFtHr: 1400, verified: false, matchObj: [dc && dc.id, nr && nr.id].filter(Boolean), areas: [] });
// VIEWER as ClimbMatch.jsx builds ME signed in: id 0, pace through MY_PACE (NOT a field), mountain objectives, listed paths.
const asMe = a => ({ id: 0, disciplines: a.disciplines, sportGrade: a.sportGrade, tradGrade: a.tradGrade, boulderGrade: a.boulderGrade, availability: a.availability, verified: a.verified, partnerAreaPaths: a.areas, objectiveIds: a.matchObj });
const asRow = t => ({ id: t.id, disciplines: t.disciplines, sportGrade: t.sportGrade, tradGrade: t.tradGrade, boulderGrade: t.boulderGrade, availability: t.availability, hikingSpeedFtHr: t.hikingSpeedFtHr, objectiveIds: t.discoverable ? t.matchObj : [], partnerAreaPaths: t.areas, verified: t.verified });
const asProf = (t, door) => ({ ...asRow(t), partnerAreaPaths: t.discoverable ? t.areas : [], _real: true, _door: door }); // the sheet reads both RPCs itself
const shown = (me, c) => M.compatUnknown(me, c) < 3 ? M.compat(me, c) : null;
const issues = {}; const note = (k, s) => (issues[k] = issues[k] || []).push(s); const R = {};
for (const v of A) for (const t of A) { if (v === t) continue;
  M.__set_MY_PACE(v.hikingSpeedFtHr || null);
  const me = asMe(v), r = asRow(t), pFriends = asProf(t, "friends"); const parts = M.compatParts(me, r), why = M.compatWhy(me, r);
  const sr = shown(me, r), sf = shown(me, pFriends); R[v.label + ">" + t.label] = sr;
  if (t.discoverable && sr !== sf) note("row vs profile-from-Friends disagree", `${v.label} -> ${t.label}: ${sr} vs ${sf}`);
  if (sr != null && (sr < 20 || sr > 99)) note("score out of 20..99", `${v.label} -> ${t.label}: ${sr}`);
  const g = parts.find(x => x.k === "grade"); if (g.known && g.kind === null && ((v.sportGrade && t.sportGrade) || (v.tradGrade && t.tradGrade))) note("cross-kind grade compared although a like kind exists", `${v.label} -> ${t.label}`);
  const p = parts.find(x => x.k === "pace"); const unk = M.compatUnknown(me, r); const unkParts = ["disc", "pace", "avail"].filter(k => !parts.find(x => x.k === k).known).length + ((!parts.find(x => x.k === "obj").known && !parts.find(x => x.k === "area").known) ? 1 : 0);
  if (unk !== unkParts) note("'limited info' count disagrees with the lines", `${v.label} -> ${t.label}: compatUnknown ${unk}, lines say ${unkParts} (pace known=${p.known})`);
  const av = parts.find(x => x.k === "avail"); if (av.known && !av.flex && av.shared.length && av.shared.length === Math.min(v.availability.length, t.availability.length) && av.pts !== av.max) note("same/contained schedule scored partial", `${v.label} -> ${t.label}`);
  const ar = parts.find(x => x.k === "area"); if (v.areas.length && t.areas.length && t.discoverable && !ar.hit && v.areas.some(a => t.areas.some(b => a === b || a.startsWith(b + ".") || b.startsWith(a + ".")))) note("nested listed areas not counted", `${v.label} -> ${t.label}`);
  const sum = 20 + parts.reduce((s, x) => s + x.pts, 0); if (why.length !== parts.length) note("How-you-match lines != terms", `${v.label} -> ${t.label}`);
  void sum;
}
M.__set_MY_PACE(null);
const labs = A.map(a => a.label);
console.log("ROW % = PROFILE % (viewer down, target across; '-' = no % shown)\n" + "".padEnd(20) + labs.map(l => l.slice(0, 7).padStart(8)).join(""));
for (const v of labs) console.log(v.padEnd(20) + labs.map(t => t === v ? "       ." : String(R[v + ">" + t] ?? "-").padStart(8)).join(""));
const vals = Object.values(R).filter(x => x != null);
console.log(`\nshown ${vals.length}/90 · range ${Math.min(...vals)}-${Math.max(...vals)} · distinct ${new Set(vals).size} · listed areas: ${A.filter(a => a.areas.length).map(a => a.label).join(", ")}`);
const k = Object.keys(issues); console.log(k.length ? "\nISSUES" : "\nISSUES: none");
for (const x of k) { console.log(`## ${x} (${issues[x].length})`); issues[x].slice(0, 10).forEach(s => console.log("  " + s)); }
