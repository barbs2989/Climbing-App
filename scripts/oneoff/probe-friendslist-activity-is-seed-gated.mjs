// A REAL FRIEND MUST NOT INHERIT A SEED CLIMBER'S HISTORY — asserted on RAW source, because the
// guard that owns this rule cannot see the code.
//
// `check:seed-history` blanks comments and strings in one stateful pass and then scans. That
// blanker treats EVERY quote as a string delimiter, and JSX body text is full of apostrophes
// ("don't"), so it desynchronises and wipes real code:
//
//     ClimbMatchCore.jsx   41.4% of the file wiped   54 of 283 `function NAME` declarations GONE
//     RouteDetail.jsx      46.2% wiped               33 of 129 GONE
//
// Those 54 are at COLUMN 0 (GearTiers, CatchLedger, EmergencyRescueCard, SpeedProfile), and a
// declaration at column 0 cannot be inside a string or a comment. FriendsList is in the wiped
// region, which is why this defect survived the gate built for it: a green run there is a
// statement about two thirds of the app.
//
// So this reads RAW source. Nothing here is blanked, so nothing here can be silently skipped --
// and a comment that merely MENTIONS the pattern is handled by requiring the exact code form
// rather than a keyword.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
let bad = 0;
const ok = (m) => console.log("  ok   " + m);
const fail = (m) => { bad++; console.log("  FAIL " + m); };

const core = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");

console.log("\n1. both halves of FriendsList's activity feed carry the gate\n");

const SITES = [
  ["the FILTER — which rows are shown at all",
    "friends.some(function(c){return c.name===x.a.user&&seedIdentity(c);})"],
  // The worse half, and the one the hand-fix missed on Home: `fr` drives Kudos, Message and VOUCH,
  // so an ungated match lets a real connection be vouched for off somebody else's climb.
  ["the RESOLVER — `fr`, which drives Kudos / Message / Vouch",
    "var fr=friends.find(function(c){return c.name===x.a.user&&seedIdentity(c);});"],
];
for (const [what, needle] of SITES) {
  const n = core.split(needle).length - 1;
  if (n === 1) ok(what);
  else if (n === 0) fail(`[gate] ${what} — NOT gated on seedIdentity (or reworded; re-anchor)`);
  else fail(`[gate] ${what} — matched ${n} times, so this assertion is about an unknown site`);
}

console.log("\n2. ...and the UNGATED form is gone entirely\n");

// Counting the ungated form directly is what makes this independent of the gate's spelling: a
// rewrite that drops the gate reintroduces exactly this string.
const UNGATED = [
  "friends.some(function(c){return c.name===x.a.user;})",
  "var fr=friends.find(function(c){return c.name===x.a.user;});",
];
for (const u of UNGATED) {
  const n = core.split(u).length - 1;
  if (n === 0) ok(`no ungated \`${u.slice(0, 44)}…\``);
  else fail(`[gate] the ungated form is back (${n}): ${u}`);
}

console.log("\n3. the gate itself still exists and is the shared one\n");

if (/const seedIdentity\s*=/.test(core)) ok("seedIdentity is still the one exported predicate");
else fail("[gate] seedIdentity is gone — the shared identity gate no longer exists");

// Non-vacuity: the seed data this protects must still be there, or every assertion above is a
// claim about an empty catalog.
const authors = (core.match(/user:\s*"/g) || []).length;
if (authors >= 10) ok(`${authors} seed activity rows still carry an author name — the collision is real`);
else fail(`[gate] only ${authors} seed activity authors found; the fixture this protects has gone`);

console.log("");
if (bad) { console.log(`${bad} assertion(s) failed.`); process.exit(1); }
console.log("ok — FriendsList attributes seed history only to seed identities.");
