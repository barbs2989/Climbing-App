// "EDIT PROFILE" MUST NOT OPEN OVER A PROFILE IT COULD NOT READ, because saveEdit PATCHes that
// draft back unconditionally. Measured on the pre-fix tree: seven columns overwritten with empty
// values -- bio, location, disciplines, sport_grade, trad_grade, boulder_grade, avatar.
//
// THE CHAIN, every link verified in source rather than assumed:
//
//   1. lib/auth.js  getProfile returned `(await ...single()).data`, DISCARDING `error`, so a failed
//      read resolved to `null` -- indistinguishable from "this account has no profiles row yet".
//   2. ClimbMatch.jsx  the sign-in reset empties `profile` to bio:"", location:"", disciplines:[],
//      grades undefined. Its own comment says why: "Emptying the draft first makes the DB the only
//      source." For a real account that read is therefore the ONLY source of these values.
//   3. The hydration set `profileHydratedRef.current = true` BEFORE awaiting, did `if(!p) return`,
//      and ended `.catch(function(){})`. One transient failure at boot was permanent for the
//      session -- the "a failed read that makes itself permanent" shape of the verification
//      hydration, which check:verification-fallback exists for.
//   4. openEdit() was offered unconditionally from Settings and seeded the draft from ME.*.
//   5. saveEdit built its PATCH unconditionally from that draft.
//
// CLAUDE.md RECORDS THIS CLASS AS CLOSED AT ONE, and it is two. That census was measured "across
// all 45 write functions in lib/db.js"; getProfile and saveProfile live in lib/auth.js, so the
// second instance was outside the scope that was measured. The lesson is about the census, not the
// bug: a class is only closed over the files somebody actually looked at.
//
// WHY A BUILD GATE AND NOT A PROBE. The fix is a guard clause and a latch position. It changes no
// IDENTIFIER, so audit:silent-reverts cannot see a stale-base squash undoing it -- that audit says
// so in its own closing caveat, and check:verification-fallback was promoted out of scripts/oneoff/
// for exactly this reason. Static: no browser, no database, milliseconds.
//
// WHAT IT DOES NOT PROVE: that the toast is legible, or that a climber ever meets the refusal.
// It proves the read can report failure, that the failure is recorded, and that the refusal sits
// in front of the draft.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const app = fs.readFileSync(path.join(ROOT, "ClimbMatch.jsx"), "utf8");
const auth = fs.readFileSync(path.join(ROOT, "lib/auth.js"), "utf8");

let fail = 0;
const ok = (label, cond, detail) => {
  console.log(`${cond ? "  ok  " : "FAIL  "}${label}${cond || detail === undefined ? "" : `  -- ${detail}`}`);
  if (!cond) fail++;
};

/* Lift, never copy. A retyped copy of these expressions would agree with itself whatever the app
   does, which is the whole question being asked. */
function balanced(src, from, open, close) {
  let d = 0;
  for (let j = from; j < src.length; j++) {
    if (src[j] === open) d++;
    else if (src[j] === close) { d--; if (!d) return src.slice(from, j + 1); }
  }
  return null;
}
function anchor(src, needle, what) {
  const i = src.indexOf(needle);
  if (i < 0) {
    console.error(`ANCHOR LOST — ${what}.`);
    console.error("Two causes, opposite repairs. A deliberate refactor wants this guard re-anchored;");
    console.error("a stale-base squash wants the change restored. Separate them with:");
    console.error("    git log -S 'profileUnavailable' --oneline -- ClimbMatch.jsx");
    process.exit(1);
  }
  if (src.indexOf(needle, i + 1) >= 0) { console.error(`ANCHOR AMBIGUOUS — ${what} appears more than once.`); process.exit(1); }
  return i;
}

// ---- 1. the read can report failure, and still answers "no row" for a new account ---------------
console.log("— lib/auth.js: a failed read must not look like an absent row —");
const gStart = anchor(auth, "export const getProfile", "getProfile");
const gp = auth.slice(gStart, auth.indexOf("export const saveProfile"));
ok("getProfile throws on a read error", /throw\s+error/.test(gp),
  "it returns `.data` only, so a failed read and an absent row are both null");
ok("...but NOT on PGRST116, which is `.single()` reporting zero rows", /PGRST116/.test(gp),
  "throwing on an absent row would block a brand-new account from filling in its profile");

// ---- 2. the failure is recorded and the latch is released ---------------------------------------
console.log("\n— ClimbMatch.jsx: the failure has to survive the effect —");
const hyStart = anchor(app, "const profileHydratedRef=useRef(false)", "the profile hydration");
const hy = app.slice(hyStart, hyStart + 2200);
ok("the sign-in reset still empties bio/location (the premise)",
  /setProfile\(\{homeArea:"",[^)]*bio:"",location:""/.test(app),
  "if the reset stopped emptying these, re-derive this whole guard — the stake has changed");
ok("the latch is RELEASED on failure, so a transient error is not permanent",
  /catch\(function\(\)\{profileHydratedRef\.current=false/.test(hy),
  "the ref stays set, so the read is never retried for the rest of the session");
ok("the failure is recorded rather than swallowed", /setProfileReadFailed\(true\)/.test(hy),
  "`.catch(function(){})` — nothing downstream can tell the read failed");
ok("a later SUCCESS clears the flag", /setProfileReadFailed\(false\)/.test(hy),
  "once set the flag would never clear, and the editor would stay refused for the session");
ok("the flag is keyed on a real error, never on `!p`",
  /profileUnavailable=!!\(uid&&profileReadFailed\)/.test(app),
  "keying it on an empty result would block a brand-new account from ever editing");

// ---- 3. ORDER IS THE INVARIANT ------------------------------------------------------------------
console.log("\n— the refusal must come BEFORE the draft is built —");
const oeAt = anchor(app, "openEdit=()=>{", "openEdit");
const oe = balanced(app, app.indexOf("{", oeAt + "openEdit=()=>".length), "{", "}") || "";
const guardAt = oe.indexOf("profileUnavailable");
const draftAt = oe.indexOf("setEditDraft(");
ok("openEdit consults profileUnavailable at all", guardAt >= 0,
  "the entry point is ungated — this is the discriminator the class turns on");
ok("...and it does so BEFORE setEditDraft", guardAt >= 0 && draftAt > guardAt,
  "a guard placed after the draft is unreachable in exactly the case it exists for");
ok("...and it returns rather than falling through", /return;\}setEditDraft\(/.test(oe),
  "without the early return the draft is built anyway and the refusal is decorative");

// ---- 4. the stake, executed rather than asserted -------------------------------------------------
console.log("\n— the stake: what Save would PATCH if that gate were removed —");
const payAt = anchor(app, "if(uid){var f={bio:d.bio", "saveEdit's PATCH payload");
const paySrc = balanced(app, app.indexOf("{", payAt + "if(uid){var f=".length), "{", "}");
const draftSrc = balanced(app, app.indexOf("{", draftAt + oeAt + "setEditDraft(".length), "{", "}");
if (!paySrc || !draftSrc) { console.error("FAIL — could not balance a lifted expression; refusing to report."); process.exit(1); }

const weekOf = () => ["sat_am"];
const showRealName = true;                       // App state the draft literal closes over
const draftFrom = (ME) => eval("(" + draftSrc + ")");            // eslint-disable-line no-eval
const patchFrom = (d) => {                                        // eslint-disable-line no-eval
  const f = eval("(" + paySrc + ")");
  if (d.name && d.name.trim()) f.name = d.name.trim();
  if (d.username && d.username.trim()) f.username = d.username.trim();
  return f;
};
const REAL = { name: "Nathan Barber", username: "nathanclimbs", bio: "Cascades alpine, mostly.",
  location: "Salt Lake City, UT", level: "Advanced", disciplines: ["alpine", "trad"],
  sportGrade: "5.11a", tradGrade: "5.10c", boulderGrade: "V4", avatar: "n.png",
  availWeek: ["sat_am"], certifications: ["WFR"], skills: ["anchors"] };
// Exactly what the component holds when the read failed: the sign-in reset's values, untouched.
const UNREAD = { name: "", username: "", bio: "", location: "", level: undefined, disciplines: [],
  sportGrade: undefined, tradGrade: undefined, boulderGrade: undefined, avatar: "",
  availWeek: [], certifications: [], skills: [] };

const healthy = patchFrom(draftFrom(REAL));
const unread = patchFrom(draftFrom(UNREAD));
ok("CONTROL — a hydrated profile round-trips its own values",
  healthy.bio === REAL.bio && healthy.location === REAL.location && healthy.sport_grade === REAL.sportGrade,
  "the lift is wrong, not the app — re-anchor before believing anything above");
const wiped = Object.entries(unread)
  .filter(([, v]) => v === "" || v === null || (Array.isArray(v) && !v.length)).map(([k]) => k);
ok("the payload is still destructive, so the gate is still load-bearing", wiped.length > 0,
  "saveEdit no longer writes empty columns — if that is deliberate, this guard should be re-derived");
console.log(`        ${wiped.length} column(s) would be emptied: ${wiped.join(", ")}`);

console.log(fail
  ? `\ncheck:profile-edit-gate FAILED — ${fail} assertion(s). See the header for the chain.`
  : "\nok — a failed profile read is reportable, recorded, and refused before the editor opens.");
process.exitCode = fail ? 1 : 0;
