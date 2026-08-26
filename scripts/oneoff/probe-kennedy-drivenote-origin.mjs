#!/usr/bin/env node
// Which half of wa_glacier_peak_kennedy_glacier's road block is the stray?
//
// I assumed earlier that road.name was wrong, reasoning from "four of five siblings say FR 49".
// That was inference from the NEIGHBOURS rather than from the row, and the row disagrees: five of
// its six records say White Chuck. Counting what each record votes for, and checking whether the
// odd one out is a verbatim copy of a sibling's.
import { selectAll } from "../lib/supabase-env.mjs";

const rows = await selectAll("routes", "id,road,approach,approach_logistics,waypoints,access",
  "area_id=eq.wa_glacier_peak", { pageSize: 100 });
if (!rows.length) { console.error("FAIL — read 0 routes."); process.exit(1); }
const me = rows.find((r) => r.id === "wa_glacier_peak_kennedy_glacier");
if (!me) { console.error("FAIL — the route is gone."); process.exit(1); }

const WHITE = /white ?chuck|fs-?23\b|fr ?23\b|road 23\b|#?643\b/i;
const SAUK = /sloan creek|fr ?49\b|north fork sauk|#?649\b/i;
const vote = (t) => { const s = typeof t === "string" ? t : JSON.stringify(t || ""); const w = WHITE.test(s), k = SAUK.test(s);
  return w && k ? "BOTH" : w ? "White Chuck" : k ? "FR 49" : "—"; };

const rd = me.road || {};
const al = me.approach_logistics || {};
const wp = (me.waypoints || []).find((w) => /trailhead/i.test(String(w.type || "") + String(w.name || "")));
console.log("what each record on the row votes for:\n");
const records = [
  ["road.name", rd.name], ["road.status", rd.status], ["road.seasonalGate", rd.seasonalGate],
  ["road.driveNote", rd.driveNote], ["approach", me.approach],
  ["approach_logistics.trailhead", al.trailhead], ["waypoint Trailhead", wp && wp.name],
  ["access.closures", (me.access || {}).closures],
];
for (const [k, v] of records) console.log(`   ${String(vote(v)).padEnd(12)} ${k.padEnd(30)} ${String(v ?? "").replace(/\s+/g, " ").slice(0, 90)}`);

// Is the odd one out a verbatim copy of a sibling's?
console.log("\nis road.driveNote a copy of a sibling's?");
const norm = (s) => String(s || "").replace(/\s+/g, " ").trim().toLowerCase();
const mine = norm(rd.driveNote);
for (const r of rows) {
  if (r.id === me.id) continue;
  const o = norm((r.road || {}).driveNote);
  if (!o) continue;
  // Longest common prefix, as a crude but honest similarity.
  let i = 0; while (i < Math.min(o.length, mine.length) && o[i] === mine[i]) i++;
  console.log(`   ${r.id.padEnd(46)} shares the first ${String(i).padStart(3)} chars${i > 60 ? "   ** copied **" : ""}`);
}

// And the mirror case, reported not repaired.
const sit = rows.find((r) => r.id === "wa_glacier_peak_sitkum_glacier");
if (sit) {
  console.log("\nthe MIRROR case — wa_glacier_peak_sitkum_glacier:");
  const s = sit.road || {}, sal = sit.approach_logistics || {};
  for (const [k, v] of [["road.name", s.name], ["road.driveNote", s.driveNote], ["approach", sit.approach], ["logistics.trailhead", sal.trailhead]]) {
    console.log(`   ${String(vote(v)).padEnd(12)} ${k.padEnd(24)} ${String(v ?? "").replace(/\s+/g, " ").slice(0, 90)}`);
  }
}
