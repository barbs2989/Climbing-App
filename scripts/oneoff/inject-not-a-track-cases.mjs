// DOES check:track-caveat SEE BOTH BRANCHES OF trackStubCaveat, AND ITS FLOOR?
//
// The function makes two claims about a line that is not a track — it spans almost nothing, or it
// has too few points to be a recording of anything — and both are one `if` away from silence. Its
// healthy output says nothing, which is also what a deleted branch produces.
//
// The FLOOR is tested as hard as the findings. Four is `trackCoverage`'s own floor and the vertex
// counts in this catalog run 2, 3, 4, 6, 7, 8, 10, 11 and then jump to 20 — so a widening reaches
// real routes immediately, and the argument for captioning an eight-point line is exactly the
// spacing argument the data does not support.
//
// Each case proves its edit landed BY CHECKSUM, restores byte-identically, and is judged on its OWN
// failure text: a case that fails for a different reason is not a catch.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const TRACK = path.join(ROOT, "lib", "track.js");
const sum = (f) => crypto.createHash("sha1").update(fs.readFileSync(f)).digest("hex");

const CASES = [
  { name: "drop-the-stub-branch", expect: "fail",
    why: "a 7 m placeholder goes back to being offered as the route's track",
    says: /FAIL\s+predicate: a 7 m line is not reported as a placeholder/,
    from: "  if (ext < TRACK_STUB_M)\n", to: "  if (false)\n" },

  { name: "drop-the-too-few-points-branch", expect: "fail",
    why: "a two-point chord across kilometres goes back to being offered as a recording",
    says: /FAIL\s+predicate: a two-point line across kilometres is not reported/,
    from: "  if (line.length < 4)\n", to: "  if (false)\n" },

  { name: "floor-widened-to-eight", expect: "fail",
    why: "captioning an eight-point line needs the spacing argument, which the data does not support",
    says: /FAIL\s+predicate: a four-point line is captioned/,
    from: "  if (line.length < 4)\n", to: "  if (line.length < 8)\n" },

  { name: "exclusivity-dropped", expect: "fail",
    why: "a waypoint join gets a second caption stacked on it — one problem told twice",
    says: /FAIL\s+predicate: (a stub caveat stacks|a two-point waypoint join is captioned twice)/,
    from: "  if (trackIsJustTheWaypoints(gpxPts, waypoints)) return null;\n  if (trackCoverage(gpxPts, waypoints)) return null;",
    to: "  if (trackCoverage(gpxPts, waypoints)) return null;" },

  // MUST STAY SILENT. The two branches describe different measurements, so writing the length test
  // the other way round is the same rule and a guard that flagged it would forbid a tidy-up.
  { name: "equivalent-rewrite", expect: "pass",
    why: "the same floor written the other way round is not a change",
    from: "  if (line.length < 4)\n", to: "  if (!(line.length >= 4))\n" },
];

let pass = 0, fail = 0;
for (const c of CASES) {
  const before = fs.readFileSync(TRACK, "utf8");
  const beforeSum = sum(TRACK);
  if (before.split(c.from).length - 1 !== 1) {
    console.log(`  BROKEN CASE ${c.name}: anchor absent or not unique — the case tests nothing`);
    fail++; continue;
  }
  fs.writeFileSync(TRACK, before.replace(c.from, c.to));
  if (sum(TRACK) === beforeSum) {
    console.log(`  BROKEN CASE ${c.name}: edit did not change the file`);
    fs.writeFileSync(TRACK, before); fail++; continue;
  }
  let out = "", code = 0;
  try {
    out = execFileSync("node", [path.join(ROOT, "scripts", "check-track-caveat.mjs")],
      { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) { code = e.status || 1; out = (e.stdout || "") + (e.stderr || ""); }
  fs.writeFileSync(TRACK, before);
  if (sum(TRACK) !== beforeSum) { console.log(`  FATAL ${c.name}: restore was not byte-identical`); process.exit(1); }

  const fired = code !== 0;
  const saidIt = c.says ? c.says.test(out) : false;
  if (c.expect === "fail") {
    if (fired && saidIt) { console.log(`  CAUGHT  ${c.name} — ${c.why}`); pass++; }
    else if (fired) { console.log(`  WRONG FAILURE ${c.name}: it failed, but not with ${c.says}`); fail++; }
    else { console.log(`  MISSED  ${c.name} — ${c.why}`); fail++; }
  } else {
    if (!fired) { console.log(`  SILENT  ${c.name} — ${c.why}`); pass++; }
    else { console.log(`  FALSE ALARM ${c.name}: ${c.why}`); fail++; }
  }
}
console.log(`\n${pass}/${CASES.length} case(s) behaved; ${fail} did not.`);
process.exit(fail ? 1 : 0);
