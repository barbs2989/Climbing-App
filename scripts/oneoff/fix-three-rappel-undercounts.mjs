// Three more rows whose rappel box and prose gave different counts (found by audit:rappels).
//
// wa_forbidden_peak_east_ridge (Forbidden, East Ridge Direct) — the table is the East Ledges
//   descent (5), which is the route's documented standard, but descent_text quoted the West Ridge's
//   old "3-7 single-rope rappels", so the header welded both into "~3-7 on a single rope · 5
//   stations". The West Ridge stays as the alternative, with its corrected count written in words:
//   it belongs to a different line, and the header counts the line in the table. The unsupported
//   "most parties reverse the West Ridge" is softened to what trip reports actually say.
// wa_east_face_6 (Chimney Rock, East Face) — station 1 stood for "two or three rappels" from the
//   summit to the Key Ledge. The route's standard description gives two, so it splits into two:
//   4 in all. The Direct variant's "5-6" is another route, now in words.
// wa_junior_s_farm — station 1 was the 70 m count (one linked 35 m rappel); the row's own note says
//   a 60 m needs two stations above the divergence, and the prose leads with the 60 m. Split: 7.
//
//   node scripts/oneoff/fix-three-rappel-undercounts.mjs --dry
import { SUPABASE_URL, headers, requireServiceKey, patchRow } from "../lib/supabase-env.mjs";
import { rappelSummary, rappelHeaderLabel } from "../../lib/rappels.js";

const DRY = process.argv.includes("--dry");
const key = requireServiceKey();
const get = async (id, area) => {
  const rows = await (await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${id}&select=id,area_id,name,rappels,rappel_count_note,rappel_detail,descent,descent_text`, { headers: headers(key) })).json();
  if (!Array.isArray(rows) || rows.length !== 1) throw new Error(`expected 1 row for ${id}`);
  if (rows[0].area_id !== area) throw new Error(`${id} is on ${rows[0].area_id}, expected ${area} — refusing`);
  return rows[0];
};

const plan = [];

// ── Forbidden, East Ridge Direct ──
{
  const r = await get("wa_forbidden_peak_east_ridge", "wa_forbidden_peak");
  if (r.rappel_detail.length !== 5 || !/3–7 single-rope/.test(r.descent_text || "")) throw new Error("East Ridge Direct changed since it was read — re-read before running");
  plan.push([r, {
    rappels: "~5 single-rope rappels down the north side on the East Ledges descent, the standard way off this route. Reversing to the West Ridge instead takes about eight.",
    rappel_count_note: "The East Ridge itself is not reversed as a rappel line. These stations are the East Ledges descent: three rappels heading northeast from the summit, a short exposed grassy traverse, then two more onto the ledges. Individual lengths are not stated, so no per-station length is shown.",
    descent: "Rappel off the northeast side to the East Ledges, or reverse the West Ridge to its notch and rappel the Cat Scratch gullies.",
    descent_text: "The East Ridge is not reversed as a rappel line in its own right; two descents are used instead. The standard one is the East Ledges, dropping climber's-right/northeast directly off the summit: three rappels trend northeast from the summit area, then a short, exposed grassy traverse east to the next rock rib, followed by two more rappels onto the East Ledges proper, about 5 rappels in all. From there, several hundred metres of loose, sandy and grassy class 3–4 ledges and slabs, marked by intermittent and sometimes doubled cairn lines, descend above the crevassed Boston Glacier before regaining the glacier and the walk back to Boston Basin. The alternative is to reverse along the ridge crest past the gendarmes to the West Ridge notch and descend the West Ridge line: about three rappels on the ridge and about five down the Cat Scratch gullies, roughly eight on a single 60 m rope. It is longer, but it is more travelled and easier to follow, and many parties prefer it to the East Ledges, which are faster but loose, exposed, rockfall-prone and easy to lose. Either way, expect mostly natural slung-horn and block anchors with some tat and a handful of fixed or bolted stations, and carry a 60 m rope.",
  }, 5]);
}

// ── Chimney Rock, East Face ──
{
  const r = await get("wa_east_face_6", "wa_chimney_rock");
  const d = r.rappel_detail;
  if (d.length !== 3 || !/two or three rappels/.test(d[0].notes || "")) throw new Error("Chimney Rock East Face changed since it was read — re-read before running");
  const s1 = { ...d[0], n: 1, lengthM: null, notes: "First of two rappels down the summit pitches toward the broad ledge (the Key Ledge) below the summit tower, on a single 165 ft rope. Some parties make three to reach the ledge." };
  const s2 = { ...d[0], n: 2, lengthM: null, notes: "Second summit rappel, landing on the Key Ledge below the summit tower." };
  const rest = d.slice(1).map((s, i) => ({ ...s, n: i + 3 }));
  plan.push([r, {
    rappel_detail: [s1, s2, ...rest],
    rappels: "4 rappels on a single ~165 ft rope: 2 from the summit to the broad ledge (Key Ledge), some parties making 3, then 2 over the fourth-class steps near the bergschrund, with downclimbing between them",
    rappel_count_note: "Applies to the standard route. The harder Direct East Face variant is reported to need as many as five or six rappels straight down the face instead.",
    descent_text: r.descent_text.replace("(two or three rappels on a single rope)", "(two rappels on a single rope; some parties make three)"),
  }, 4]);
}

// ── Junior's Farm ──
{
  const r = await get("wa_junior_s_farm", "wa_full_montey_the");
  const d = r.rappel_detail;
  if (d.length !== 6 || !/links the two rappels above it/.test(d[0].station || "")) throw new Error("Junior's Farm changed since it was read — re-read before running");
  const s1 = { ...d[0], n: 1, lengthM: null,
    station: "Top of the climbing line. On a 60 m rope this is the first of two rappels down to where the descent leaves the climb; it ends at a semi-hanging belay. A 70 m rope links this rappel and the next into one full-stretch 35 m shot and skips the semi-hanging station.",
    notes: "First of two rappels down the climbing line on a 60 m rope." };
  const s2 = { ...d[0], n: 2, lengthM: null,
    station: "The semi-hanging belay, down to the bottom of pitch 8 in the current 8-pitch numbering, also commonly called the bottom of pitch 6 (the same place; the count differs by whether the traverse pitches are numbered). This is where the descent leaves the climbing line.",
    notes: "Second rappel down the climbing line, joining the established descent line. Skipped on a 70 m rope." };
  const rest = d.slice(1).map((s, i) => ({ ...s, n: i + 3 }));
  plan.push([r, {
    rappel_detail: [s1, s2, ...rest],
    rappels: "7 rappels with a 60 m rope (6 with a 70 m, which links the top two): 2 down the climbing line to where the descent leaves it, then 5 down a dedicated rappel line to the ground. Use every station below the divergence on either rope.",
    descent_text: r.descent_text.replace("at least 6-8 raps to 30m or longer", "7 rappels on a 60 m rope, or 6 on a 70 m"),
  }, 7]);
}

for (const [row, body, want] of plan) {
  const after = { ...row, ...body };
  const cam = { ...after, rappelDetail: after.rappel_detail, rappelCountNote: after.rappel_count_note, descentText: after.descent_text };
  const s = rappelSummary(cam), h = rappelHeaderLabel(cam);
  console.log(row.id, "|", h, "|", JSON.stringify(s));
  if (s.documented !== want || s.disagrees || s.singleRopeExceeds) throw new Error(`${row.id} would still state two counts`);
  for (const [k, v] of Object.entries(body)) if (typeof v === "string" && v === row[k] && k === "descent_text") throw new Error(`${row.id} descent_text replace did not match`);
}
if (DRY) { console.log("--dry: not written"); process.exit(0); }
for (const [row, body, want] of plan) {
  await patchRow("routes", row.id, body);
  const b = (await (await fetch(`${SUPABASE_URL}/rest/v1/routes?id=eq.${row.id}&select=rappel_detail,rappels`, { headers: headers(key) })).json())[0];
  if (b.rappel_detail.length !== want || b.rappels !== body.rappels) throw new Error(`${row.id} re-read does not match`);
  console.log("written and re-read:", row.id);
}
