// check:crew-gear — the crew's "what to bring" must work on a REAL route, and must not
// invent a priority ranking the data does not contain.
//
// The bug: CrewCard rendered its gear section only when `route.gearTiers` existed. That is
// carried by 14 hand-seeded routes and by a climber's own contribution — `dbRouteToCamel` does
// not map it, and no enrichment JSON writes it. So "What to bring · coordinate as a crew", the
// entire who's-bringing-what feature, appeared on the demo and on NO real Washington route.
// Every layer reviewed as finished: the component existed, the props were wired, the seed
// route rendered it. Only the data said otherwise.
//
// The second rule is the honest one. `Required`/`Recommended`/`Optional` is a real ranking on a
// seed route and on a contribution; the DB carries a rack, not a priority order. Painting a
// derived list red as REQUIRED would be a safety-adjacent claim nothing in the row supports —
// the fabrication class this repo keeps stamping out. Derived gear renders as neutral groups.
//
// lib/rack.js imports nothing, so it is imported directly rather than brace-extracted: the
// functions under test are the ones that ship.
import { readFileSync } from "node:fs";
import { crewGearFor, routeRackFor, DISC_RACK } from "../lib/rack.js";

const ROOT = new URL("..", import.meta.url);
const CORE = readFileSync(new URL("ClimbMatchCore.jsx", ROOT), "utf8");

if (CORE.length < 100000) {
  console.error("check:crew-gear FAILED — ClimbMatchCore.jsx looks truncated; nothing was verified.");
  process.exit(1);
}

const failures = [];
const check = (name, cond, detail) => {
  if (!cond) failures.push(name + (detail ? " — " + detail : ""));
  console.log(`  ${cond ? "ok  " : "FAIL"}  ${name}`);
};
const labels = g => ((g && g.groups) || []).map(x => x[0]);
const items = g => ((g && g.groups) || []).flatMap(x => x[1]);

// ── 1. a route that HAS real tiers keeps them, untouched ─────────────────────
{
  const tiers = { required: ["Cams to #3"], recommended: ["Nuts"], optional: ["Tricams"] };
  const g = crewGearFor({ gearTiers: tiers }, "trad");
  check("a route with real tiers returns them unchanged", g === tiers);
}

// ── 2. a DB-shaped route gets gear, and NO invented tiers ────────────────────
{
  const g = crewGearFor({ detailedRack: "Single rack to #3. Eight draws." }, "trad");
  check("a DB route with detailedRack produces gear", !!g, "this is the demo-only bug");
  check("...as neutral groups", labels(g).includes("On the rack"), labels(g).join(" | "));
  check("...and never invents required/recommended/optional",
    !g.required && !g.recommended && !g.optional,
    "a derived rack must not be painted as a priority ranking");
  check("...with the prose split into items", items(g).length === 2, JSON.stringify(items(g)));
}
{
  const g = crewGearFor({ proNeeds: "Rack to 4 inches" }, "trad");
  check("proNeeds also produces a rack", labels(g).includes("On the rack") && items(g).length === 1);
}

// ── 3. essentials are their own group ────────────────────────────────────────
{
  const g = crewGearFor({ whatToBring: ["Helmet", "Headlamp"] }, "alpine");
  check("whatToBring becomes Essentials", labels(g).includes("Essentials"));
  check("...and does not drag in the generic table",
    !labels(g).some(l => /typical/i.test(l)), labels(g).join(" | "));
}

// ── 4. the generic fallback is a LAST resort, and says what it is ────────────
{
  const own = crewGearFor({ detailedRack: "Single rack to #3." }, "trad");
  check("a route with its own rack gets NO stock list stapled under it",
    !labels(own).some(l => /typical/i.test(l)), labels(own).join(" | "));
  const bare = crewGearFor({}, "trad");
  check("a route with nothing falls back to the per-discipline rack", !!bare && items(bare).length > 0);
  const lbl = labels(bare)[0] || "";
  check("...labelled 'typical'", /typical/i.test(lbl), lbl);
  check("...and explicitly NOT this route's own", /not this route/i.test(lbl), lbl);
  check("...drawn from DISC_RACK, not invented", items(bare).join("|") === DISC_RACK.trad.join("|"));
}
{
  check("an unknown discipline yields nothing rather than a wrong rack", crewGearFor({}, "zzz") === null);
  check("no route at all yields nothing", crewGearFor(null, "trad") === null);
}

// ── 4b. `rack` is read, not ignored ─────────────────────────────
// routeRackFor used to stop at proNeeds, so a route whose rack lived in the `rack` column fell
// through to the generic per-discipline table and was shown a stock list while its own rack sat
// in the row — the descent_text shape (populated, rendered nowhere). Found on wa_west_face, and
// measured as exactly ONE route in the WA alpine scope at the time; `rack` is populated on 419
// WA routes overall, so "populated but unreadable" would keep recurring as enrichment fills it.
{
  const WF = { rack: ["Cams, single set 0.4-3\"", "Nuts, small-to-mid set", "8 alpine quickdraws", "Double 60m x 9mm ropes"] };
  const r = routeRackFor(WF);
  check("a rack stored in `rack` is readable at all", Array.isArray(r) && r.length === 4, JSON.stringify(r));
  check("...returned verbatim, not paraphrased", !!r && r[0] === WF.rack[0] && r[3] === WF.rack[3]);
  const g = crewGearFor(WF, "alpine");
  check("...and the crew box calls it the route's OWN rack", !!g && labels(g).includes("On the rack"), labels(g).join(" | "));
  check("...never the stock list", !!g && !labels(g).some(l => /typical/i.test(l)), labels(g).join(" | "));
  // Precedence UNCHANGED — this may only turn a generic fallback into a real rack, never the reverse.
  check("detailedRack still outranks rack",
    JSON.stringify(routeRackFor({ detailedRack: "Single rack to #3.", rack: ["MUST NOT APPEAR"] })) === JSON.stringify(["Single rack to #3."]));
  check("proNeeds still outranks rack",
    JSON.stringify(routeRackFor({ proNeeds: "Rack to 4 inches", rack: ["MUST NOT APPEAR"] })) === JSON.stringify(["Rack to 4 inches"]));
  check("an accepted correction still outranks all of them",
    (routeRackFor({ _contribFields: ["rack"], gearTiers: { required: ["Corrected"] }, detailedRack: "old", rack: ["older"] }) || [])[0] === "Corrected");
  check("an empty rack array is not a rack", routeRackFor({ rack: [] }) === null);
  check("a blank string rack is not a rack", routeRackFor({ rack: "   " }) === null);
  check("a string rack is wrapped, not spread into characters",
    JSON.stringify(routeRackFor({ rack: "Light alpine rack" })) === JSON.stringify(["Light alpine rack"]));
}

// ── 5. a climber's correction still out-votes enrichment ─────────────────────
// crewGearFor returns gearTiers wholesale, so the corrected rack reaches the crew card the
// same way it reaches the RACK box. Pinned because the crew card is a THIRD reader of the
// rivalry check:correction-readers guards, and this is where it would silently diverge.
{
  const corrected = { _contribFields: ["rack"], gearTiers: { required: ["Doubles to #4 — corrected"] }, detailedRack: "Single rack to #3." };
  check("routeRackFor prefers the climbers' correction", (routeRackFor(corrected) || [])[0] === "Doubles to #4 — corrected");
  const g = crewGearFor(corrected, "trad");
  check("the crew card shows the corrected rack, not the superseded one",
    JSON.stringify(g).includes("corrected") && !JSON.stringify(g).includes("Single rack to #3"));
}

// ── 6. the structural half: the render must not gate on gearTiers again ──────
const cardStart = CORE.indexOf("function CrewCard(");
if (cardStart < 0) {
  console.error("check:crew-gear FAILED — ANCHOR LOST: CrewCard is gone from ClimbMatchCore.jsx.");
  process.exit(1);
}
const cardEnd = CORE.indexOf("\nfunction ", cardStart + 1);
const card = CORE.slice(cardStart, cardEnd < 0 ? CORE.length : cardEnd);
// Comments are stripped: CrewCard now EXPLAINS this bug in prose that names `route.gearTiers`,
// so a scan reading comments would fail on the explanation of the fix. The trap
// check:ci-cancel and check:correction-readers both record.
const cardCode = card.replace(/\/\*[\s\S]*?\*\//g, "");
check("CrewCard no longer gates its gear section on route.gearTiers",
  !/route\.gearTiers/.test(cardCode),
  "that gate is what made the feature demo-only");
check("CrewCard derives its gear through crewGearFor", /crewGearFor\s*\(/.test(cardCode));

// GearTiers has to be able to draw them, or the groups go nowhere.
const gtStart = CORE.indexOf("function GearTiers(");
const gtEnd = CORE.indexOf("\nfunction ", gtStart + 1);
const gt = CORE.slice(gtStart, gtEnd < 0 ? CORE.length : gtEnd).replace(/\/\*[\s\S]*?\*\//g, "");
check("GearTiers renders gear.groups", /gear\s*&&\s*gear\.groups/.test(gt) || /gear\.groups/.test(gt));
check("GearTiers still renders the real tiers too", /gear\.required/.test(gt) && /gear\.recommended/.test(gt));
// "Required but unclaimed" is keyed on `required` only, which is right: a neutral group makes
// no claim about necessity, so it must not produce that warning.
check("the unclaimed-required nudge reads only the real Required tier",
  /unclaimedReq\s*=[^;]*gear\.required/.test(gt));

if (failures.length) {
  console.error(`\ncheck:crew-gear FAILED — ${failures.length} problem(s):`);
  failures.forEach(f => console.error("  - " + f));
  process.exit(1);
}
console.log("\ncheck:crew-gear: ok — the crew's gear list reaches a real route, and nothing invents a priority it does not have.");
