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
import { routeTerrain, fitAdvice, fitGear } from "../lib/terrain.js";

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
  "seasonal_hazards", "pro_tips", "features", "difficulty", "timing"].join(",");

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
// Report-only, like audit:area-parents: the exit code says "things to look at", never
// "these are bugs". A route reading as rock is a candidate for review, not a defect.
process.exit(0);
