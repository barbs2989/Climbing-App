// audit:optimal-season, first run (owner note "Audit optimal season", 2026-11-18; "go").
//
// 1. Two HEADERS (`routes.season`) that contradicted the route's own Optimal window AND its month
//    calendar, where outside sources agree with the window and calendar:
//      Park Glacier Headwall (Baker)  Jun-Aug -> May-Jun   spring snow face; the calendar has July risky
//      Buckner North Face             Jul-Sep -> Jun-Jul   good snow June to mid-July, near melted out by late July
//    The other contradictions the audit found were researched too and are HELD: the evidence was thin
//    or split (Tye Peak, Goode NE Face, Forbidden NE Face, the Adams east-side headwalls behind the
//    Yakama Jul-Oct permit, Snowking's two seasons, Mount Lawson).
// 2. Four OPTIMAL WINDOWS written as research notes ("per prior research", "only two dated data
//    points exist", first-ascent dates). Rewritten from the facts each row already states: no new
//    claim, nothing widened or narrowed.
//
// Dry by default; --apply writes. Every write is refused when the research ledger has LOCKED that
// field, or when the value read now is not the value this script was written against. Rollback:
// audits/optimal-season/2026-11-18.rollback.json.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { selectAll, patchRow, requireServiceKey, SUPABASE_URL } from "../lib/supabase-env.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const APPLY = process.argv.includes("--apply");

const SEASON = [
  { id: "wa_mount_baker_park_glacier_headwall", from: "Jun-Aug", to: "May-Jun" },
  { id: "wa_buckner_mountain_north_face", from: "Jul-Sep", to: "Jun-Jul" },
];
const WINDOW = [
  { id: "wa_eagle_rock_scramble", from: "Mid-July through October, per prior research on this route",
    to: "Mid-July through October" },
  { id: "wa_kyes_peak_glaciated_scramble", from: "Mid-July through September (per prior research), with late July-August the most reliable window",
    to: "Mid-July through September, with late July and August the most reliable" },
  { id: "wa_east_ridge_3", fromStart: "Roughly late June through September, bounded by Highway 20",
    to: "Late June through September, while Highway 20 over Washington Pass is open; it usually closes from about November to April" },
  { id: "wa_northeast_face_direct", fromStart: "Narrow -- both known ascents occurred in mid-to-late July",
    to: "Mid to late July, the usual window for glaciated climbs reached from Cascade Pass" },
];

const key = requireServiceKey();
const ids = [...SEASON, ...WINDOW].map((f) => f.id);
const rows = Object.fromEntries((await selectAll("routes", "id,season,seasonal_guidance", `id=in.(${ids.join(",")})`, { pageSize: 1000 })).map((r) => [r.id, r]));
const res = await fetch(`${SUPABASE_URL}/rest/v1/route_field_evidence?select=route_id,field,level&route_id=in.(${ids.join(",")})`, { headers: { apikey: key, Authorization: "Bearer " + key } });
if (!res.ok) { console.error("ledger read failed: " + res.status + " " + (await res.text()).slice(0, 200)); process.exit(1); }
const locked = new Set((await res.json()).filter((e) => /^locked/.test(e.level || "")).map((e) => e.route_id + ":" + e.field));

const rollback = [], plan = [];
let refused = 0;
for (const f of SEASON) {
  const r = rows[f.id];
  if (!r) { console.log(`REFUSE ${f.id}: no such route`); refused++; continue; }
  if (locked.has(f.id + ":season")) { console.log(`REFUSE ${f.id}: season is LOCKED in the ledger`); refused++; continue; }
  if (r.season !== f.from) { console.log(`REFUSE ${f.id}: season is "${r.season}", expected "${f.from}"`); refused++; continue; }
  plan.push({ id: f.id, body: { season: f.to }, filter: `season=eq.${encodeURIComponent(f.from)}`, check: (x) => x.season === f.to, say: `season "${f.from}" -> "${f.to}"` });
  rollback.push({ id: f.id, season: f.from });
}
for (const f of WINDOW) {
  const r = rows[f.id], sg = r && r.seasonal_guidance, cur = sg && sg.optimalWindow;
  if (!r || typeof cur !== "string") { console.log(`REFUSE ${f.id}: no optimalWindow`); refused++; continue; }
  if (f.from ? cur !== f.from : !cur.startsWith(f.fromStart)) { console.log(`REFUSE ${f.id}: window changed since the audit: "${cur.slice(0, 80)}"`); refused++; continue; }
  const next = { ...sg, optimalWindow: f.to };
  plan.push({ id: f.id, body: { seasonal_guidance: next }, check: (x) => x.seasonal_guidance && x.seasonal_guidance.optimalWindow === f.to, say: `window -> "${f.to}"` });
  rollback.push({ id: f.id, seasonal_guidance: sg });
}
for (const p of plan) console.log(`${APPLY ? "WRITE" : "would"} ${p.id}: ${p.say}`);
if (refused) { console.error(`\n${refused} refused — nothing written.`); process.exit(1); }
if (!APPLY) { console.log("\ndry run — pass --apply to write."); process.exit(0); }

const dir = path.join(ROOT, "audits", "optimal-season");
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "2026-11-18.rollback.json"), JSON.stringify(rollback, null, 1) + "\n");
for (const p of plan) await patchRow("routes", p.id, p.body, p.filter ? { filter: p.filter } : undefined);
// A 200 is not evidence: re-read and reconcile.
const after = Object.fromEntries((await selectAll("routes", "id,season,seasonal_guidance", `id=in.(${ids.join(",")})`, { pageSize: 1000 })).map((r) => [r.id, r]));
let bad = 0;
for (const p of plan) { if (!p.check(after[p.id])) { bad++; console.error(`NOT LANDED ${p.id}`); } else console.log(`landed ${p.id}`); }
process.exit(bad ? 1 : 0);
