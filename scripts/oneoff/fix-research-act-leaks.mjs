// "CLOSED as of this research date" — the copy tells a climber when an AUTHOR looked instead of
// what is true. audit:expiring-closures separates this tier from the other two for that reason:
// leaking the research act is a defect in the COPY, wrong whether or not the closure also names an
// end date, and it is the same family as the standing rule that no screen names where our data
// came from. 10 values on 9 routes, all rendered (road.status / access.closures).
//
// THE HAZARD IS DELETING THE PHRASE AND NOTHING ELSE. CLAUDE.md: "the phrase carrying the expiry is
// usually the only freshness signal the value has, so date it or drop the claim — deleting the
// phrase alone leaves a bare assertion that ages worse." So every edit below is checked against
// that: 8 keep a real date already in the value, and the 2 that would be left as an UNDATED
// AFFIRMATIVE ("no closures reported", "no standing closure confirmed") drop the claim instead.
//
// Declared as exact find -> replace pairs, refused unless `find` matches EXACTLY ONCE in the live
// value, so nothing can be invented and a stale table cannot half-apply. Same shape as
// redact-road-access-citations.mjs.
//
// Adds no four-digit year: a dated closure written today is a lie tomorrow, and this file exists to
// reduce that class, not to add to it.
import { requireServiceKey, selectAll, patchRow } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");

const EDITS = [
  // --- 8 phrase removals: each leaves a date that was already in the value -------------------
  { id: "wa_blizzard_peak_standard", col: "road", key: "status",
    find: " as of this writing", repl: "",
    keeps: "Dec 2025 damage + June 2026 reopening reports" },

  { id: "wa_castle_peak_pasayten_scramble", col: "access", key: "closures",
    find: "As of this writing, NPS reports the", repl: "NPS reports the",
    keeps: "attributed to NPS and explicitly open-ended (‘until further notice’)" },

  // The leading "As of mid-2026," is the AS-OF-PERIOD tier, not this one — deliberately left alone.
  // Scope is the research act; the row stays reported under the other tier, correctly.
  { id: "wa_chiwawa_mountain_southwest", col: "access", key: "closures",
    find: " as of this writing", repl: "",
    keeps: "effective May 20 2026 through December 31 2027" },

  { id: "wa_earl_peak_standup_creek_route", col: "road", key: "status",
    find: "CLOSED as of this research date — ", repl: "CLOSED — ",
    keeps: "closure order effective May 20-Dec 31, 2026" },

  { id: "wa_earl_peak_standup_creek_route", col: "access", key: "closures",
    find: "As of this research date: Standup", repl: "Standup",
    keeps: "closure order effective May 20-Dec 31, 2026" },

  { id: "wa_helmet_butte_standard_route", col: "road", key: "status",
    find: " as of this research", repl: "",
    keeps: "‘as of May 20, 2026’ — a real date, earlier in the same sentence" },

  { id: "wa_mount_carru_scramble", col: "access", key: "closures",
    find: " that was unconfirmed as of this writing", repl: " that was unconfirmed",
    keeps: "closed in spring 2026, reopening target early summer" },

  { id: "wa_old_snowy_mountain_r1", col: "access", key: "closures",
    find: " as of the most recent reports", repl: "",
    keeps: "the December 2025 floods, named in the same sentence" },

  // --- 2 that would be left as an UNDATED AFFIRMATIVE, so the CLAIM goes ---------------------

  // "Cascade River Road has no reported vehicle closures as of this update." Strip the phrase and
  // it becomes a bare, undated "no closures" — the dangerous direction, since a climber plans on
  // it. It is also a claim about a DIFFERENT drainage from the Suiattle closure this value is
  // about; whether that road belongs here at all is audit:trailhead-road section 2's question, and
  // deliberately not answered by deleting it. The Suiattle closure keeps its full date range.
  { id: "wa_lizard_mountain_south_route", col: "road", key: "status",
    find: " Cascade River Road has no reported vehicle closures as of this update.", repl: "",
    keeps: "the Suiattle closure order, April 2 2026 - January 1 2028",
    note: "drops an undated affirmative about a different road" },

  // "No standing closure confirmed as of this research, but Terror Basin was closed…" — the opener
  // is the claim carrying the leak, and undated it ages badly. Dropping it leaves the durable
  // half: what happened in 2023, and where to check now. Expressed as a rewrite only because the
  // clause is welded on with ", but".
  { id: "wa_mount_degenhardt_southwest_route", col: "access", key: "closures",
    find: "No standing closure confirmed as of this research, but Terror Basin was closed",
    repl: "Terror Basin was closed",
    keeps: "the August 2023 bear closure and the NPS alerts page to check",
    note: "drops an undated ‘no closure confirmed’ affirmative" },
];

const RESEARCH_ACT = /as of (this|the most recent|the latest|my|our)\s*(writing|research|update|check|report|reports|available|information|pass)|at the time of (writing|research)|as of this research/i;

if (APPLY) requireServiceKey();

const ids = [...new Set(EDITS.map(e => e.id))];
const rows = await selectAll("routes", "id,road,access", `id=in.(${ids.join(",")})`);
if (rows.length !== ids.length) { console.error(`read ${rows.length} of ${ids.length} routes — refusing`); process.exit(1); }
const byId = Object.fromEntries(rows.map(r => [r.id, r]));

// Group by (id, col) so two edits to the same jsonb object become ONE patch rather than two that
// clobber each other — wa_earl_peak has an edit in road AND access, and Chiwawa/Castle share none,
// but a future pair in one object would silently lose the first write.
const patches = new Map();
let refused = 0;
for (const e of EDITS) {
  const row = byId[e.id];
  const obj = row[e.col];
  if (!obj || typeof obj !== "object") { console.log(`REFUSE ${e.id} ${e.col} — not an object`); refused++; continue; }
  const key = `${e.id}|${e.col}`;
  const working = patches.get(key) || { id: e.id, col: e.col, obj: { ...obj } };
  const cur = working.obj[e.key];
  if (typeof cur !== "string") { console.log(`REFUSE ${e.id} ${e.col}.${e.key} — not a string`); refused++; continue; }
  const hits = cur.split(e.find).length - 1;
  if (hits !== 1) { console.log(`REFUSE ${e.id} ${e.col}.${e.key} — find matched ${hits}x, expected exactly 1`); refused++; continue; }
  const next = cur.replace(e.find, e.repl).replace(/\s{2,}/g, " ").trim();
  if (RESEARCH_ACT.test(next)) { console.log(`REFUSE ${e.id} ${e.col}.${e.key} — still leaks the research act after the edit`); refused++; continue; }
  if (/\b(19|20)\d{2}\b/.test(next) && !/\b(19|20)\d{2}\b/.test(cur)) { console.log(`REFUSE ${e.id} — the edit ADDS a year`); refused++; continue; }
  working.obj[e.key] = next;
  patches.set(key, working);
  console.log(`\n${e.id}  ${e.col}.${e.key}${e.note ? "   [" + e.note + "]" : ""}`);
  console.log(`   keeps: ${e.keeps}`);
  console.log(`   -     ${cur.slice(0, 190)}`);
  console.log(`   +     ${next.slice(0, 190)}`);
}

console.log(`\n${EDITS.length} edit(s) declared · ${refused} refused · ${patches.size} row-object(s) to patch`);
if (refused) { console.error("refusing to apply while any edit is refused"); process.exit(1); }
if (!APPLY) { console.log("\ndry run — pass --apply to write"); process.exit(0); }

for (const p of patches.values()) await patchRow("routes", p.id, { [p.col]: p.obj });

// Re-read and reconcile: a 200 is not evidence the data changed.
const after = await selectAll("routes", "id,road,access", `id=in.(${ids.join(",")})`);
let bad = 0;
for (const r of after) {
  for (const [obj, name] of [[r.road, "road"], [r.access, "access"]]) {
    if (!obj || typeof obj !== "object") continue;
    for (const [k, v] of Object.entries(obj)) {
      if (typeof v === "string" && RESEARCH_ACT.test(v)) { console.log(`STILL LEAKING  ${r.id} ${name}.${k}: ${v.slice(0, 120)}`); bad++; }
    }
  }
}
console.log(bad ? `\n${bad} value(s) still leak — NOT clean` : `\nverified: none of the ${ids.length} routes leaks the research act any more.`);
process.exit(bad ? 1 : 0);
