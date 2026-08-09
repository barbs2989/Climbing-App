/* Which routes does the app tell you to bring an ice axe, crampons and mountaineering
   boots for, on the strength of a sentence that says you only need them SOMETIMES?

   RouteDetail's assumedFor() gates the snow items on _SNOW_RE matching any of the
   route's own text — and that text includes `gear`. Liberty Bell's Beckey Route stores
   "ice axe and crampons in early season", so the regex reads its own hedge as evidence,
   drops the hedge, and prints Ice axe / Crampons / Mountaineering boots as gear the
   climber is assumed to have. Mountain Project says "may want an axe and/or crampons
   depending on snow conditions in the gully"; North Cascade Mountain Guides lists them
   under "TECHNICAL EQUIPMENT - SPRING" and says late season you "walk to the base in a
   pair of lightweight hiking boots". Neither claims boots at all.

   Report-only. Prints the population, split by whether the snow evidence is
   unconditional (a real couloir/glacier route) or hedged. */
import { anonKey, selectAll } from "../lib/supabase-env.mjs";

const key = anonKey();

// mirrors RouteDetail.jsx
const GLACIER_RE = /glacier|crevasse|bergschrund|schrund|icefall|serac/i;
const SNOW_RE = /\bsnow|\bcouloir|\bnev[ée]|\bice\b|ice axe|crampon|posthol|cornice|glissad|\bfirn\b|\bmoat\b/i;

// A hedge that makes the snow gear conditional rather than required.
const HEDGE_RE = /\b(early[- ]season|late[- ]season|in spring|spring only|depending on|if (?:there is |the )?snow|when snow|may want|optional|conditions? (?:dependent|permitting|vary)|as needed|possibl[ye]|sometimes|until (?:mid[- ])?(?:june|july)|through (?:june|july)|season(?:al|ally))\b/i;

const flat = (v) => (Array.isArray(v) ? v.join(" ") : v == null ? "" : String(v));
const gearText = (r) =>
  [r.name, r.grade, r.overview, r.approach, r.descent_text, r.season, flat(r.hazards), flat(r.gear), flat(r.obj_haz)]
    .filter(Boolean).join(" ");

const rows = await selectAll(
  "routes",
  "id,area_id,name,grade,discipline,overview,approach,descent_text,season,hazards,gear,obj_haz",
  "discipline=in.(alpine,mountaineering)",
  { pageSize: 1000, key }
);
console.log(`alpine/mountaineering routes: ${rows.length}`);

const snowy = [], hedgedOnly = [], glaciated = [];
for (const r of rows) {
  const txt = gearText(r);
  if (!SNOW_RE.test(txt)) continue;
  snowy.push(r);
  if (GLACIER_RE.test(txt)) { glaciated.push(r); continue; }

  // Is EVERY sentence that mentions snow gear hedged? If any unhedged sentence carries
  // the snow signal, the route really is a snow route and the assumption is fine.
  const sentences = txt.split(/(?<=[.;])\s+/);
  const hits = sentences.filter((s) => SNOW_RE.test(s));
  if (hits.length && hits.every((s) => HEDGE_RE.test(s))) hedgedOnly.push({ r, hits });
}

console.log(`  ...of which the app assumes snow gear for: ${snowy.length}`);
console.log(`  ...genuinely glaciated (glacier/crevasse kit too): ${glaciated.length}`);
console.log(`\nCONDITIONAL ONLY — every snow mention is hedged, yet the app prints`);
console.log(`Ice axe / Crampons / Mountaineering boots as assumed gear: ${hedgedOnly.length}\n`);

for (const { r, hits } of hedgedOnly.slice(0, 60)) {
  console.log(`  ${r.id.padEnd(46)} ${String(r.grade || "").padEnd(22)} ${r.name}`);
  for (const h of hits.slice(0, 2)) console.log(`      "${h.trim().slice(0, 150)}"`);
}
if (hedgedOnly.length > 60) console.log(`  … and ${hedgedOnly.length - 60} more`);

/* The other half of "why does this route need crampons": rows where the ONLY thing in the
   whole record mentioning snow is the gear list itself. A hedge at least tells the climber
   when to carry it; an unhedged "crampons" on a route whose name, grade, approach, descent,
   season and hazards never mention snow is a bare assertion with nothing behind it. These
   are data questions, not rendering ones — the app cannot fix them, so they are printed for
   research rather than suppressed. */
const YDS = /^\s*(?:Grade\s+[IVX]+,\s*)?5\.\d/i;
const orphan = [];
for (const r of rows) {
  const gearOnly = flat(r.gear);
  if (!/crampon|ice axe|ice tool/i.test(gearOnly)) continue;
  const rest = [r.name, r.grade, r.overview, r.approach, r.descent_text, r.season, flat(r.hazards), flat(r.obj_haz)].filter(Boolean).join("; ");
  if (SNOW_RE.test(rest) || GLACIER_RE.test(rest)) continue;   // corroborated elsewhere
  if (HEDGE_RE.test(gearOnly)) continue;                        // hedged — handled above
  orphan.push(r);
}
console.log(`\nSNOW GEAR ASSERTED BY THE GEAR LIST ALONE — nothing else in the row mentions`);
console.log(`snow, ice, a couloir or a glacier, and the mention is not hedged: ${orphan.length}\n`);
for (const r of orphan.slice(0, 40)) {
  console.log(`  ${r.id.padEnd(46)} ${String(r.grade || "").padEnd(20)} ${YDS.test(String(r.grade || "")) ? "[rock grade] " : ""}${r.name}`);
  console.log(`      gear: ${flat(r.gear).slice(0, 150)}`);
}
if (orphan.length > 40) console.log(`  … and ${orphan.length - 40} more`);
