// A waypoint note is read by a CLIMBER. Some of them are the pipeline talking to itself.
//
// `waypoints[].note` RENDERS: RouteDetail draws it as `{wp.note ? <div …>{wp.note}</div> : null}`
// on the waypoint card. So a note reading "Existing DB value confirmed correct against WTA" or
// "Reused coordinate from this session's own Mount Barnes research" is not internal metadata —
// it is on the route page, under a heading, in the same type as the directions beside it.
//
// Found across the drive-directions waves, by agents reading rows rather than by any guard. No
// existing check can see it: the column is populated, the value is prose, and every word in it is
// true. Only the AUDIENCE is wrong.
//
// THE CUES MATCH A VOICE, NOT A TOPIC. "existing DB", "this session", "recommend correcting",
// "confirmed against <source>" are things a pipeline says about its own work; a climber's note
// says where to park. A note that merely mentions a coordinate, a source, or a correction is fine
// — the pattern has to catch the row addressing a future EDITOR.
//
// TWO SHAPES, AND THEY NEED OPPOSITE REPAIRS, so the report separates them:
//   - the note OPENS with it  -> the note IS bookkeeping; delete it
//   - real information first, bookkeeping TAIL -> trim the tail, keep the head
// A blanket delete would destroy the useful halves; a blanket keep leaves the useless notes on
// screen. This is a per-note judgement and the script deliberately does not offer a transform.
//
// Read-only, report-only, anon key, fails closed on an empty read. NOT a build gate — a property
// of the database, not the checkout, so no code change can cause or fix it. Same reasoning
// check:counts records.
//
//   node scripts/audit-waypoint-note-voice.mjs                # whole catalog
//   node scripts/audit-waypoint-note-voice.mjs --state wa
//   node scripts/audit-waypoint-note-voice.mjs --list 40
//   node scripts/audit-waypoint-note-voice.mjs --inject=<case>
import { SUPABASE_URL, headers, anonKey } from "./lib/supabase-env.mjs";

const argv = process.argv.slice(2);
const arg = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? (argv[i + 1] ?? true) : d; };
const STATE = arg("--state", null);
const LIST = +arg("--list", 20);
const INJECT = (argv.find((a) => a.startsWith("--inject=")) || "").split("=")[1] || null;

const CUES = [
  ["talks about the DB itself", /\b(existing DB|DB entry|database entry|the DB value|stored (?:DB )?(?:value|coordinate))\b/i],
  ["talks about the research pass", /\b(this session|the previous session|research pass|enrichment pass|earlier pass)\b/i],
  ["addresses a future editor", /\b(recommend correcting|should be corrected|needs? (?:to be )?verif|could not be confidently verified|TODO|placeholder|left as-is)\b/i],
  // "confirmed via research" was MISSED by the first version of this list, and an agent reading
  // two rows found it while the audit reported them clean. `confirmed (?:correct )?against` does
  // not match `Confirmed via research`, so the cue is widened to the VERB plus any of the ways a
  // pass refers to its own work. Note this stays about voice: "confirmed by a 2024 trip report"
  // is a climber-facing sourcing hedge and is deliberately NOT matched — `--inject=innocent`
  // pins that boundary.
  ["cites its own sourcing", /\b(per WTA|according to (?:WTA|Mountain Project|MP)\b|confirmed (?:correct )?(?:against|via (?:research|sources?))|verified (?:via|against) (?:research|sources?|the DB)|matches (?:the )?existing)\b/i],
  ["reuses another route's work", /\b(same (?:general )?(?:trailhead )?area used|reused coordinate|same approach as other|copied from)\b/i],
];
// Where in the note the cue starts decides the repair. 15% is not a tuned threshold — it just
// separates "the sentence the note opens with" from "a clause appended at the end".
const OPENS_BELOW = 0.15;

async function page(after) {
  const key = anonKey();
  const url = `${SUPABASE_URL}/rest/v1/routes?select=id,name,waypoints&waypoints=not.is.null` +
    (after ? `&id=gt.${encodeURIComponent(after)}` : "") +
    (STATE ? `&id=like.${STATE}_*` : "") + `&order=id.asc&limit=1000`;
  for (let a = 0; a < 4; a++) {
    const res = await fetch(url, { headers: headers(key), signal: AbortSignal.timeout(45000) })
      .catch((e) => ({ ok: false, status: 0, text: async () => String(e.message) }));
    const t = await res.text();
    if (res.ok) return JSON.parse(t);
    if (a === 3) throw new Error(`GET routes -> ${res.status} ${String(t).slice(0, 200)}`);
    await new Promise((r) => setTimeout(r, 900 * (a + 1)));
  }
}

const rows = [];
let after = null;
for (;;) {
  const j = await page(after);
  if (!j.length) break;
  rows.push(...j);
  after = j[j.length - 1].id;
  if (rows.length > 250000) break;
}
if (!rows.length) {
  console.log("FAIL-CLOSED: read zero routes. That is a broken scan, not a clean catalog.");
  process.exit(1);
}

// The fault lives in the DB and this script cannot write, so injections edit rows in memory.
// Each must MOVE THE COUNTER, not merely log.
if (INJECT) {
  const victim = rows.find((r) => Array.isArray(r.waypoints) && r.waypoints.some((w) => String((w && w.note) || "").trim().length > 60));
  if (!victim) { console.log("inject: no suitable row"); process.exit(1); }
  const wp = victim.waypoints.find((w) => String((w && w.note) || "").trim().length > 60);
  const original = wp.note;
  if (INJECT === "opens") {
    wp.note = `Existing DB value confirmed correct. ${original}`;
    console.log(`inject opens -> ${victim.id}: bookkeeping prepended\n`);
  } else if (INJECT === "tail") {
    wp.note = `${original} This matches the existing DB entry exactly.`;
    console.log(`inject tail -> ${victim.id}: bookkeeping appended\n`);
  } else if (INJECT === "innocent") {
    // A note that MENTIONS a coordinate, a source and a correction without addressing an editor.
    // Must NOT be flagged — this is the case that keeps the cues about voice rather than topic.
    wp.note = `${original} The pullout is signed; coordinates 48.5, -121.2 put you at the gate.`;
    console.log(`inject innocent -> ${victim.id}: harmless mention of a coordinate\n`);
  } else { console.log(`unknown --inject=${INJECT}`); process.exit(1); }
}

const hits = [];
let notes = 0, routesWithNotes = 0;
for (const r of rows) {
  const w = r.waypoints;
  if (!Array.isArray(w)) continue;
  let any = false;
  w.forEach((x, i) => {
    const t = String((x && x.note) || "").trim();
    if (!t) return;
    notes++; any = true;
    for (const [label, re] of CUES) {
      const m = t.match(re);
      if (!m) continue;
      hits.push({ id: r.id, i, label, cue: m[0], note: t, frac: m.index / t.length });
      break;
    }
  });
  if (any) routesWithNotes++;
}
// FAIL CLOSED the other way too: zero notes means the column moved or the scan broke, not that
// every route is clean.
if (!notes) {
  console.log("FAIL-CLOSED: routes were read but not one waypoint note was found. The column moved");
  console.log("or the scan broke — this is not a clean catalog.");
  process.exit(1);
}

console.log(`routes read              : ${rows.length}${STATE ? ` (state=${STATE})` : ""}`);
console.log(`routes with any note     : ${routesWithNotes}`);
console.log(`waypoint notes ON SCREEN : ${notes}\n`);
console.log(`written in the PIPELINE's voice rather than a climber's: ${hits.length}  (${(100 * hits.length / notes).toFixed(1)}%)\n`);

const byLabel = {};
for (const h of hits) byLabel[h.label] = (byLabel[h.label] || 0) + 1;
for (const [k, v] of Object.entries(byLabel).sort((a, b) => b[1] - a[1])) console.log(`   ${String(v).padStart(3)}  ${k}`);

const opens = hits.filter((h) => h.frac < OPENS_BELOW);
const tails = hits.filter((h) => h.frac >= OPENS_BELOW);
console.log(`\n   ${opens.length} OPEN with it   -> the note IS bookkeeping; delete`);
console.log(`   ${tails.length} carry a TAIL   -> real information first; trim the tail, keep the head\n`);

const show = (list, title) => {
  if (!list.length) return;
  console.log(`--- ${title} ---\n`);
  for (const h of list.slice(0, LIST)) {
    console.log(`${h.id}  [waypoint ${h.i + 1}]  ${h.label} ("${h.cue}")`);
    console.log(`   "${h.note.replace(/\s+/g, " ").slice(0, 200)}"`);
    console.log("");
  }
  if (list.length > LIST) console.log(`… ${list.length - LIST} more (use --list ${list.length})\n`);
};
show(opens, "DELETE: the note is bookkeeping");
show(tails, "TRIM: keep the head, drop the bookkeeping tail");

if (hits.length) {
  console.log(`The claim here is "contains pipeline voice", NOT "is entirely bookkeeping" — which is`);
  console.log(`why the two lists are separate and why no transform is offered. Read each note.`);
}
process.exit(0);

// Injection cases (the fault lives in the DB, so --inject edits a row in memory):
//   --inject=opens      prepend bookkeeping to a real note   -> MUST report it, in the DELETE list
//   --inject=tail       append bookkeeping to a real note    -> MUST report it, in the TRIM list
//   --inject=innocent   mention a coordinate and a source    -> MUST NOT be reported
// `innocent` is the case that matters: without it, widening the cues toward topic words
// ("coordinate", "source", "correct") would look like an improvement and would flag correct notes.
