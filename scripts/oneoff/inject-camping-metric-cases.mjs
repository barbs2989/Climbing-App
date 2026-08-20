// Injection harness for check:camping section 10 — the trailhead metrics.
//
// A guard that has never failed is a guard you believe you have. Each case edits RouteDetail.jsx,
// PROVES THE EDIT LANDED BY CHECKSUM before running the guard, then restores by checksum. That
// order matters and this repo has paid for it twice: an injection that silently does not apply
// reports "guard missed" when the guard is innocent.
//
// Judged on whether the SECTION 10 assertion fired, not on exit code alone — these edits also
// perturb other sections, and judging on exit code makes a correct run read as a catch.
import { execSync } from "child_process";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const FILE = path.join(ROOT, "RouteDetail.jsx");
const sum = (x) => crypto.createHash("sha1").update(x).digest("hex").slice(0, 10);
const original = fs.readFileSync(FILE, "utf8");
const ORIG = sum(original);

const CASES = [
  {
    name: "6. render the RAW gain instead of the 'below' wording",
    want: /below-trailhead|NEGATIVE number/i,
    edit: (s) => s.replace(
      'return head+(g!=null?(g>0?" above":" below"):" from")+" the trailhead";',
      'return head+(g!=null?" gain":" from")+" the trailhead";')
      .replace('const head=[d,g!=null?uElev(Math.abs(g)):null].filter(Boolean).join(" \\u00b7 ");',
               'const head=[d,g!=null?uElev(g):null].filter(Boolean).join(" \\u00b7 ");'),
  },
  {
    name: "7. DERIVE a distance from lat/lng for bivy sites (a chord posing as a trail)",
    want: /DISTANCE rendered for a bivy site/i,
    // The tempting bug, written the tempting way: a great-circle distance from the trailhead pin.
    edit: (s) => s.replace(
      "  return bivy.map(b=>({name:b&&b.name,elev:campElevFt(b),gainFt:gainOf(campElevFt(b)),distMi:null,",
      "  const _th=(Array.isArray(route.waypoints)?route.waypoints:[]).filter(w=>wpIs(w,\"Trailhead\"))[0];\n  const _chord=b=>{if(!b||b.lat==null||_th==null||_th.lat==null)return null;const dx=(Number(b.lng)-Number(_th.lng))*46,dy=(Number(b.lat)-Number(_th.lat))*69;return Math.sqrt(dx*dx+dy*dy);};\n  return bivy.map(b=>({name:b&&b.name,elev:campElevFt(b),gainFt:gainOf(campElevFt(b)),distMi:_chord(b),"),
  },
  {
    name: "8. trailheadFt() returns a CONSTANT instead of null (a gain with no anchor)",
    want: /gain rendered with no trailhead elevation/i,
    edit: (s) => s.replace(
      "  for(let i=0;i<ws.length;i++)if(wpIs(ws[i],\"Trailhead\"))return campElevFt(ws[i]);\n  return null;",
      "  for(let i=0;i<ws.length;i++)if(wpIs(ws[i],\"Trailhead\"))return campElevFt(ws[i]);\n  return 500;"),
  },
];

let pass = 0;
for (const c of CASES) {
  const edited = c.edit(original);
  const landed = sum(edited) !== ORIG;
  fs.writeFileSync(FILE, edited);
  let out = "";
  try { out = execSync("node scripts/check-camping-section.mjs", { cwd: ROOT, encoding: "utf8" }); }
  catch (e) { out = (e.stdout || "") + (e.stderr || ""); }
  finally {
    fs.writeFileSync(FILE, original);
    if (sum(fs.readFileSync(FILE, "utf8")) !== ORIG) { console.log("FATAL: RouteDetail.jsx was NOT restored"); process.exit(1); }
  }
  const fired = c.want.test(out);
  // An injection that never applied is not a missed catch — it is a broken case, and saying so
  // is the difference between fixing the harness and doubting a working guard.
  const verdict = !landed ? "BROKEN CASE (edit never landed)" : fired ? "caught" : "MISSED";
  if (landed && fired) pass++;
  console.log(`${verdict.padEnd(32)} ${c.name}`);
  if (landed && !fired) {
    const f = out.split("\n").filter((l) => /FAIL/.test(l)).slice(0, 3);
    console.log(`      guard said: ${f.length ? f.join(" | ") : "(no failures at all — it went green on a broken app)"}`);
  }
}
console.log(`\n${pass}/${CASES.length} caught`);
process.exit(pass === CASES.length ? 0 : 1);
