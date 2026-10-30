// Injection-test check:crew-place — prove each rule can FAIL, and prove the edit landed before
// believing what the guard says about it.
import fs from "fs";
import { execSync } from "child_process";

const F = { app: "ClimbMatch.jsx", me: "src/components/MeTab.tsx", core: "ClimbMatchCore.jsx", card: "lib/CrewCard.jsx", finder: "lib/CrewFinder.jsx", inbox: "lib/Inbox.jsx", guard: "scripts/check-crew-place.mjs" };
const orig = Object.fromEntries(Object.entries(F).map(([k, f]) => [k, fs.readFileSync(f, "utf8")]));

const CASES = [
  { name: "1. a Home row goes back to routeById(c.routeId)", file: "app", expect: "hand-resolves a crew's route",
    edit: (s) => s.replace("unreadCrews.forEach(function(c){var rt=placeOf(c);", "unreadCrews.forEach(function(c){var rt=routeById(c.routeId);") },
  { name: "2. the Inbox thread resolves by hand again", file: "inbox", expect: "lib/Inbox.jsx does not resolve crews",
    edit: (s) => s.replace("const r=(placeOf?placeOf(cr):crewPlace(cr,{}))||{};", "const r={};") },
  { name: "3. the my-crews hydration drops discipline", file: "app", expect: "my-crews hydration carries areaId + discipline",
    edit: (s) => s.replace("areaId:row.area_id||null,discipline:row.discipline||null,meetTime:row.meet_time", "areaId:row.area_id||null,meetTime:row.meet_time") },
  { name: "4. the refetch merge stops comparing areaId", file: "app", expect: "the refetch merge compares and copies",
    edit: (s) => s.replace("&&(c.areaId||null)===(d.areaId||null)&&", "&&") },
  { name: "5. CrewCard renders nothing while the area card loads", file: "card", expect: "CrewCard renders a skeleton",
    edit: (s) => s.replace('if(place===null)return <div aria-busy="true"', 'if(place===null)return <div') },
  { name: "6. CrewFinder keeps an _areaMissing crew in the pool", file: "finder", expect: "CrewFinder drops an _areaMissing crew",
    edit: (s) => s.replace("filter(oc=>!oc._routeMissing&&!oc._areaMissing)", "filter(oc=>!oc._routeMissing)") },
  { name: "7. crewPlace stops answering null while an area card loads", file: "core", expect: "crewPlace resolves BOTH shapes",
    edit: (s) => s.replace("if(a===undefined)return crew._areaMissing?{kind:\"missing\"}:null;", "if(a===undefined)return {kind:\"missing\"};") },
  { name: "8. a stale allowlist entry (its text gone)", file: "me", expect: "stale bookkeeping",
    edit: (s) => s.replace("const r=routeById(c.routeId);const fn=c.friendName", "const r=routeById(c.routeId);const fn0=c.friendName") },
];

let pass = 0;
for (const c of CASES) {
  const file = F[c.file], before = orig[c.file], next = c.edit(before);
  if (next === before) { console.log("SKIP (edit did not land):", c.name); continue; }
  fs.writeFileSync(file, next);
  let out = "";
  try { out = execSync("node scripts/check-crew-place.mjs 2>&1", { encoding: "utf8" }); }
  catch (e) { out = String(e.stdout || "") + String(e.stderr || ""); }
  fs.writeFileSync(file, before);
  const line = out.split("\n").find((l) => /^\s*FAIL/.test(l) && l.includes(c.expect)) || "(no failing line names it)";
  const caught = /^\s*FAIL/.test(line);
  console.log((caught ? "CAUGHT  " : "MISSED  ") + c.name + "\n        " + line.trim().slice(0, 160));
  if (caught) pass++;
}
for (const [k, f] of Object.entries(F)) fs.writeFileSync(f, orig[k]);
console.log("\n" + pass + "/" + CASES.length + " injections caught");
process.exit(pass === CASES.length ? 0 : 1);
