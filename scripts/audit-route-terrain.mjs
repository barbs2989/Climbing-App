// Does the safety advice each route is shown actually match the terrain that route crosses?
//
// The panels ("Snow, weather & timing", "Watch out for on this type of climb") and the
// packing checklist were keyed on discipline alone, so every alpine route was told to check
// the avalanche forecast and every mountaineering route was handed a glacier/crevasse kit.
// This measures how many routes that misfires on, using the same lib/terrain.js the app now
// renders through — so a green run here and the screen cannot disagree.
//
// Read-only. Scoped to the disciplines that receive snow/glacier advice; sport, trad and
// bouldering never do, so scanning them would only inflate the denominator.
//
//   node scripts/audit-route-terrain.mjs                  # whole catalog, summary
//   node scripts/audit-route-terrain.mjs --state wa       # ids under a state prefix
//   node scripts/audit-route-terrain.mjs --list 40        # print offending routes
import { SUPABASE_URL, headers, anonKey, requireServiceKey } from "./lib/supabase-env.mjs";
import { routeTerrain, fitAdvice, fitGear, CORPUS_COLUMNS } from "../lib/terrain.js";

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? (argv[i + 1] ?? true) : d; };
const STATE = arg("--state", null);
const LIST = +arg("--list", 0);

const key = (() => { try { return requireServiceKey(); } catch { return anonKey(); } })();

// The columns lib/terrain.js reads. Selecting the whole row moves tens of MB for nothing.
const COLS = ["id", "name", "area_id", "discipline", "grade", "pitches", "season", "best_season",
  "description", "overview", "beta", "hazards", "obj_haz", "watch_out", "gear", "rack",
  "detailed_rack", "what_to_bring", "pro_needs", "assumed_gear", "approach", "descent",
  "descent_text", "bail", "turnaround", "pitch_detail", "seasonal_guidance",
  "seasonal_hazards", "pro_tips", "features", "difficulty", "timing",
  "climbing_route", "approach_variants"].join(",");

const DISCS = ["alpine", "mountaineering", "ice", "mixed"];

async function page(disc, after) {
  const url = `${SUPABASE_URL}/rest/v1/routes?select=${COLS}&discipline=eq.${disc}` +
    (after ? `&id=gt.${encodeURIComponent(after)}` : "") + `&order=id.asc&limit=500`;
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: headers(key) });
    const t = await res.text();
    if (res.ok) return JSON.parse(t);
    if (attempt === 3) throw new Error(`GET routes -> ${res.status} ${t.slice(0, 200)}`);
    await new Promise(r => setTimeout(r, 800 * (attempt + 1)));
  }
}

// The advice the app renders per discipline, copied from RouteDetail's SAFETY_ESSENTIALS and
// WATCH. Only the terrain-bearing lines matter here, so the audit asks the same question the
// screen does rather than re-deriving it.
const ADVICE = {
  alpine: ["Check the avalanche forecast and recent freeze-thaw history.",
    "Start early to beat afternoon warming and thunderstorms.",
    "Rockfall is worst late morning and in the evening as freeze-thaw loosens rock and ice.",
    "Avoid lingering under seracs and icefall; they calve without warning."],
  mountaineering: ["Travel roped on glaciers and know crevasse rescue.",
    "Check avalanche danger and overnight snow stability.",
    "Start in the dark for a firm freeze and turn around on time."],
  ice: ["Test the ice and your screws."],
  mixed: ["Falling ice and rock are constant."],
};
const GEAR = {
  alpine: ["Rope", "Ice axe / tools", "Crampons", "Insulating layers & shell", "Navigation (map / GPS)"],
  mountaineering: ["Ice axe / tools", "Crampons", "Rope", "Glacier / crevasse kit", "Insulating layers & shell", "Navigation (map / GPS)"],
  ice: ["Ice axe / tools", "Crampons", "Ice screws", "Rope"],
  mixed: ["Ice axe / tools", "Crampons", "Ice screws", "Trad rack / protection", "Rope"],
};

const tally = { scanned: 0, byDisc: {}, glacierNo: 0, snowNo: 0, unknown: 0,
  adviceDropped: 0, gearDropped: 0, routesFixed: 0, explicit: 0 };
const offenders = [];

for (const disc of DISCS) {
  let after = "", n = 0;
  for (;;) {
    const rows = await page(disc, after);
    if (!rows.length) break;
    for (const raw of rows) {
      if (STATE && !String(raw.id).startsWith(STATE + "_")) continue;
      // Map the handful of snake_case names lib/terrain.js also accepts directly.
      const r = raw;
      const t = routeTerrain(r);
      tally.scanned++;
      tally.byDisc[disc] = (tally.byDisc[disc] || 0) + 1;
      if (t.evidence.explicitNoGlacier || t.evidence.explicitNoAvy) tally.explicit++;
      if (t.glacier === "no") tally.glacierNo++;
      if (t.snow === "no") tally.snowNo++;
      if (t.glacier === "unknown" || t.snow === "unknown") tally.unknown++;
      const a = fitAdvice(ADVICE[disc] || [], t);
      const g = fitGear(GEAR[disc] || [], t);
      if (a.dropped || g.dropped) {
        tally.adviceDropped += a.dropped;
        tally.gearDropped += g.dropped;
        tally.routesFixed++;
        if (offenders.length < Math.max(LIST, 12)) {
          offenders.push({ id: r.id, name: r.name, disc, glacier: t.glacier, snow: t.snow,
            avalanche: t.avalanche, dropAdvice: a.dropped, dropGear: g.dropped,
            why: t.evidence.explicitNoGlacier || t.evidence.explicitNoAvy ? "route says N/A" : "reads as rock" });
        }
      }
    }
    n += rows.length;
    after = rows[rows.length - 1].id;
    if (rows.length < 500) break;
  }
  process.stderr.write(`  ${disc}: ${n} rows read\n`);
}

console.log("\n=== route terrain audit ===");
console.log("scanned (alpine/mountaineering/ice/mixed):", tally.scanned);
console.log("  by discipline:", JSON.stringify(tally.byDisc));
console.log("routes whose own row states N/A for glacier or avalanche:", tally.explicit);
console.log("classified glacier=no:", tally.glacierNo, " snow=no:", tally.snowNo, " still unknown:", tally.unknown);
console.log("\nroutes shown at least one line of advice or gear they do not need:", tally.routesFixed);
console.log("  advice lines suppressed:", tally.adviceDropped);
console.log("  gear items suppressed:", tally.gearDropped);
if (offenders.length) {
  console.log("\nexamples:");
  for (const o of offenders.slice(0, Math.max(LIST, 12))) {
    console.log(` ${o.id} — ${o.name} (${o.disc}) glacier=${o.glacier} snow=${o.snow} avy=${o.avalanche} · -${o.dropAdvice} advice -${o.dropGear} gear · ${o.why}`);
  }
}
// --- Is there a column carrying terrain prose that the classifier cannot see? ------------
//
// This is the failure that produced this section. `climbing_route` was added by migration
// 0122 to re-home climbing prose OUT of `approach`, and corpus() was never told — so on 9 WA
// routes the classifier suppressed avalanche advice while the route's own text described snow
// at the base. Nothing reported it and nothing could: the column was populated, the screen
// rendered it, and every coverage check was green. Only the classifier was blind.
//
// A comment saying "add new prose columns to CORPUS_COLUMNS" would have rotted exactly the
// way the last one did. So the audit asks the question itself, every run.
//
// The declaration is demanded LATE on purpose. A column has to be both populated AND carrying
// a glacier/snow word before it needs an entry here — which is precisely when it could change
// a verdict, and not before. A column that can never affect the classifier never appears, so
// this list stays at the handful that matter instead of growing to every column on the table.
const NOT_TERRAIN_EVIDENCE = {
  seasonal_hazards: "the N/A DECLARATION itself lives here, read structurally by saysNotApplicable(). Reading it as prose would make every row that declares avalanche absent read as avalanche present — it would disable the mechanism it belongs to.",
  bivy: "camp sites. Describes where you sleep, not what the route crosses; snow at a bivy says nothing about the climb.",
  access: "land manager, permits and road status. The access/calendar family corpus() already excludes by name.",
  approach_logistics: "trailhead and driving logistics — same family as `road`, which is excluded by name.",
  waypoints: "pin names and coordinates. A pin CALLED 'Snow Lake' is a proper noun, not a snow report.",
  emergency: "rescue contacts and evacuation notes. Mentions winter conditions as a matter of course.",
  data_quality: "confidence and gaps boilerplate — one sentence repeated 8,021 times catalog-wide, so it would flip every route at once or none.",
  partner_requirements: "what a partner should be able to do. Real terrain signal, but phrased as a skill, and it is derived FROM the columns already read.",
  rappel_detail: "per-station rappel table. Descent hardware, not terrain crossed.",
  corrections: "the climber-correction ledger — historical values, including ones since replaced.",

  // The calendar and access family. lib/terrain.js excludes these BY NAME in corpus()'s own
  // comment, and the reason is on record: Southwest Rib on South Early Winters Spire kept an
  // ice axe and crampons purely because its itinerary noted Highway 20 "closes with the first
  // heavy snow". That is a fact about a road in November, not about a dry rock climb in July.
  // These are the highest-volume entries in this list — climate 261 of 296 sampled rows, road
  // 120, itinerary 102 — which is exactly why reading them would drown the signal.
  climate: "calendar and weather narrative; mentions winter as a matter of course.",
  season: "the climbing window. A window is not a terrain report, and see the season-is-prose note in CLAUDE.md.",
  best_season: "the prose companion to `season`; same reason.",
  timing: "start times and daylight budgeting; excluded by name in corpus().",
  itinerary: "day-by-day logistics; excluded by name in corpus(). The Highway 20 case above.",
  road: "driving and road-closure status; excluded by name in corpus().",
  permit: "permit regime and quotas. Access logistics, seasonal by nature.",
  comms: "cell and radio coverage; mentions winter access as a matter of course.",
  crowds: "how busy the route gets, by season.",

  // Grades. A grade is a difficulty, not a description of terrain crossed, and these already
  // reach the classifier structurally — `grade` through YDS_RE, `ice`/`mixed` by discipline.
  // Reading their text as prose would count the same signal twice through a second path.
  grade: "the free grade; consumed structurally by YDS_RE, not as prose.",
  alpine_grade: "commitment grade, consumed structurally. It also conflates Roman numerals with YDS class — see CLAUDE.md.",
  ice_grade: "ice difficulty. `ice` and `mixed` are already treated as frozen disciplines by name.",

  fa: "first-ascent history. A first WINTER ascent in 1963 says nothing about the terrain a party crosses today.",
};

const SNOWY = /\bglacier|glaciat(?:ed|ion)|crevasse|s[e\u00e9]racs?|icefall|bergschrund|schrund|snow\s*bridge|rope\s*team|\bsnowfield|\bsnow\s|\bsnowy|cornice|ice\s*axe|crampon|self[- ]arrest|glissad|snowpack|\bavalanche|\bavy\b/i;
const flat = v => v == null ? "" :
  typeof v === "string" ? v :
  Array.isArray(v) ? v.map(flat).join("  ") :
  typeof v === "object" ? Object.values(v).map(flat).join("  ") : String(v);

async function blindScan() {
  // One page of full rows. Sampled rather than exhaustive because this asks a question about
  // COLUMNS, not routes — a column carrying terrain prose carries it on many rows, and a
  // full-table select of every jsonb column moves tens of MB to learn the same thing. The
  // sample size is printed rather than hidden, per the no-silent-caps rule.
  const SAMPLE = 400;
  const url = `${SUPABASE_URL}/rest/v1/routes?select=*&discipline=eq.alpine` +
    (STATE ? `&id=like.${STATE}_*` : "") + `&order=id.asc&limit=${SAMPLE}`;
  const res = await fetch(url, { headers: headers(key) });
  if (!res.ok) { console.log(`\nblind-column scan: SKIPPED (routes -> ${res.status})`); return; }
  const rows = JSON.parse(await res.text());
  if (!rows.length) { console.log("\nblind-column scan: SKIPPED (no rows)"); return; }

  const known = new Set(CORPUS_COLUMNS);
  known.add("approach_variants"); // read by key, see AV_PROSE_KEYS in lib/terrain.js
  const carrying = new Map();
  for (const r of rows) {
    for (const [k, v] of Object.entries(r)) {
      if (known.has(k)) continue;
      const t = flat(v);
      if (t && SNOWY.test(t)) carrying.set(k, (carrying.get(k) || 0) + 1);
    }
  }

  const undeclared = [...carrying.keys()].filter(k => !(k in NOT_TERRAIN_EVIDENCE)).sort();
  const stale = Object.keys(NOT_TERRAIN_EVIDENCE).filter(k => !carrying.has(k)).sort();

  console.log(`\nblind-column scan (${rows.length} full rows sampled, ${Object.keys(rows[0]).length} columns):`);
  console.log(`  columns outside the classifier that carry terrain prose: ${carrying.size} (all declared: ${undeclared.length === 0})`);
  if (undeclared.length) {
    console.log("\n  UNDECLARED — each of these carries glacier/snow prose the classifier cannot see.");
    console.log("  Either add it to CORPUS_COLUMNS in lib/terrain.js, or record here WHY it is not evidence:");
    for (const k of undeclared) console.log(`    ${k}  (${carrying.get(k)} of ${rows.length} sampled rows)`);
  }
  if (stale.length) {
    console.log("\n  STALE declarations — no sampled row carries terrain prose in these, so the reason");
    console.log("  recorded for them is describing data that has moved on:");
    for (const k of stale) console.log(`    ${k}`);
  }
}
await blindScan();

// Report-only, like audit:area-parents: the exit code says "things to look at", never
// "these are bugs". A route reading as rock is a candidate for review, not a defect.
process.exit(0);
