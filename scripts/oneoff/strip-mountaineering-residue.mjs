// One-off (2026-10-25): routes that 0280's trigger had already turned PRIMARY alpine (a YDS 5.x in their own
// grade) still listed "mountaineering" in disciplines[], so the app filed them under Mountaineering (rDiscs reads
// the array). Strips that tag from exactly those rows. Trigger 0350 keeps later writes honest.
// Scope is the same as audit:mountaineering-rule: grade columns only, the documented HELD row untouched, and only
// rows whose primary discipline is already alpine. Each PATCH asserts the value it expects (disciplines=eq.<old>),
// paces at 1000 ms, and on a failure backs off 60 s and retries once, then stops.
// usage: node scripts/oneoff/strip-mountaineering-residue.mjs [--dry]
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const dry = process.argv.includes("--dry");
if (!dry) requireServiceKey();

const YDS = /(?<![\d.])5\.(\d{1,2})([abcd]?[+-]?)(?!\d)(?!\s*(?:mi\b|miles?\b|km\b|hrs?\b|hours?\b|h\b|m\b|ft\b|feet\b|%|degrees?\b|°))/i;
const has = (s) => { const m = YDS.exec(String(s || "")); return !!m && +m[1] <= 15; };
const HELD = new Set(["wa_dragontail_peak_r3"]);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The array filter (disciplines=cs.) hits the statement timeout on this table, so read the indexed primary and
// keep the rows whose array still lists the old tag.
const cand = (await selectAll(
  "routes",
  "id,name,discipline,disciplines,grade,rock_grade,alpine_grade",
  "discipline=eq.alpine",
  { pageSize: 1000 },
)).filter((r) => Array.isArray(r.disciplines) && r.disciplines.includes("mountaineering"));
const todo = cand.filter((r) => r.discipline === "alpine" && !HELD.has(r.id) && (has(r.grade) || has(r.rock_grade) || has(r.alpine_grade)));
console.log(`rows listing mountaineering: ${cand.length}; primary alpine with a 5.x grade to strip: ${todo.length}`);
if (cand.length < 1) { console.error("empty read is not a pass"); process.exit(2); }

let done = 0;
for (const r of todo) {
  const old = Array.isArray(r.disciplines) ? r.disciplines : [];
  const next = old.filter((d) => d !== "mountaineering");
  if (!next.includes("alpine")) next.unshift("alpine");
  if (dry) { console.log("would strip", r.id, JSON.stringify(old), "->", JSON.stringify(next)); continue; }
  const filter = `discipline=eq.alpine&disciplines=eq.${encodeURIComponent(JSON.stringify(old))}`;
  let ok = false;
  for (let attempt = 1; attempt <= 2 && !ok; attempt++) {
    try { await patchRow("routes", r.id, { disciplines: next }, { filter }); ok = true; }
    catch (e) {
      console.error(`attempt ${attempt} ${r.id}: ${e.message}`);
      if (attempt === 1) await sleep(60000);
    }
  }
  if (!ok) { console.error(`STOPPED after ${done} rows; ${r.id} failed twice. Resume by re-running (filter is idempotent).`); process.exit(1); }
  done++;
  await sleep(1000);
}
console.log(dry ? "dry run done" : `stripped ${done} rows`);
