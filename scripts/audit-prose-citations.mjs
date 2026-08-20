#!/usr/bin/env node
// Does the prose that renders on a route page still name a third party as the SOURCE of a claim?
//
// The standing rule is no sources anywhere in the app. `check:no-rendered-sources` enforces it for
// app FIELDS named `source` and is structurally blind to this: these citations are free prose
// inside jsonb columns, so every identifier is bound, every column is populated, and the section
// renders. Only reading the value finds them.
//
// The class was measured once for `waypoints[].note` (60 WA notes; 6 redacted, 54 still needing a
// rewrite) and NOBODY HAD EVER LOOKED AT `road.*` / `access.*` — the same defect, different
// columns, which is the shape this repo keeps repeating (four grade parsers, two climb_logs
// hydrations, three waypoint audits). That sweep found 33 and repaired 32.
//
// THE PRECISION RULE, and without it this audit is actively destructive: A LIVE REFERENCE IS NOT A
// CITATION. 585 values on 416 WA routes carry a land-manager alert page or a ranger-district phone
// number — `fs.usda.gov/…/alerts`, `nps.gov`, `(509) 548-2550`. Those are not claims about where
// our data came from; they are the live thing a climber is being told to go and check, and they are
// often the only actionable line in the value. Naming the AGENCY that issues a permit or closes a
// road is operational too. A pattern that flags "names a third party" reports all 585 and whoever
// works the list down deletes 585 phone numbers.
//
// Two exclusions, both MEASURED against real output rather than assumed, and both reported as stale
// if they stop matching:
//   - a source-like word inside a ROUTE NAME. `wa_nooksack_tower_south_face` says "Same access as
//     the East Ridge/Beckey Route" — a route name, not a citation. A bare /Beckey/ flagged it.
//   - an organisation named as an ACTOR. `wa_wolframite_mountain_scramble` names three associations
//     as the volunteers who MAINTAIN the Tungsten Mine site. That is content.
//
// And the honest limit, stated because a count here reads as a total and is not one: THIS IS A
// DENY-LIST AND ONE MORE NAME BEATS IT. The Lichtenberg fee prose cited `WenatcheeOutdoors`, which
// no pattern here matched; it was found by reading. Treat the number as a floor and re-scan with a
// different pattern before calling the class closed.
//
// REPORT-ONLY. The repair is a rewrite, not a deletion — the citation is usually welded into a
// sentence that also carries the road, the mileage or the fact, and sentence deletion writes
// gibberish onto route pages. Read-only, anon key, fails closed on an empty read. NOT a build gate:
// a property of the DB, not the checkout, so no code change can cause or fix it.
import { selectAll } from "./lib/supabase-env.mjs";

const args = process.argv.slice(2);
const flag = n => { const i = args.indexOf("--" + n); if (i >= 0 && args[i + 1] && !args[i + 1].startsWith("--")) return args[i + 1]; const eq = args.find(a => a.startsWith("--" + n + "=")); return eq ? eq.slice(n.length + 3) : null; };
const STATE = flag("state") || "wa";
const INJECT = flag("inject");
const FULL = args.includes("--full");

const ROAD_ACCESS = [["road", "status"], ["road", "seasonalGate"], ["road", "driveNote"], ["road", "name"],
                     ["access", "closures"], ["access", "seasonal"], ["access", "notes"], ["access", "rules"],
                     ["access", "closureNote"], ["access", "permit"], ["access", "fees"], ["access", "parking_pass"]];

// A named third-party publisher. `Beckey` needs a guide word beside it — on its own it is a route
// name here far more often than a citation.
const NAMED = /\bWTA\b|Washington Trails Association|AllTrails|SummitPost|Peakbagger|Mountain ?Project|Wikipedia|CalTopo|\bGaia\b|Mountaineers\.org|WenatcheeOutdoors|Beckey(?:'s)?\s+(?:guide|guidebook)|\bguidebooks?\b|trip[- ]report aggregator|OpenStreetMap|Google (?:Maps|Earth)/i;
// The act of sourcing, even when the publisher is unnamed.
// The act of sourcing, even when the publisher is unnamed. THE WORD "SOURCE" ON ITS OWN IS USELESS
// HERE: waypoint notes say "reliable water source" and "Source Lake" (a real place in the Alpental
// valley) — a broad /source/i returns 45 WA notes of which 44 are water and place names. A
// citation is a COUNTED or QUALIFIED plural ("multiple sources") or sources doing something
// ("sources describe"). That distinction takes the waypoint-note count from 45 to 1.
const ACT = /\bsourced (?:via|from)\b|\bper (?:WTA|AllTrails|SummitPost|Peakbagger|Wikipedia|Mountain ?Project|recent trip reports?|trip reports?)|\bcorroborated by\b|confirmed by (?:two|multiple|several|independent)|\b(?:multiple|several|various|numerous|independent|published|online|climbing|guidebook)\s+sources?\b|\bsources?\s+(?:describe|state|report|say|agree|list|indicate|confirm)\b|\breported by (?:WTA|AllTrails|trip)|\baccording to (?:WTA|AllTrails|SummitPost|Mountain ?Project)|\bverified via\b/i;
// Go and look at this yourself, now — operational, and it must never be swept.
const LIVE = /fs\.usda\.gov|nps\.gov|wsdot|weather\.gov|recreation\.gov|\(\d{3}\)\s*\d{3}-\d{4}/i;

// Flagged and deliberately not a citation. A stale entry fails.
const EXEMPT = [
  // "East Ridge/Beckey Route" needed an exemption until NAMED was tightened to require a guide word
  // beside the name; it is now excluded BY CONSTRUCTION and an entry here would report as stale.
  ["wa_wolframite_mountain_scramble", "access.rules", "three associations named as the volunteers who MAINTAIN the mine site — content, not a source"],
];

const rows = await selectAll("routes", "id,name,road,access,waypoints", `id=like.${STATE}_*`, { pageSize: 1000 });
if (!rows.length) { console.error(`FAIL — read 0 ${STATE} routes. Refusing to report a clean result about data this never saw.`); process.exit(1); }

const values = [];
for (const r of rows) {
  for (const [col, key] of ROAD_ACCESS) {
    const v = r[col] && typeof r[col] === "object" ? r[col][key] : null;
    if (typeof v === "string" && v.trim()) values.push({ id: r.id, field: `${col}.${key}`, kind: "road/access", text: v.replace(/\s+/g, " ").trim() });
  }
  if (Array.isArray(r.waypoints)) r.waypoints.forEach((w, i) => {
    if (w && typeof w.note === "string" && w.note.trim()) values.push({ id: r.id, field: `waypoints[${i}].note`, kind: "waypoint note", text: w.note.replace(/\s+/g, " ").trim() });
  });
}
if (!values.length) { console.error(`FAIL — ${rows.length} ${STATE} routes and 0 prose values. Every test below would be vacuous.`); process.exit(1); }

if (INJECT === "cite") { values[0].text = "The road is open to the trailhead, per SummitPost and several trip reports."; console.log(`[inject] a citation onto ${values[0].id} ${values[0].field}`); }
if (INJECT === "liveonly") { for (const v of values) v.text = "Call the Mt. Baker Ranger District at (360) 854-2553 and check fs.usda.gov/alerts before driving."; console.log("[inject] every value is a LIVE reference; the citation count must be 0 and the live count must be every value"); }

const exemptKeys = new Set(EXEMPT.map(e => e[0] + "\0" + e[1]));
const hitKeys = new Set();
const hits = [], live = [];
for (const v of values) {
  const cited = NAMED.test(v.text) || ACT.test(v.text);
  if (cited) hitKeys.add(v.id + "\0" + v.field);
  if (cited && !exemptKeys.has(v.id + "\0" + v.field)) hits.push(v);
  else if (!cited && LIVE.test(v.text)) live.push(v);
}
const stale = EXEMPT.filter(e => !hitKeys.has(e[0] + "\0" + e[1]));

const group = k => hits.filter(h => h.kind === k);
console.log(`${rows.length} ${STATE} routes; ${values.length} prose values (${values.filter(v => v.kind === "road/access").length} road/access, ${values.filter(v => v.kind === "waypoint note").length} waypoint notes).`);
console.log(`${hits.length} value(s) on ${new Set(hits.map(h => h.id)).size} route(s) name a third party as the source of a claim.`);
console.log(`${live.length} value(s) on ${new Set(live.map(h => h.id)).size} route(s) carry a LIVE land-manager reference — operational, and NOT a finding.`);
console.log(`${EXEMPT.length} exempt, ${stale.length} stale.\n`);

for (const kind of ["road/access", "waypoint note"]) {
  const g = group(kind);
  console.log(`── ${kind.toUpperCase()}: ${g.length} value(s) on ${new Set(g.map(h => h.id)).size} route(s)`);
  const show = FULL ? g : g.slice(0, 10);
  for (const h of show) {
    const m = h.text.match(new RegExp("[^.;]*(?:" + NAMED.source + "|" + ACT.source + ")[^.;]*", "i"));
    console.log(`   ${h.id}  ${h.field}\n      …${(m ? m[0] : h.text).trim().slice(0, FULL ? 300 : 165)}…`);
  }
  if (!FULL && g.length > show.length) console.log(`   … ${g.length - show.length} more (pass --full)`);
  console.log("");
}

if (stale.length) {
  console.error("STALE exemptions — these no longer match anything, so the list is describing prose that is gone:");
  for (const [id, field, why] of stale) console.error(`   ${id} ${field} — ${why}`);
  process.exitCode = 1;
} else {
  if (hits.length) {
    console.log("The repair is a REWRITE, not a deletion: the citation is usually welded into a sentence");
    console.log("that also carries the road, the mileage or the fact. And this is a deny-list — one more");
    console.log("publisher name defeats it, so read the value rather than trusting the count.");
  }
  process.exitCode = 0;
}

// Injection-tested:
//   --inject=cite      a citation onto the first value -> must be reported
//   --inject=liveonly  every value a phone number + a land-manager URL -> citations 0, live = all.
//                      This is the precision rule: the destructive failure of this audit is
//                      reporting the 589 operational references as findings. It exits 1, correctly:
//                      overwriting every value also makes the exemption stale, and stale bookkeeping
//                      is a failure whatever caused it. Read the citation count, not the exit code.
