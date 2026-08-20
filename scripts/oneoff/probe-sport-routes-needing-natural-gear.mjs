// RouteGearCheck takes an early branch for `sport` and renders a quickdraw note instead of the
// RACK box. That is right for a pure sport route — the rack IS draws — but it means a sport
// route with a pitch that takes natural gear has nowhere to say so.
//
// wa_technicians_of_the_sacred is the case: a 6-pitch 5.12c whose own pitch 6 reads "Hand
// crack, natural gear; only unbolted pitch". A party racking off that page brings draws and
// arrives at the last pitch with nothing to place. Same shape as every other finding in this
// branch — a section that is correct for the common case becomes a lie for the exception.
//
// Measure it before fixing it. Read-only.
import { SUPABASE_URL, anonKey, headers } from "../lib/supabase-env.mjs";
const k = anonKey();

function leaves(v, out = []) {
  if (typeof v === "string") { if (v.trim()) out.push(v); return out; }
  if (Array.isArray(v)) { for (const x of v) leaves(x, out); return out; }
  if (v && typeof v === "object") { for (const x of Object.values(v)) leaves(x, out); return out; }
  return out;
}
/* Says a placement is needed, not merely that a crack exists — a sport route can climb a crack
   feature past bolts, so "crack" alone would flag correct pure-sport rows. */
const NATURAL = /\b(natural gear|trad gear|unbolted|nuts?\b|cams?\b|camalot|stoppers?|offsets?|rps?\b|hexes|tricams?|small gear|rack to|gear anchor|no bolts|bring gear|place gear)\b/i;

/* A NEGATION IS NOT A CLAIM, and the first run of this probe forgot it — 17 of its 19 hits were
   routes saying "no trad gear needed", "Fully bolted; no natural gear required", "no cams or
   nuts required", i.e. exactly the opposite of the thing being looked for. Same trap
   check:rappel-lengths records ("Not plowed in winter" read as an open road) and the same
   direction: a detector that reports correct work is one people learn to ignore.
   The window is the clause, not the sentence — "Fully bolted to chain anchors on every pitch;
   no trad gear is used" carries both halves and only the near one governs. */
const NEGATED = /\b(no|not|without|never|none|zero)\b[^.;]{0,40}$/i;
const negatedAt = (text, idx) => NEGATED.test(text.slice(Math.max(0, idx - 60), idx));

/* "tie a STOPPER KNOT" is a knot, not a nut, and it put wa_lady_slipper — a fully bolted 5.5 —
   on the list. A climbing vocabulary is full of words that are gear in one phrase and not in
   another; the fix is the phrase, never a shorter word list. */
const NOT_GEAR = [/\bstopper\s+knot/i, /\bcam\s+(?:strap|buckle)/i];
const falseSense = (text, idx) => NOT_GEAR.some((re) => re.test(text.slice(Math.max(0, idx - 12), idx + 30)));

async function readAll() {
  const out = []; let last = "";
  for (;;) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/routes?select=id,name,grade,pitches,discipline,pitch_detail,gear,rack,detailed_rack,pro_needs,beta,description&id=like.wa_*&discipline=eq.sport&id=gt.${encodeURIComponent(last)}&order=id.asc&limit=1000`, { headers: headers(k) });
    if (!res.ok) throw new Error(`read failed ${res.status}`);
    const rows = await res.json();
    if (!rows.length) break;
    out.push(...rows); last = rows[rows.length - 1].id;
    if (rows.length < 1000) break;
  }
  return out;
}
const rows = await readAll();
if (!rows.length) { console.error("FAIL — read 0 sport routes"); process.exit(1); }

const hits = [];
for (const r of rows) {
  /* Only the route's OWN protection record counts. Its beta/description can mention a nearby
     trad line without this route needing gear. */
  const own = [...leaves(r.pitch_detail), ...leaves(r.gear), ...leaves(r.rack), ...leaves(r.detailed_rack), ...leaves(r.pro_needs)].join("  ");
  /* Every occurrence, not just the first: a row can deny gear in one clause and require it in
     another ("Fully bolted … except the last pitch, which takes cams"), and stopping at the
     first match would take whichever came first. */
  let m, found = null;
  const re = new RegExp(NATURAL.source, "gi");
  while ((m = re.exec(own))) { if (!negatedAt(own, m.index) && !falseSense(own, m.index)) { found = m; break; } }
  if (found) hits.push({ id: r.id, name: r.name, grade: r.grade, pitches: r.pitches, hit: found[0], where: own.slice(Math.max(0, found.index - 70), found.index + 90) });
}
console.log(`\n=== sport routes whose own record says a pitch takes natural gear ===`);
console.log(`${rows.length} WA sport routes · ${hits.length} say gear is needed somewhere on the route\n`);
console.log(`Every one of these renders the quickdraw note and NO rack, because RouteGearCheck`);
console.log(`returns early for discipline=sport.\n`);
for (const h of hits.slice(0, 40)) console.log(`  ${h.id.padEnd(46)} ${String(h.grade || "-").padEnd(8)} ${h.pitches ?? "-"}p  [${h.hit}]\n       …${h.where.replace(/\s+/g, " ")}…`);
if (hits.length > 40) console.log(`  … ${hits.length - 40} more`);
