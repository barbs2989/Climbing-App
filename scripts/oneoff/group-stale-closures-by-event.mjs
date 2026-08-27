// Group the expiring-closure backlog by CLOSURE EVENT, not by route.
//
// audit:expiring-closures reports 129 values on 97 routes, and researching 129 times would be the
// wrong unit: one closure serves many routes. FR 6200 beyond Atkinson Flat covers Carne, Dumbell,
// Helmet Butte, Buck and Chiwawa at once; Harts Pass covers Blizzard, Carru and the Pasayten
// trailheads. Research once per event, apply to every row that cites it.
//
// The event key is, in order of strength:
//   1. a FOREST ORDER NUMBER — exact, and the thing to search for. One road carries several
//      concurrent orders, so the road name alone finds the wrong one. That near miss is recorded in
//      [[stale-closure-grind-is-half-viable-and-blind-to-missing-ones]]: the USFS "Harts Pass Road
//      restriction" page is the standing 2014 trailer order, not the Dec 2025 storm closure.
//   2. road identity + milepost — the same key audit:trailhead-road section 3 uses.
//   3. road identity alone — weakest, and flagged as such.
//
// Report-only. Prints a research worklist ordered by how many routes each event unblocks.
import { selectAll } from "../lib/supabase-env.mjs";

const FIELDS = ["status", "seasonalGate", "driveNote"];
const ACC = ["closures", "seasonal"];
const SHELF = /\bindefinitel|no reopening (?:estimate|date)|no estimated (?:repair|reopening)|until further notice|as of (?:mid|early|late|the )?[- ]?\d{4}|as of the \d{4}|\bcurrently\b/i;

const rows = await selectAll("routes", "id,name,road,access", "id=like.wa_*", { pageSize: 1000 });
if (!rows.length) { console.error("empty read — refusing to report"); process.exit(1); }

const ORDER = /\b(\d{2}-\d{2}-\d{2}-\d{4}-\d{2}|\d{2}-\d{2}-\d{2}-\d{2})\b/;
const MP = /\b(?:milepost|mile ?post|\bMP)\.?\s*(\d{1,3}(?:\.\d)?)/i;
const STOP = new Set(["road","rd","the","and","from","via","to","at","trailhead","th","access","park","national",
  "forest","service","fs","fr","nf","hwy","highway","route","sr","us","county","main","north","south","east","west",
  "upper","lower","river","creek","lake","pass","area","campground","entrance","off","mile","milepost","closed","closure"]);
const rtoks = x => [...new Set([...String(x || "").toLowerCase().matchAll(/[a-z]{4,}/g)].map(m => m[0]).filter(t => !STOP.has(t)))];

const events = new Map();
let values = 0;
for (const r of rows) {
  const rd = r.road && typeof r.road === "object" ? r.road : {};
  const ac = r.access && typeof r.access === "object" ? r.access : {};
  const vals = [];
  for (const f of FIELDS) if (typeof rd[f] === "string") vals.push([`road.${f}`, rd[f]]);
  for (const f of ACC) if (typeof ac[f] === "string") vals.push([`access.${f}`, ac[f]]);
  for (const [field, v] of vals) {
    if (!SHELF.test(v)) continue;
    values++;
    const ord = ORDER.exec(v), mp = MP.exec(v);
    const toks = rtoks(rd.name).length ? rtoks(rd.name) : rtoks(v);
    const key = ord ? `order:${ord[1]}`
      : mp && toks.length ? `road:${toks[0]}|mp:${mp[1]}`
      : toks.length ? `road:${toks[0]}` : "unkeyed";
    const strength = ord ? "ORDER" : (mp && toks.length) ? "road+mp" : toks.length ? "road only" : "unkeyed";
    if (!events.has(key)) events.set(key, { key, strength, routes: new Set(), samples: [] });
    const e = events.get(key);
    e.routes.add(r.id);
    if (e.samples.length < 2) e.samples.push({ id: r.id, field, v: v.slice(0, 170) });
  }
}

const list = [...events.values()].sort((a, b) => b.routes.size - a.routes.size);
console.log(`${values} shelf-life value(s) across ${new Set([...events.values()].flatMap(e => [...e.routes])).size} route(s)`);
console.log(`grouped into ${list.length} closure event(s)\n`);
console.log(`${list.filter(e => e.strength === "ORDER").length} keyed by FOREST ORDER NUMBER (exact — search for this, never the road name)`);
console.log(`${list.filter(e => e.strength === "road+mp").length} keyed by road + milepost · ${list.filter(e => e.strength === "road only").length} by road alone · ${list.filter(e => e.strength === "unkeyed").length} unkeyed\n`);
console.log("WORKLIST — most routes unblocked first:\n");
for (const e of list.slice(0, 18)) {
  console.log(`${String(e.routes.size).padStart(3)} route(s)  [${e.strength}]  ${e.key}`);
  for (const s of e.samples) console.log(`            ${s.id} ${s.field}: ${s.v}`);
  console.log("");
}
const top = list.slice(0, 10).reduce((n, e) => n + e.routes.size, 0);
console.log(`The top 10 events cover ${top} of the affected routes — research once each, apply to every row citing them.`);
