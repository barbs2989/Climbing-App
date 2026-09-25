#!/usr/bin/env node
// One-off: remove REVIEWED foreign camps from routes' `bivy` lists.
//
//   node scripts/oneoff/remove-foreign-camps.mjs <removals.json> [--apply]
//
// Dry by default. <removals.json> is keyed by route id:
//   { "<id>": { "area_id": "...", "expect": ["<every camp name on the row now>"], "remove": ["<exact name>"] } }
// `allowEmpty: true` lets a row lose EVERY camp. Set only when the reviewer AND the adversarial verifier
// each found every listed camp foreign: another mountain's camps are worse than none, but emptying a
// row must be a recorded decision, never a side effect.
// Declared state, the contract fix-mountain-loop-camp-split.mjs set: `expect` is the WHOLE list
// the review was done against. A row whose list has changed since is REFUSED, never re-matched —
// the judgement was about that list, and a partial repair of a propagated list is worse than none.
//
// CAMPSITE WAYPOINTS OF THE SAME NAME GO TOO. campSites() merges `bivy` with Campsite waypoints and
// de-duplicates by name, so a camp removed from `bivy` alone would reappear from the pin. A pin
// the drawn line passes through is NOT removed and the row is refused: dropping it would strand a
// track vertex (audit:stranded-track-vertices), and moving the line is a different judgement.
import fs from "node:fs";
import path from "node:path";
import { SUPABASE_URL, requireServiceKey, headers, patchRow } from "../lib/supabase-env.mjs";

const [file, flag] = process.argv.slice(2);
if (!file) { console.error("usage: remove-foreign-camps.mjs <removals.json> [--apply]"); process.exit(2); }
const APPLY = flag === "--apply";
const spec = JSON.parse(fs.readFileSync(file, "utf8"));
const key = requireServiceKey();
const canon = (v) => Array.isArray(v) ? v.map(canon) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])])) : v;
const same = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
const nk = (s) => String(s == null ? "" : s).trim().toLowerCase();
const isCampPin = (w) => w && /^(campsite|bivy|camp)$/i.test(String(w.type || ""));

const read = async (id) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,area_id,bivy,waypoints,gpx&id=eq.${encodeURIComponent(id)}`, { headers: headers(key) });
  if (!res.ok) throw new Error(`read ${id} -> ${res.status}`);
  return (await res.json())[0] || null;
};

const plan = []; let refused = 0; let camps = 0; let pins = 0;
for (const [id, s] of Object.entries(spec)) {
  const row = await read(id);
  const bivy = row && Array.isArray(row.bivy) ? row.bivy : [];
  const names = bivy.filter(Boolean).map((b) => b.name);
  const rm = new Set((s.remove || []).map(nk));
  const why = !row ? "no such route"
    : row.area_id !== s.area_id ? `area_id is ${row.area_id}, review was against ${s.area_id}`
    : JSON.stringify(names) !== JSON.stringify(s.expect) ? "camp list changed since the review"
    : !rm.size ? "nothing to remove"
    : [...rm].some((n) => !names.some((x) => nk(x) === n)) ? "a camp to remove is not on the row"
    : rm.size >= names.length && s.allowEmpty !== true ? "would remove EVERY camp — needs allowEmpty, set only when BOTH reviews found every camp foreign"
    : null;
  if (why) { console.log(`REFUSE ${id} — ${why}`); refused++; continue; }
  const wps = Array.isArray(row.waypoints) ? row.waypoints : [];
  const drop = wps.filter((w) => isCampPin(w) && rm.has(nk(w.name)));
  const track = Array.isArray(row.gpx) ? row.gpx : [];
  const onLine = drop.filter((w) => track.some((p) => Array.isArray(p) && p[0] === w.lat && p[1] === w.lng));
  if (onLine.length) { console.log(`REFUSE ${id} — pin(s) on the drawn line: ${onLine.map((w) => w.name).join("; ")}`); refused++; continue; }
  const body = { bivy: bivy.filter((b) => !(b && rm.has(nk(b.name)))) };
  if (drop.length) body.waypoints = wps.filter((w) => !drop.includes(w));
  camps += rm.size; pins += drop.length;
  plan.push({ id, area_id: row.area_id, before: { bivy: row.bivy, ...(drop.length ? { waypoints: row.waypoints } : {}) }, body });
  console.log(`${APPLY ? "write " : "would "} ${id} — remove ${rm.size} camp(s)${drop.length ? ` + ${drop.length} pin(s)` : ""}, ${body.bivy.length} left`);
}
console.log(`\n${plan.length} route(s), ${camps} camp(s), ${pins} pin(s); ${refused} refused.`);
if (!APPLY) { console.log("dry run — pass --apply to write."); process.exit(refused ? 1 : 0); }
if (!plan.length) process.exit(refused ? 1 : 0);

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..", "..");
const rb = path.join(ROOT, "audits", "camp-fit", `rollback-remove-foreign-camps-${Date.now()}.json`);
fs.mkdirSync(path.dirname(rb), { recursive: true });
fs.writeFileSync(rb, JSON.stringify(plan.map((p) => ({ id: p.id, area_id: p.area_id, ...p.before })), null, 1));
console.log(`rollback written: ${rb}`);
for (const p of plan) await patchRow("routes", p.id, p.body, { filter: `area_id=eq.${encodeURIComponent(p.area_id)}` });
let bad = 0;
for (const p of plan) {
  const row = await read(p.id);
  if (!Object.keys(p.body).every((k) => same(row[k], p.body[k]))) { console.log(`MISMATCH ${p.id}`); bad++; }
}
console.log(`reconciled: ${plan.length - bad}/${plan.length} match what was written.`);
process.exit(bad || refused ? 1 : 0);
