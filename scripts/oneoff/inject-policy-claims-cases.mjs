// Is check:policy-claims measuring anything?
//
// Its healthy output is a column of "ok", which is exactly what a guard with a broken scan prints
// — and this one guards a LEGAL DOCUMENT, where a false green is worst. So each defect it claims
// to catch is put back, one at a time, and the guard has to fail with a message NAMING that
// defect. A run that dies for some other reason is not a catch; this repo has read one as the
// other twice before.
//
// Every case proves its edit LANDED by checksum before the guard is believed, and restores the
// file byte-identically afterwards. Do not commit while this runs: it edits app sources in place.
import fs from "fs";
import path from "path";
import crypto from "crypto";
import { execFileSync } from "child_process";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const sum = (p) => crypto.createHash("sha256").update(fs.readFileSync(path.join(ROOT, p))).digest("hex");

// The real pre-#1522 sentence, restored verbatim rather than approximated.
const OLD_S4 = `<li><h3>Location</h3><p>You control location sharing. “Approximate location only” shares your city rather than your exact spot.`;
const NEW_S4 = `<li><h3>Location</h3><p>Your profile carries the home area you type in`;

const CASES = [
  {
    name: "oldtext",
    why: "the real pre-#1522 §4 sentence, restored verbatim — a switch nobody has, plus float plans and search-and-rescue",
    file: "ClimbMatchCore.jsx",
    find: `["Location","Your profile carries the home area you type in — a city or region, not a coordinate. We do not record where you are: your device’s position is read only when you tap a map’s find-me control, to centre that map and mark you on it, and the corners of the map you are then looking at are sent to us to find the climbs in view. A GPS track is stored only when you attach one to a climb you log. Nothing runs in the background, and no feature reports your position to emergency services — the rescue numbers the app shows are a directory you call yourself."]`,
    repl: `["Location","You control location sharing. “Approximate location only” shares your city rather than your exact spot. Precise location, when enabled, powers nearby routes, weather, and — if you opt in — float plans and search-and-rescue."]`,
    expect: /You control location sharing/,
  },
  {
    name: "collect",
    why: "§1 goes back to promising the same absent enablement — the half a §4-only fix would have missed",
    file: "ClimbMatchCore.jsx",
    find: "climbing logs, optional emergency contacts, the home area you type in, and the basic technical data",
    repl: "climbing logs, optional emergency contacts, approximate or precise location when you enable it, and the basic technical data",
    expect: /location when you enable it/,
  },
  {
    name: "dropgps",
    why: "the GPS-track exception is dropped, so the policy claims location is never stored while climb_logs.gpx_track is written",
    file: "ClimbMatchCore.jsx",
    find: " A GPS track is stored only when you attach one to a climb you log.",
    repl: "",
    expect: /A GPS track is stored only when you attach one/,
  },
  {
    name: "versiondrift",
    why: "the rendered date is hardcoded, so shown and recorded drift — the invariant lib/policy.js states in a comment and nothing asserted",
    file: "ClimbMatchCore.jsx",
    find: "Last updated {policyVersionLabel(POLICY_VERSION)}.",
    repl: "Last updated August 19, 2026.",
    expect: /a reader cannot see which version they are being asked to accept/,
  },
  {
    name: "anchorlost",
    why: "LegalView is renamed — the guard must report a BROKEN scan, not a clean policy",
    file: "ClimbMatchCore.jsx",
    find: "function LegalView({kind,onBack})",
    repl: "function LegalViewRenamed({kind,onBack})",
    expect: /BROKEN|ANCHOR LOST/,
    wantExit: 2,
  },
  {
    // The ORIGINAL §3, restored verbatim. Note WHY it is still a defect: the name choice it
    // offers is real again (#1540 gave it a column), but "governed by your privacy settings"
    // still names the profile-visibility control, which IS still gated. Same sentence, different
    // half of it wrong -- which is exactly why the guard tests the clauses separately.
    name: "s3original",
    why: "§3 goes back to the original sentence, whose \"governed by your privacy settings\" still names a control the app withholds",
    file: "ClimbMatchCore.jsx",
    find: `["What others can see","Other climbers see your public profile — your username, or your real name if you choose to show it — along with the profile you fill in and the trust signals built from your climbing activity. Climbers you have connected with see the name on your account either way, in your friends list and crew rosters.`,
    repl: `["What others can see","Other climbers see your public profile as governed by your privacy settings — your username or real name, and the fields you choose to make visible.`,
    expect: /governed by your privacy settings/,
  },
  {
    // The LIMIT is the disclosure the original sentence never made, and dropping it is the
    // tempting "simplification" -- the policy would read cleanly and be quietly misleading.
    name: "s3limit",
    why: "§3 keeps the name choice but drops the limit, so it implies the switch governs every surface — FriendsList and CrewCard still show the account name either way",
    file: "ClimbMatchCore.jsx",
    find: ` Climbers you have connected with see the name on your account either way, in your friends list and crew rosters.`,
    repl: ``,
    // Match the guard's FAILURE message, not its ok() wording. The first version of this expected
    // "states the LIMIT of it", which is the text printed when the assertion PASSES -- so the case
    // reported MISSED while the guard was firing correctly, exit 1 and all. Reproduced in
    // isolation before changing anything, because "the guard missed" and "my expectation was
    // wrong" look identical from a red case.
    expect: /no longer says: "see the name on your account either way"/,
  },
  {
    // THE DEAD-BRANCH CASE. The first version of this guard paired promises to controls by fuzzy
    // name match, and 2 of 4 entries never connected -- they could not fire whatever the documents
    // said, which reads as coverage and is not. Renaming a gated control must now make the guard
    // report a BROKEN scan rather than quietly losing that promise.
    name: "staleentry",
    why: "a gated control is renamed, so a promise entry can no longer fire — the guard must say so instead of going silently dead",
    file: "ClimbMatch.jsx",
    find: `aria-label="Toggle online status"`,
    repl: `aria-label="Toggle my online status"`,
    expect: /can never fire|BROKEN/,
    wantExit: 2,
  },
  {
    name: "sheetclear",
    why: "the in-app sheet goes back to \"edit or clear anything\", which name, username and the avatar cannot honour",
    file: "ClimbMatch.jsx",
    find: `["Your control","You can edit your profile and settings at any time. Your name and username can be changed but not left blank, and your avatar is replaced rather than removed. To have data removed, use Settings → Your data."]`,
    repl: `["Your control","You can edit or clear anything from your profile and settings at any time."]`,
    expect: /edit or clear anything/,
  },
  {
    // The second branch: a rewrite that stops over-claiming but also stops saying anything is
    // the drift this assertion exists to catch, and it would pass a test that only looked for
    // the old sentence.
    name: "sheetvague",
    why: "the sheet's claim is softened into vagueness — no longer false, but it no longer says which fields cannot be cleared",
    file: "ClimbMatch.jsx",
    find: `You can edit your profile and settings at any time. Your name and username can be changed but not left blank, and your avatar is replaced rather than removed. To have data removed, use Settings → Your data.`,
    repl: `You can edit your profile and settings at any time.`,
    expect: /no longer states which fields cannot be cleared/,
  },
  {
    // Must stay SILENT: with the flag true the controls actually render, so a document describing
    // them is CORRECT. A guard that still fired here would forbid the fix.
    name: "flaglive",
    why: "PRIVACY_CONTROLS_LIVE=true makes the controls real, so describing them is no longer a false claim",
    file: "ClimbMatchCore.jsx",
    find: "const PRIVACY_CONTROLS_LIVE=false;",
    repl: "const PRIVACY_CONTROLS_LIVE=true;",
    mustPass: true,
  },
];

let failures = 0;
for (const c of CASES) {
  const p = path.join(ROOT, c.file);
  const before = fs.readFileSync(p, "utf8");
  const beforeSum = sum(c.file);
  const n = before.split(c.find).length - 1;
  if (n !== 1) {
    console.log(`\n${c.name}: HARNESS BUG — the anchor matched ${n} times in ${c.file}, so nothing was tested.`);
    failures++;
    continue;
  }
  fs.writeFileSync(p, before.replace(c.find, c.repl), "utf8");
  const landed = sum(c.file) !== beforeSum;

  let out = "", code = 0;
  try {
    out = execFileSync("node", [path.join(ROOT, "scripts/check-policy-claims.mjs")], { cwd: ROOT, encoding: "utf8" });
  } catch (e) {
    out = (e.stdout || "") + (e.stderr || "");
    code = e.status || 1;
  }
  fs.writeFileSync(p, before, "utf8");
  const restored = sum(c.file) === beforeSum;

  let verdict, good;
  if (c.mustPass) {
    good = code === 0;
    verdict = good ? "SILENT (correct)" : "FIRED — it should not have";
  } else {
    const named = c.expect.test(out);
    const wanted = c.wantExit || 1;
    good = code === wanted && named;
    verdict = good ? "CAUGHT" : "MISSED";
    if (!named) verdict += " (nothing matched " + c.expect + " — a failure for a different reason is not a catch)";
    if (code !== wanted) verdict += ` (exit ${code}, wanted ${wanted})`;
  }
  console.log(`\n${c.name}: ${verdict}   (edit landed: ${landed}, restored byte-identical: ${restored})`);
  console.log(`   ${c.why}`);
  if (!good || !landed || !restored) failures++;
}

console.log(`\n${failures ? `FAILED — ${failures} case(s)` : `ok — ${CASES.length}/${CASES.length}, the guard fires on every defect and stays silent on the one correct change`}`);
process.exit(failures ? 1 : 0);
