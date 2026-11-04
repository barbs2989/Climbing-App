#!/usr/bin/env node
// check:crew-place — a crew has ONE PLACE, a route or an area, and every surface that names a crew
// resolves it through crewPlace(), never by hand from crew.routeId.
//
// 0302 let a crew bind to an AREA (a crag session) instead of a route. Before it, ~25 readers each did
// their own `routeById(crew.routeId)` and printed `.name`: the card, the finder row, the chat header,
// the Inbox thread, the float-plan label, four Home rows, the profile modal, the past-crew list, the
// invite modal, the email invite. Every one of them would have printed "undefined" for an area crew —
// or, in CrewCard's case, declared the crew "no longer available" — and each would have been found by
// walking one more screen, which is how check:crew-member-readers' seven rounds (#569…#826) went.
// crewPlace() is the one resolver (ClimbMatchCore.jsx); this guard holds every reader on it.
//
// Rules, each a real failure mode:
//   1. The readers that NAME a crew import and call crewPlace (or App's placeOf wrapper). A file that
//      drops the import has gone back to resolving by hand.
//   2. No `routeById(<crew>.routeId)` outside an ALLOWLIST with a reason. The allowlisted sites are the
//      route-only ones by nature — "log this crew's route", "find partners for this crew's route" — and
//      each names what an area crew does there instead. A new site must be added here with its reason.
//   3. Both hydrations carry areaId + discipline (my crews) and _area/_areaMissing (open crews), and the
//      merge diff compares them — or a refetch would silently drop an area crew's place.
//   4. CrewCard renders a SKELETON while the area card loads and says "area" when it is gone; CrewFinder
//      drops an _areaMissing crew as it drops a _routeMissing one.
//
// Static, comment-stripped (a comment that names the rule must not satisfy it). In `npm run build`.
//
//   node scripts/check-crew-place.mjs

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readAppFile } from "./lib/guard-sources.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let bad = 0, ran = 0;
const ok = (m) => { ran++; console.log("  ok    " + m); };
const fail = (m) => { ran++; bad++; console.log("  FAIL  " + m); };
const dead = (m) => { console.log("  FAIL  " + m); console.log("\ncheck:crew-place proved nothing."); process.exit(1); };

const COMMENT_POS = new Set(["\n", " ", "\t", ";", "{", "}", "(", ")", ",", "="]);
function stripComments(src) {
  let out = "", i = 0, n = src.length;
  while (i < n) {
    const c = src[i], d = src[i + 1];
    const prev = i === 0 ? "\n" : src[i - 1];
    if (c === "/" && (d === "/" || d === "*") && !COMMENT_POS.has(prev)) { out += c; i++; continue; }
    if (c === "/" && d === "/") { while (i < n && src[i] !== "\n") { out += " "; i++; } continue; }
    if (c === "/" && d === "*") { const e = src.indexOf("*/", i + 2); const end = e < 0 ? n : e + 2; for (let k = i; k < end; k++) out += src[k] === "\n" ? "\n" : " "; i = end; continue; }
    out += c; i++;
  }
  return out;
}
const read = (rel) => { const p = path.join(ROOT, rel); if (!fs.existsSync(p)) dead(`${rel} is missing`); return stripComments((rel === "ClimbMatchCore.jsx" || rel === "ClimbMatch.jsx") ? readAppFile(p) : fs.readFileSync(p, "utf8")); };

const app = read("ClimbMatch.jsx"), core = read("ClimbMatchCore.jsx");
const libs = { "lib/CrewCard.jsx": read("lib/CrewCard.jsx"), "lib/CrewFinder.jsx": read("lib/CrewFinder.jsx"), "lib/Inbox.jsx": read("lib/Inbox.jsx"), "lib/FloatPlans.jsx": read("lib/FloatPlans.jsx"), "lib/PartnerSearch.jsx": read("lib/PartnerSearch.jsx") };
if (app.length < 100000 || core.length < 100000) dead("the app sources read short — a broken read, not a clean tree");

console.log("\ncheck:crew-place — a crew has one place; every reader resolves it through crewPlace()\n");

// ── rule 0: the resolver exists and handles both shapes ──
{
  const fn = core.match(/function crewPlace\(crew,o\)\{[\s\S]*?\n(?=\/\* The route-or-pseudo-route|const placeRouteLike)/);
  if (!fn) fail("ClimbMatchCore.jsx no longer defines function crewPlace(crew,o)");
  else {
    const b = fn[0];
    ((/crew\.areaId/.test(b) && /crew\.routeId/.test(b) && /kind:"area"/.test(b) && /kind:"route"/.test(b) && /kind:"missing"/.test(b) && /return crew\._areaMissing\?\{kind:"missing"\}:null/.test(b)) ? ok : fail)("crewPlace resolves BOTH shapes, answers null while an area card loads and \"missing\" once it is gone");
  }
  (/export \{[^}]*\bcrewPlace\b/.test(core) ? ok : fail)("core exports crewPlace");
}

// ── rule 1: every reader that names a crew goes through crewPlace / placeOf ──
for (const [f, src] of Object.entries(libs)) {
  const imports = /import \{[^}]*\bcrewPlace\b[^}]*\} from "\.\.\/ClimbMatchCore\.jsx"/.test(src);
  const viaProp = /\bplaceOf\b/.test(src);
  const calls = (src.match(/\bcrewPlace\(/g) || []).length + (src.match(/\bplaceOf\(/g) || []).length + (src.match(/\bpOf\(/g) || []).length;
  if ((imports || viaProp) && calls > 0) ok(`${f} resolves a crew's place through crewPlace()/placeOf (${calls} call(s))`);
  else fail(`${f} does not resolve crews through crewPlace()/placeOf — import:${imports} prop:${viaProp} calls:${calls}`);
}
(/const placeOf=function\(c\)\{return crewPlace\(c,\{routeById:routeById,areaById:areaCardById\}\);\};/.test(app) ? ok : fail)("App defines placeOf over routeById + the area-card lookup");
{ const n = (app.match(/\bplaceOf\(/g) || []).length; (n >= 18 ? ok : fail)(`App names crews through placeOf at ${n} site(s) (expected ≥ 18 — fewer means a reader went back to routeById(crew.routeId))`); }

// ── rule 2: no hand resolution of a crew's route outside the allowlist ──
// Each entry: the exact call text as it appears (comments stripped) and why an area crew is fine there.
const ALLOW = {
  "ClimbMatch.jsx": [
    ["setLogModal(routeById(cr.routeId))", "log THIS CREW'S CLIMB from the crew tab and the recap — a route-only action; an area crew logs its climbs from the Logbook (CrewCard hides its log button)"],
    ["setPartnerClimb(routeById(cr.routeId))", "Find partners for this crew's ROUTE — the area-crew form of this (find partners at the crag) lands with the Partners-tab area mode"],
    ["const r=routeById(ci.routeId)||{}", "a seed crew INVITE (crewReqIn), which is a route invite by shape"],
    ["const acceptCrewInvite=(ci)=>{const r=routeById(ci.routeId)", "accepting a seed crew INVITE (crewReqIn) builds a route crew from it — the seed shape has no area"],
    ["routeName:(routeById(ci.routeId)||{}).name||\"their crew\"", "the profile modal's seed crew INVITE (crewReqIn) — route by shape"],
    ["const r=routeById(c.routeId);const fn=c.friendName", "a belay CATCH, not a crew"],
  ],
  "lib/CrewFinder.jsx": [], "lib/CrewCard.jsx": [], "lib/Inbox.jsx": [], "lib/FloatPlans.jsx": [], "lib/PartnerSearch.jsx": [],
};
{
  const re = /routeById\(\(?(?:cr|c|cw|_lc|_cr|_c|oc|ec|ex|ci|crew)\.routeId\)?\)/g;
  const all = { "ClimbMatch.jsx": app, ...libs };
  let total = 0, allowed = 0;
  for (const [f, src] of Object.entries(all)) {
    let m;
    while ((m = re.exec(src))) {
      total++;
      const around = src.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40);
      const hit = (ALLOW[f] || []).find(([txt]) => around.includes(txt));
      if (hit) allowed++;
      else fail(`${f}: hand-resolves a crew's route — \`${around.replace(/\s+/g, " ").trim()}\` — resolve it through placeOf()/crewPlace(), or allowlist it here WITH the reason an area crew is fine there`);
    }
  }
  if (total === 0) fail("found ZERO routeById(<crew>.routeId) calls — the pattern broke, this rule proved nothing");
  else if (allowed === total) ok(`every hand resolution of a crew's route is allowlisted with a reason (${allowed})`);
  for (const [f, list] of Object.entries(ALLOW)) for (const [txt] of list) if (!(all[f] || "").includes(txt)) fail(`${f}: allowlist names \`${txt}\`, which no longer occurs — stale bookkeeping; remove it`);
}

// ── rule 3: hydration and merge carry the place ──
(/areaId:row\.area_id\|\|null,discipline:row\.discipline\|\|null,meetTime:row\.meet_time\|\|""\};/.test(app) ? ok : fail)("my-crews hydration carries areaId + discipline (before the meetTime marker check:crew slices on)");
(/areaId:r\.area_id\|\|null,discipline:r\.discipline\|\|null,_area:r\.area_id\?\(amap\[r\.area_id\]\|\|undefined\):undefined,_areaMissing:!!\(r\.area_id&&crewAreaCardsQ\.isSuccess&&!amap\[r\.area_id\]\)/.test(app) ? ok : fail)("open-crew rows carry areaId, discipline, _area and _areaMissing");
(/_routeMissing:!!\(r\.route_id&&_openCrewRoutesQ\.isSuccess&&!rmap\[r\.route_id\]\)/.test(app) ? ok : fail)("an area crew is never _routeMissing (the route read is gated on having a route)");
(/\(c\.areaId\|\|null\)===\(d\.areaId\|\|null\)&&\(c\.discipline\|\|null\)===\(d\.discipline\|\|null\)/.test(app) && /\{routeId:d\.routeId,areaId:d\.areaId,discipline:d\.discipline,/.test(app) ? ok : fail)("the refetch merge compares and copies areaId + discipline");
(/const _crewAreaIds=useMemo\(/.test(app) && /useAreaCardsByIds\(USE_DB\?_crewAreaIds:\[\]\)/.test(app) ? ok : fail)("App reads one area card per crew area (useAreaCardsByIds)");

// ── rule 4: the card and the finder handle the two new states ──
{
  const card = libs["lib/CrewCard.jsx"];
  (/if\(place===null\)return <div aria-busy="true"/.test(card) ? ok : fail)("CrewCard renders a skeleton (aria-busy) while the place is unresolved — never \"undefined\"");
  (/crew\.areaId\?"This crew’s area is no longer available":"This crew’s climb is no longer available"/.test(card) ? ok : fail)("CrewCard's missing copy names an AREA for an area crew");
  (/const tp=placeTrip\(place\)/.test(card) ? ok : fail)("CrewCard's steps come from the place's discipline (placeTrip), so a session is a Session");
  (/route\?<button onClick=\{\(\)=>onLog&&onLog\(route,crew,mem\)\}/.test(card) ? ok : fail)("CrewCard's log button needs a route (absent for an area crew, not a form with no climb)");
  const finder = libs["lib/CrewFinder.jsx"];
  (/filter\(oc=>!oc\._routeMissing&&!oc\._areaMissing\)/.test(finder) ? ok : fail)("CrewFinder drops an _areaMissing crew as it drops a _routeMissing one");
  (/const tp=placeTrip\(pl\)/.test(finder) && /placeSub\(pl\)/.test(finder) ? ok : fail)("CrewFinder's row is drawn from the place (placeTrip/placeSub), not from a route it may not have");
}

console.log(`\ncheck:crew-place: ${bad ? "FAILED — " + bad + " of " + ran : "ok — " + ran + " assertion(s)"}`);
process.exit(bad ? 1 : 0);
