// DOES check:gpx-caveats SEE THE CAVEAT LEAVING THE FILE?
//
// Its healthy output is a list of oks, which is also what a `<desc>` that quietly stopped being
// written produces — the file still downloads, still loads in Gaia, still has the right shape. The
// only thing missing is the sentence, and nothing on screen changes.
//
// Both directions, because a rule that only ever adds a disclaimer is satisfied by putting one on
// every file, and a false disclaimer on a genuine recording is how a real one stops being read.
//
// Each case proves its edit landed BY CHECKSUM, restores byte-identically, and is judged on its
// OWN failure text.
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const CORE = path.join(ROOT, "ClimbMatchCore.jsx");
const TRACK = path.join(ROOT, "lib", "track.js");
const sum = (f) => crypto.createHash("sha1").update(fs.readFileSync(f)).digest("hex");

const CASES = [
  { name: "no-track-desc", file: CORE, expect: "fail",
    why: "the track carries no description — the caveat stops at the browser, which is the whole defect",
    says: /FAIL\s+a sketched line exports with no <desc>/,
    from: "const trkDesc=notes.length?", to: "const trkDesc=false?" },

  { name: "no-metadata-desc", file: CORE, expect: "fail",
    why: "the file-level note goes, so a reader that shows only metadata sees nothing",
    says: /FAIL\s+the file carries no metadata description/,
    from: "const meta=(notes.length||wpNote)?", to: "const meta=false?" },

  { name: "notes-on-everything", file: CORE, expect: "fail",
    why: "a genuine recorded track gets a disclaimer too — a false warning on good data",
    says: /FAIL\s+a genuine recorded track is exported with a disclaimer/,
    from: "const notes=own?exportedTrackNotes(r,_d):[];",
    to: "const notes=own?exportedTrackNotes(r,_d):[];if(!notes.length)notes.push(\"Not a recorded GPS track.\");" },

  { name: "community-track-inherits", file: CORE, expect: "fail",
    why: "somebody else's recorded track inherits claims about the route's stored line",
    says: /FAIL\s+a climber's own recorded track inherits/,
    from: "const own=!(overridePts&&overridePts.length);", to: "const own=true;" },

  { name: "desc-before-name", file: CORE, expect: "fail",
    why: "GPX 1.1 is a sequence; desc before name is an invalid file some readers reject",
    says: /FAIL\s+inside <trk> the order is wrong/,
    from: "<trk><name>${trkName.replace(/[<>&]/g,\"\")}</name>${trkDesc}<trkseg>",
    to: "<trk>${trkDesc}<name>${trkName.replace(/[<>&]/g,\"\")}</name><trkseg>" },

  // ITS EFFECT IS UNOBSERVABLE, SO THE CASE TARGETS THE SOURCE ASSERTION. A first version deleted
  // the escaping and expected a malformed FILE — and the guard passed, because nothing reaching
  // <desc> contains an ampersand today (names are stripped upstream; every caveat is plain
  // English). The case came back MISSED and that is what exposed the vacuous assertion.
  { name: "desc-not-escaped", file: CORE, expect: "fail",
    why: "a description is written raw, so a future caveat containing & would make the file malformed",
    says: /FAIL\s+only \d+ of the two <desc> values are escaped/,
    from: "<desc>${esc([].concat(notes,wpNote?[wpNote]:[]).join(\" \"))}</desc>",
    to: "<desc>${[].concat(notes,wpNote?[wpNote]:[]).join(\" \")}</desc>" },

  // MUST STAY SILENT. The notes are composed in lib/track.js and the file only carries them, so
  // reordering the composition changes nothing a reader can see — and a guard that fired on it
  // would be pinning an implementation detail rather than the promise.
  { name: "reordered-composition", file: TRACK, expect: "pass",
    why: "composing the notes in a different order is not a change to what the file says",
    from: "  if (trackIsJustTheWaypoints(r.gpxPts, r.waypoints)) notes.push(WAYPOINT_LINE_CAVEAT);\n  const stub = trackStubCaveat(r.gpxPts, r.waypoints, fmt);\n  if (stub) notes.push(stub);",
    to: "  const stub = trackStubCaveat(r.gpxPts, r.waypoints, fmt);\n  if (stub) notes.push(stub);\n  if (trackIsJustTheWaypoints(r.gpxPts, r.waypoints)) notes.push(WAYPOINT_LINE_CAVEAT);" },
];

let pass = 0, fail = 0;
for (const c of CASES) {
  const before = fs.readFileSync(c.file, "utf8");
  const beforeSum = sum(c.file);
  if (before.split(c.from).length - 1 !== 1) {
    console.log(`  BROKEN CASE ${c.name}: anchor absent or not unique — the case tests nothing`);
    fail++; continue;
  }
  fs.writeFileSync(c.file, before.replace(c.from, c.to));
  if (sum(c.file) === beforeSum) {
    console.log(`  BROKEN CASE ${c.name}: edit did not change the file`);
    fs.writeFileSync(c.file, before); fail++; continue;
  }
  let out = "", code = 0;
  try {
    out = execFileSync("node", [path.join(ROOT, "scripts", "check-gpx-caveats.mjs")],
      { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) { code = e.status || 1; out = (e.stdout || "") + (e.stderr || ""); }
  fs.writeFileSync(c.file, before);
  if (sum(c.file) !== beforeSum) { console.log(`  FATAL ${c.name}: restore was not byte-identical`); process.exit(1); }

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
