// ONE sling_rack VALUE INVENTED A THIRD SHAPE, AND THE RACK BOX RECITED ITS KEYS.
//
// `fmtSlingVal` knows two conventions and renders both well — `{size,count}` becomes "2× #0 C3 to
// 0.75 in" and `{length,purpose,quantity}` becomes "4× 60cm (anchor building on ledges)". Measured
// across the column: 27 of 242 values hold a nested object and 26 render correctly. This row is the
// twenty-seventh: a KIT of five components (pulley, prusiks, purpose, cordelette, locking
// carabiners), which matches neither convention, so the bullet reads
//
//   Crevasse rescue kit — pulley: 1, prusiks: 2, purpose: crevasse rescue/hauling system for
//   Blue Glacier travel, cordelette: 1, locking carabiners: 4
//
// a machine reciting a record, with a sentence wedged into the middle of a kit list, at 124
// characters inside a bullet.
//
// WHY THE DATA AND NOT THE RENDERER. The class is ONE — 26 of 27 nested values are fine — and this
// repo refuses a fix aimed at a class of one. Widening `fmtSlingVal` to guess at arbitrary key sets
// would also put the 26 correct bullets at risk to repair a single row. CLAUDE.md's standing rule
// runs the other way: "before writing a researched string into an existing column, look at where
// that column renders." This value was written in a shape the column's reader does not handle, so
// the DATA is the half that broke the convention.
//
// NOTHING IS RESEARCHED. Every token in the replacement is already in the stored value; the script
// asserts that mechanically rather than trusting the author, so a repair that smuggled in a fact
// the row does not hold would be refused. Only the shape and word order change.
import { requireServiceKey, selectAll, patchRow } from "../lib/supabase-env.mjs";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const APPLY = process.argv.includes("--apply");
const ID = "wa_mount_tom_scramble";
const KEY = "crevasse_rescue_kit";

// The state this repair is written against. A re-run on a row that has since moved REFUSES rather
// than overwriting somebody else's work — the declared-state contract the trailhead and camp
// repairs already use.
const EXPECT = { pulley: 1, prusiks: 2, purpose: "crevasse rescue/hauling system for Blue Glacier travel", cordelette: 1, locking_carabiners: 4 };
const REPLACEMENT = "1 pulley, 2 prusiks, 1 cordelette, 4 locking carabiners (crevasse rescue/hauling system for Blue Glacier travel)";

const dead = (m) => { console.error(`REFUSED: ${m}`); process.exit(1); };

/* The renderer is LIFTED from source, never re-typed: a copy would agree with itself whatever the
   app does, and whether the new shape reads well is the entire question. ANCHOR LOST if it moves. */
const SRC = fs.readFileSync(path.join(ROOT, "RouteDetail.jsx"), "utf8");
function lift(name) {
  const i = SRC.indexOf(`function ${name}(`);
  if (i < 0) dead(`ANCHOR LOST: ${name} — cannot show what this would render as`);
  let d = 0, started = false;
  for (let k = i; k < SRC.length; k++) {
    if (SRC[k] === "{") { d++; started = true; }
    else if (SRC[k] === "}") { d--; if (started && !d) return SRC.slice(i, k + 1); }
  }
  dead(`ANCHOR LOST: ${name} did not close`);
}
const rackLines = new Function(
  lift("fmtSlingVal") + "\n" + lift("fmtSlingRack") + "\n" + lift("rackLines") + "\nreturn rackLines;"
)();
// Non-vacuity: a lift that produces nothing would make every "renders better" claim below empty.
if (!(rackLines([{ qty: 2, sizeCm: 60 }]) || []).length) dead("the lifted renderer produced no bullet — the lift is broken, not the data");

const rows = await selectAll("routes", "id,sling_rack", `id=eq.${ID}`);
if (!rows.length) dead(`${ID} not found`);
const live = rows[0].sling_rack;

if (!live || typeof live !== "object" || Array.isArray(live)) dead("sling_rack is no longer a top-level object");
const keys = Object.keys(live);
if (keys.length !== 1 || keys[0] !== KEY) dead(`expected exactly one key "${KEY}", found: ${keys.join(", ")}`);
const kit = live[KEY];
for (const [k, v] of Object.entries(EXPECT)) {
  if (kit[k] !== v) dead(`${KEY}.${k} is ${JSON.stringify(kit[k])}, expected ${JSON.stringify(v)} — the row has moved since this was written`);
}
if (Object.keys(kit).length !== Object.keys(EXPECT).length) dead(`${KEY} has ${Object.keys(kit).length} keys, expected ${Object.keys(EXPECT).length}`);

/* TRACEABILITY. Every word and number in the replacement must already be in the stored value, so
   this cannot become a place where a fact gets invented. Word order and the count-before-noun
   phrasing are what change; the tokens are not. */
const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, " ").split(/\s+/).filter(Boolean);
const source = new Set(norm(KEY + " " + Object.entries(kit).map(([k, v]) => `${k} ${v}`).join(" ")));
const invented = norm(REPLACEMENT).filter((t) => !source.has(t));
if (invented.length) dead(`the replacement names ${invented.length} token(s) the row does not hold: ${invented.join(", ")}`);

const before = rackLines(live) || [];
const after = rackLines({ [KEY]: REPLACEMENT }) || [];
/* MEASURE WHAT THE CLIMBER READS, WHICH IS THE LABEL PLUS THE VALUE. The first version of this
   script fell through to `l.text` alone and reported 124 -> 112, omitting the "Crevasse rescue
   kit — " the bullet actually carries; the real figures are 146 -> 134. Same lesson this column
   already taught once, committed here by the repair rather than by the renderer:
   measure-sling-rack-onscreen-quality.mjs composes `b.label + " — " + b.text` and is the standard
   to match, or two instruments disagree about one bullet. */
const txt = (l) => (typeof l === "string" ? l : (l && l.label != null ? `${l.label} — ${l.text}` : (l && l.text)) || JSON.stringify(l));

console.log(`${ID}\n`);
console.log("  BEFORE");
for (const l of before) console.log(`    [${txt(l).length}ch] ${txt(l)}`);
console.log("\n  AFTER");
for (const l of after) console.log(`    [${txt(l).length}ch] ${txt(l)}`);

const longestAfter = Math.max(...after.map((l) => txt(l).length));
const longestBefore = Math.max(...before.map((l) => txt(l).length));
if (longestAfter >= longestBefore) dead(`the replacement is not shorter (${longestBefore} -> ${longestAfter}); it would not fix the bullet`);
// It must also stop reciting keys. "purpose:" mid-list is the specific thing a climber reads as noise.
if (after.some((l) => /\b(pulley|prusiks|cordelette|locking carabiners|purpose)\s*:/.test(txt(l)))) dead("the replacement still recites keys");

console.log(`\ntraceable: every token of the replacement is in the stored value`);
console.log(`longest bullet ${longestBefore} -> ${longestAfter} chars`);

if (!APPLY) { console.log("\ndry run — pass --apply to write"); process.exit(0); }

requireServiceKey();
await patchRow("routes", ID, { sling_rack: { [KEY]: REPLACEMENT } });

const [back] = await selectAll("routes", "id,sling_rack", `id=eq.${ID}`);
if (!back || back.sling_rack?.[KEY] !== REPLACEMENT) dead("read-back does not match what was written");
const rendered = (rackLines(back.sling_rack) || []).map(txt);
console.log(`\nwritten and read back. The RACK box now reads:`);
for (const l of rendered) console.log(`  [${l.length}ch] ${l}`);
