#!/usr/bin/env node
// wa_soviet_route lists its Northeast Ridge traverse BEFORE the summit that traverse starts from.
//
// The route's own leg text settles it, in one sentence: the final overhanging headwall pitch tops
// out "on the Southwest Peak at 9,320 ft. Only from that summit does the Northeast Ridge traverse
// toward the West Peak begin". So the summit is reached FIRST. The array has 9,410 ft of traverse
// at index 6 and the 9,320 ft summit at index 7, i.e. backwards.
//
// This is the case probe-elev-above-summit.mjs identified as genuinely broken while measuring --
// and it is also why that probe was NOT promoted into a gate: 11 of 640 WA routes trip the same
// "a point before the summit is higher than it" test and most are correct (Chikamin-Dome Col
// really does precede a lower Gunsight Peak; you really do cross Ruth Mountain to reach Icy Peak).
// The two broken routes sit at +90 and +53 ft, BELOW six correct cases at +96 to +302, so no
// threshold separates them. A machine cannot call this one; the route's own prose can.
//
// `directions` are POSITIONAL -- directions[i] is the leg INTO waypoint i -- so a swap that moved
// the text with the pins would leave both legs describing the wrong arrival. The existing leg 6
// is really TWO legs concatenated, and it splits at the sentence quoted above. Both replacements
// are therefore RE-HOMED from this route's own words; nothing is composed from memory.
//
// Backs up, asserts area_id before writing, writes through patchRow (which throws unless exactly
// one row comes back), then RE-READS and reconciles. A 200 is not evidence the data changed.
import fs from "fs";
import { SUPABASE_URL, anonKey, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";

const WRITE = process.argv.includes("--write");
const ID = "wa_soviet_route";
const EXPECT_AREA = "wa_bonanza_peak";

const key = anonKey();
const read = async () => {
  const url = `${SUPABASE_URL}/rest/v1/routes?select=id,name,area_id,waypoints&id=eq.${ID}`;
  const r = await fetch(url, { headers: { apikey: key, Authorization: "Bearer " + key } });
  if (!r.ok) throw new Error(`read -> ${r.status}`);
  const rows = await r.json();
  if (!rows.length) throw new Error(`${ID} not found — refusing to proceed`);
  return rows[0];
};

const row = await read();
if (row.area_id !== EXPECT_AREA) {
  console.error(`REFUSING — ${ID} is filed under "${row.area_id}", expected "${EXPECT_AREA}".`);
  console.error(`Only ~9% of WA route ids are peak-scoped, so a name-shaped id proves nothing.`);
  process.exit(1);
}
const wps = row.waypoints;
if (!Array.isArray(wps) || wps.length !== 8) { console.error(`REFUSING — expected 8 waypoints, found ${wps && wps.length}`); process.exit(1); }

const TRAVERSE = 6, SUMMIT = 7;
const tr = wps[TRAVERSE], su = wps[SUMMIT];
// Assert the shape this script was written against, rather than trusting the indices.
if (!/northeast ridge traverse/i.test(tr.name || "")) { console.error(`REFUSING — waypoint 7 is "${tr.name}", not the NE Ridge traverse`); process.exit(1); }
if (String(su.type).toLowerCase() !== "summit") { console.error(`REFUSING — waypoint 8 is type "${su.type}", not Summit`); process.exit(1); }
if (!(Number(tr.elev) > Number(su.elev))) { console.error(`REFUSING — the defect is gone: traverse ${tr.elev} is no longer above summit ${su.elev}`); process.exit(1); }

// The split point, quoted from the route's own leg text.
const SPLIT = "Only from that summit does the Northeast Ridge traverse";
const full = String(tr.directions || "");
const at = full.indexOf(SPLIT);
if (at < 0) { console.error(`REFUSING — the leg text no longer contains its own split sentence; re-read it before editing`); process.exit(1); }

const toSummit = full.slice(0, at).trim();
const toTraverse = full.slice(at).trim()
  .replace(/^Only from that summit does the Northeast Ridge traverse toward the West Peak begin, about/,
           "From the Southwest Peak summit, the Northeast Ridge traverse toward the West Peak begins: about");

const next = wps.slice();
next[TRAVERSE] = { ...su, directions: toSummit };
next[SUMMIT] = { ...tr, directions: toTraverse };

console.log(`${ID} — ${row.name}\n`);
console.log(`  BEFORE  [7] ${tr.name} (${tr.elev} ft)   [8] ${su.name} (${su.elev} ft)`);
console.log(`  AFTER   [7] ${next[TRAVERSE].name} (${next[TRAVERSE].elev} ft)   [8] ${next[SUMMIT].name} (${next[SUMMIT].elev} ft)\n`);
console.log(`  leg INTO the summit  (${toSummit.length} chars): ...${toSummit.slice(-150)}\n`);
console.log(`  leg INTO the traverse (${toTraverse.length} chars): ${toTraverse.slice(0, 180)}...\n`);

// Elevation now ascends into the summit and the traverse sits above it, which is the real shape.
if (!(Number(next[SUMMIT].elev) > Number(next[TRAVERSE].elev))) console.log(`  note: elevations still not ascending — expected, the traverse crest is above the summit`);

if (!WRITE) { console.log("DRY RUN — pass --write to apply."); process.exit(0); }

requireServiceKey();
const backup = `scripts/oneoff/soviet-route-waypoints-backup-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
fs.writeFileSync(backup, JSON.stringify({ id: ID, area_id: row.area_id, waypoints: wps }, null, 2));
console.log(`backup: ${backup}`);

await patchRow("routes", ID, { waypoints: next });

const after = await read();
const a = after.waypoints;
const okOrder = String(a[6].type).toLowerCase() === "summit" && /northeast ridge traverse/i.test(a[7].name || "");
const okLegs = String(a[6].directions || "").includes("Southwest Peak at 9,320") &&
               String(a[7].directions || "").startsWith("From the Southwest Peak summit");
if (okOrder && okLegs) console.log("ok — re-read confirms the summit precedes the traverse and both legs re-homed");
else { console.error(`RECONCILE FAILED — order ok? ${okOrder}; legs ok? ${okLegs}`); process.exit(1); }
