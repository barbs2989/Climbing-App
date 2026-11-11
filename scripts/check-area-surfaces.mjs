// check:area-surfaces — the things a climber can do with an AREA must stay wired.
//
// WHY THIS EXISTS, and it is the same argument check:correction-readers records. Both surfaces
// shipped guarded only by a `scripts/oneoff/` probe, and NOTHING RUNS THOSE — that is precisely how
// `descentText` and `rack` each shipped a SECOND regression after the rule was written down. A
// comment cannot fail a build.
//
// Neither invariant is visible to any existing gate. `check:refs` sees bound identifiers and every
// identifier here is bound; `check:dead-props` sees props, and both are prop-less JSX; nothing else
// asks whether a value reaches a query or a gate reaches a render.
//
// Static — no browser, no DB — so it sits in `npm run build`.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { appSources, readAppFile } from "./lib/guard-sources.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const GUARD = "check:area-surfaces";
appSources(ROOT, GUARD);

const browser = readAppFile(path.join(ROOT, "lib/DbAreaBrowser.jsx"));
const problems = [];
const ok = (m) => console.log(`  ok    ${m}`);

// Fail closed before any rule: a file that stopped parsing to something recognisable would make
// every check below vacuous, and "no findings" is what this prints when it is working.
if (browser.length < 20000) {
  console.error(`\n${GUARD} FAILED — sources look truncated (DbAreaBrowser ${browser.length}).`);
  console.error("Nothing below was actually checked.\n");
  process.exit(1);
}

// (Area comments were section 1 here until 2026-11-11, when the owner removed the area Discussion:
// area pages carry no comment thread, so there is nothing left to keep wired.)

// ---------------------------------------------------------------------------------------
// 1. DIRECTIONS TO AN AREA — present, and gated to somewhere you can actually park.
//
// Every area carries a coordinate, so an ungated link offers directions to a STATE CENTROID. That
// is not hypothetical: the first passing run of the probe printed "Directions to Colorado".
// ---------------------------------------------------------------------------------------
if (!/maps\/dir/.test(browser)) {
  problems.push("the area Directions link is gone from lib/DbAreaBrowser.jsx — a climber cannot navigate to a crag again (RouteDetail's links are trailhead-level, a different question).");
} else {
  ok("the area page offers directions");
  // Since 2026-10-15 the drive links live in AreaGettingThere (the GETTING THERE card), and the
  // gate is on its MOUNT — so the test is that the mount is written `["crag","peak","wall"].includes(area.area_type) ? <AreaGettingThere`.
  // The older shape (gate within 120 chars of the href) is accepted too, so the card can move.
  const gated = /\[\s*"crag",\s*"peak",\s*"wall"\s*\]\.includes\(area\.area_type\)\s*\?\s*<AreaGettingThere/.test(browser)
    || /\[\s*"crag",\s*"peak",\s*"wall"\s*\]\.includes\(area\.area_type\)[\s\S]{0,120}maps\/dir/.test(browser);
  if (!gated) {
    problems.push('the Directions link is no longer gated on area_type in ["crag","peak","wall"] — every area has a coordinate, so this offers to route a climber to a state or country centroid.');
  } else {
    ok("directions are limited to crag/peak/wall");
  }
  if (!/coords_approx[\s\S]{0,200}Directions link are rough/.test(browser)) {
    problems.push("the coords_approx caveat no longer mentions the Directions link — an approximate coordinate would be offered as a navigable destination with no warning.");
  } else {
    ok("the approximate-coordinate caveat covers the directions link");
  }
}

// ---------------------------------------------------------------------------------------
// 2. PARTNERS HERE (0300) — the card that lets a climber LIST THEMSELVES at an area and see who is
// listed there, rendered from AreaPage, fed by the signed-in count read, and gated to the crag family's
// areas and their ancestors below the state: never a peak (matched by route), never a state.
// ---------------------------------------------------------------------------------------
if (!/function PartnersHereCard\(/.test(browser)) {
  problems.push("PartnersHereCard is gone from lib/DbAreaBrowser.jsx — a climber cannot list themselves at an area from the Climbs tab, which is the surface the 0300 decision named first.");
} else {
  ok("the area page defines PartnersHereCard");
  if (!/<PartnersHereCard\s/.test(browser)) problems.push("PartnersHereCard is defined but never rendered — AreaPage must draw it.");
  else ok("AreaPage renders PartnersHereCard");
  const gate = browser.match(/const PARTNER_CARD_TYPES\s*=\s*\[([^\]]+)\]/);
  const types = gate ? gate[1].split(",").map((s) => s.trim().replace(/^"|"$/g, "")) : null;
  if (!types) problems.push("PARTNER_CARD_TYPES is gone — the card would render on every area type, peaks and states included.");
  else if (types.includes("peak") || types.includes("state") || types.includes("country") || types.includes("world")) problems.push(`PARTNER_CARD_TYPES includes ${types.filter((t) => ["peak", "state", "country", "world"].includes(t)).join("/")} — a peak's climbing is matched by route and a state is too broad to list from its page.`);
  else if (!types.includes("crag")) problems.push("PARTNER_CARD_TYPES no longer includes crag — the one area type a crag climber actually stands at.");
  else ok(`the card is gated to [${types.join(", ")}]`);
  if (!/PARTNER_CARD_TYPES\.includes\(area\.area_type\)\s*\?\s*<PartnersHereCard/.test(browser)) problems.push("the PartnersHereCard render is not gated on PARTNER_CARD_TYPES.includes(area.area_type).");
  else ok("the render is gated on that list");
  if (!/usePartnerAreaCount\(area\.id/.test(browser) || !/usePartnersInArea\(area\.id/.test(browser)) problems.push("PartnersHereCard no longer reads the count and the rows for THIS area (usePartnerAreaCount / usePartnersInArea on area.id).");
  else ok("the card reads the count and the rows for the area on screen");
  if (!/savePartnerArea\(uid,\s*\{\s*areaId:\s*area\.id/.test(browser) || !/removePartnerArea\(uid,\s*area\.id\)/.test(browser)) problems.push("the one-tap List me here / Listed ✓ toggle no longer writes THIS area's listing (savePartnerArea / removePartnerArea on area.id).");
  else ok("List me here writes and removes this area's listing");
  if (!/Sign in to see who climbs here/.test(browser)) problems.push("the signed-out card no longer says to sign in — the count RPC refuses a signed-out caller, so the card would read as nobody listed.");
  else ok("signed out, the card asks for sign-in rather than claiming nobody is listed");
}

if (problems.length) {
  console.error(`\n${GUARD} FAILED — ${problems.length} problem(s):\n`);
  for (const p of problems) console.error("  - " + p);
  console.error("\nBoth surfaces were dead in production until 2026-08-27 — gated on the seed-only");
  console.error("`selArea`, which deploy.yml's VITE_USE_DB=true never sets. They are easy to lose");
  console.error("again precisely because losing them breaks nothing that any other guard can see.\n");
  process.exit(1);
}
console.log(`\n${GUARD}: ok — a climber can navigate to a crag and list themselves there.`);
