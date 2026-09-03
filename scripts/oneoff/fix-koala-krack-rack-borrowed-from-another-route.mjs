// One RACK box showing two racks, and the row says where the wrong one came from.
//
// wa_koala_krack renders both of these in the same box on the route page:
//
//   "Cams — standard rack to 3 inches"     from access to sling_rack, via rackLines()
//   "Gear to 5 inches ..."                 from detailed_rack, via routeRackFor()
//
// routeRackFor prefers detailedRack over rack, so the 5-inch line wins the `rack` prop — but
// RouteRackBox ALSO pushes rackLines(route.slingRack) into the same list, so both are on screen at once.
// A climber racking off that box for a wide diagonal crack reads "to 3 inches" and leaves the two sizes
// that matter in the car.
//
// THE ROW STATES ITS OWN PROVENANCE, which is what makes this settleable without leaving the row. Its
// rope_note reads: "No dedicated route-specific beta found; INFERRED FROM the comparable/easier North
// Face (5.6, 3 pitches, standard rack to 3in, chain-rappel descent) on the same formation." So the 3-inch
// figure is another route's rack, said so in as many words, and three of this row's own fields disagree
// with it:
//
//   detailed_rack   "Gear to 5 inches — a single set of cams covers the wide diagonal crack"
//   gear            "Cams up to 5\""
//   pro_needs       "Protects well with LARGE cams in the wide crack"
//
// THE SIZE IS COPIED, NOT COMPOSED. The only edit is the size token, and the value 5 is read off the
// row's own detailed_rack at apply time rather than typed — so this cannot invent a rack, and it refuses
// if detailed_rack stops naming a size. The wording around it is untouched.
//
// STALE RECORDED NEGATIVE, REPORTED AND NOT TOUCHED: corrections says a Mountain Project page for this
// route could not be found. One exists and confirms the 5-inch rack. That sentence is now false, but
// rewriting a provenance note is authoring rather than repair, and gear_confidence "inferred" still
// drives an honest caption ("inferred from this route's own description, not confirmed against trip
// reports"). Left for a pass that can cite the page it read.
//
// Read-only by default. Pass --apply to write.
import { selectAll, patchRow, requireServiceKey } from "../lib/supabase-env.mjs";

const APPLY = process.argv.includes("--apply");
requireServiceKey();

const TARGET = "wa_koala_krack";
const BORROWED = /\b3\s*(?:in\b|inches\b|")/i;
const INFERRED_FROM = /inferred from the comparable\/easier north face/i;

const r = (await selectAll("routes", "id,rack,sling_rack,detailed_rack,pro_needs,gear,rope_note", `id=eq.${TARGET}`, { pageSize: 5 }))[0];
if (!r) { console.error(`${TARGET} not found — refusing`); process.exit(1); }

// the donor: the size this row's own detailed_rack names
const m = String(r.detailed_rack || "").match(/\b(\d(?:\.\d)?)\s*(?:in\b|inches\b|")/i);
if (!m) { console.error("detailed_rack no longer names a cam size — refusing"); process.exit(1); }
const SIZE = m[1];
if (!/\bcams? up to\s*5|5\s*"/i.test(JSON.stringify(r.gear || []))) { console.error("the row's gear no longer corroborates the larger size — refusing"); process.exit(1); }
if (!INFERRED_FROM.test(String(r.rope_note || ""))) { console.error("the row no longer records that its rack was inferred from another route — refusing"); process.exit(1); }

const sr = r.sling_rack && typeof r.sling_rack === "object" && !Array.isArray(r.sling_rack) ? { ...r.sling_rack } : null;
if (!sr) { console.error("sling_rack is not the object shape this repairs — refusing"); process.exit(1); }

const fixStr = s => String(s).replace(/\b3(\s*)(in\b|inches\b|")/gi, SIZE + "$1$2");
const nextSr = {}; let touched = 0;
for (const [k, v] of Object.entries(sr)) { const nv = typeof v === "string" && BORROWED.test(v) ? fixStr(v) : v; if (nv !== v) touched++; nextSr[k] = nv; }
const nextRack = Array.isArray(r.rack) ? r.rack.map(x => { const nx = typeof x === "string" && BORROWED.test(x) ? fixStr(x) : x; if (nx !== x) touched++; return nx; }) : r.rack;

if (!touched) { console.log("nothing to do — no borrowed 3-inch figure remains."); process.exit(0); }
console.log(`donor size, read off detailed_rack: ${SIZE} inches`);
console.log(`   detailed_rack: ${JSON.stringify(String(r.detailed_rack).slice(0, 120))}`);
console.log(`   gear         : ${JSON.stringify(r.gear)}`);
console.log(`\n  sling_rack  ${JSON.stringify(sr)}\n           -> ${JSON.stringify(nextSr)}`);
console.log(`  rack        ${JSON.stringify(r.rack)}\n           -> ${JSON.stringify(nextRack)}`);
if (!APPLY) { console.log(`\nDRY RUN — ${touched} value(s). Pass --apply to write.`); process.exit(0); }

await patchRow("routes", TARGET, { sling_rack: nextSr, rack: nextRack });
const a = (await selectAll("routes", "id,rack,sling_rack", `id=eq.${TARGET}`, { pageSize: 5 }))[0];
const left = JSON.stringify([a.rack, a.sling_rack]).match(/\b3\s*(?:in|inches|\\")/gi);
console.log(left ? `NOT FULLY APPLIED — ${left.length} borrowed figure(s) remain` : "verified: the RACK box no longer offers a 3-inch rack borrowed from a different route");
