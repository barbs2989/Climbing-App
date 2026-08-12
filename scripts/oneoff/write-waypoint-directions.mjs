#!/usr/bin/env node
// Write per-waypoint `directions` — "how do I get to THIS point from the last one".
//
// The field shipped in #786 with a reader, an editor and persistence, and 4,243 Washington
// waypoints empty. Waypoint `note` already says what a place IS; nothing said how to get
// between two of them, which is the question a climber actually has standing at a junction.
//
// SOURCING RULE, and it is the whole point: every string here is written from that route's
// OWN on-file prose — `approach`, `approach_logistics`, `itinerary`, the ROUTE BETA stages in
// `pitch_detail`, and the waypoint notes themselves — restated as a leg. That is synthesis of
// enrichment we already hold, not new claims about the mountain. Where the on-file text does
// not cover a leg, the entry is left EMPTY rather than filled with something plausible: an
// invented direction at a junction is worse than no direction at all.
//
// Usage:  node scripts/oneoff/write-waypoint-directions.mjs <batch.json> [--apply]
// Without --apply it prints the diff and writes nothing.
//
// batch.json = { "<route_id>": ["leg 1 text", "", "leg 3 text", ...], ... }
// The array is positional against `waypoints`; "" means "leave this one alone".

import fs from "fs";
import { SUPABASE_URL, anonKey, requireServiceKey, headers } from "../lib/supabase-env.mjs";

const file = process.argv[2];
const APPLY = process.argv.includes("--apply");
if (!file) { console.error("usage: write-waypoint-directions.mjs <batch.json> [--apply]"); process.exit(1); }
const batch = JSON.parse(fs.readFileSync(file, "utf8"));
const ids = Object.keys(batch);
console.log(`${ids.length} route(s) in ${file}${APPLY ? "" : "   [DRY RUN — pass --apply to write]"}\n`);

const A = anonKey();
const get = async (id) => {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,waypoints&id=eq.${id}`, { headers: headers(A) });
  const t = await r.text();
  if (!r.ok) throw new Error(`GET ${id} -> ${r.status} ${t.slice(0, 160)}`);
  const rows = JSON.parse(t);
  if (rows.length !== 1) throw new Error(`GET ${id} matched ${rows.length} rows — wrong id`);
  return rows[0];
};

let planned = 0, skipped = 0;
const plan = [];
for (const id of ids) {
  const row = await get(id);
  const wps = Array.isArray(row.waypoints) ? row.waypoints : [];
  const dirs = batch[id];
  if (!Array.isArray(dirs)) throw new Error(`${id}: batch value is not an array`);
  if (dirs.length !== wps.length) {
    throw new Error(`${id}: batch has ${dirs.length} entries but the route has ${wps.length} waypoints — positional write refused`);
  }
  // `directions` means "how do I get HERE from the previous waypoint", so it is only
  // meaningful if the array is in travel order. It often is not: `audit:waypoint-order`
  // reports 51 of 1,019 WA routes rendering out of order, typically with the summit listed
  // second. Writing positional legs into one of those produces confident, wrong guidance —
  // worse than the empty field it replaces. Refuse instead.
  const marks = wps.map((w) => (w && w.distMi != null ? Number(w.distMi) : null));
  const known = marks.filter((m) => m != null);
  if (known.length >= 3) {
    const bad = [];
    let prev = null, prevI = -1;
    marks.forEach((m, i) => { if (m == null) return; if (prev != null && m < prev - 0.001) bad.push(`${prevI + 1}->${i + 1} (${prev} -> ${m} mi)`); prev = m; prevI = i; });
    if (bad.length) {
      throw new Error(`${id}: waypoints are not in travel order (${bad.join(", ")}). ` +
        `Positional directions would describe legs that do not exist. Fix the order first — see npm run audit:waypoint-order.`);
    }
  }
  const next = wps.map((w, i) => {
    const d = String(dirs[i] || "").trim();
    if (!d) { skipped++; return w; }
    // never silently overwrite a direction somebody already contributed
    if (w.directions && String(w.directions).trim()) { skipped++; return w; }
    planned++;
    return Object.assign({}, w, { directions: d });
  });
  plan.push({ id, name: row.name, before: wps, after: next });
  console.log(`  ${id}  (${wps.length} waypoints)`);
  next.forEach((w, i) => {
    if (w.directions && !(wps[i].directions)) console.log(`     ${i + 1}. ${w.name}\n        -> ${w.directions}`);
  });
  console.log("");
}
console.log(`planned: ${planned} waypoint(s) get directions; ${skipped} left untouched\n`);
if (!APPLY) { console.log("dry run — nothing written."); process.exit(0); }

// ── write, then RECONCILE. A 200 is not evidence the data changed. ──────────────────────
const S = requireServiceKey();
let wrote = 0;
for (const p of plan) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${encodeURIComponent(p.id)}`, {
    method: "PATCH",
    headers: headers(S, { "Content-Type": "application/json", Prefer: "return=representation" }),
    body: JSON.stringify({ waypoints: p.after }),
  });
  const t = await res.text();
  if (!res.ok) throw new Error(`PATCH ${p.id} -> ${res.status} ${t.slice(0, 200)}`);
  const rows = JSON.parse(t);
  if (rows.length !== 1) throw new Error(`PATCH ${p.id} changed ${rows.length} rows, expected 1`);
  wrote++;
}
console.log(`PATCHed ${wrote} route(s). Re-reading to reconcile…\n`);

let ok = 0, bad = 0;
for (const p of plan) {
  const row = await get(p.id);
  const got = (row.waypoints || []).map((w) => String(w.directions || "").trim());
  const want = p.after.map((w) => String(w.directions || "").trim());
  if (got.length !== want.length) { console.log(`  MISMATCH ${p.id}: ${got.length} vs ${want.length} waypoints`); bad++; continue; }
  const diff = want.map((w, i) => (w === got[i] ? null : i)).filter((x) => x !== null);
  if (diff.length) { console.log(`  MISMATCH ${p.id}: waypoint(s) ${diff.map((i) => i + 1).join(",")} did not land`); bad++; }
  else ok++;
}
console.log(`reconciled: ${ok} route(s) match what was sent, ${bad} did not.`);
process.exit(bad ? 1 : 0);
