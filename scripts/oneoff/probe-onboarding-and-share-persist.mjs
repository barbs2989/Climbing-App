// TWO ACTIONS THAT CHANGED THE SCREEN AND WROTE NOTHING.
//
// Both are the FORK shape: a second path that sets the same state as a correct one and never
// learned to persist. Same as the trip report's connect button (#1569) and "Remove friend" (#1563).
//
//   ONBOARDING  collects home area, disciplines and three grades -- every one of which HAS a
//               profiles column and IS read back by the sign-in hydration -- and only called
//               setProfile. saveEdit has always written exactly these fields. So "You're all set"
//               was true until the next reload, on the FIRST thing a new climber does.
//   SHARE ROUTE pushed the message into local `msgs` and nowhere else, so the climber you shared a
//               route with never received it -- while sendMsg() does the optimistic push AND the
//               sendDirectMessage write AND the honest demo copy.
//
// SOURCE, not render: both are handlers on components mounted deep inside App, needing a session
// and a live profile row to reach their own write branch, and SSR cannot click. What source proves
// is every link a stale-base squash takes one of.
import fs from "node:fs";

const src = fs.readFileSync("ClimbMatch.jsx", "utf8");
let fails = 0;
const ok = (m) => console.log("  ok    " + m);
const bad = (m) => { console.log("  FAIL  " + m); fails++; };

// ---- ONBOARDING -------------------------------------------------------------------------------
const at = src.indexOf("onFinish={pr=>{");
if (at < 0) { console.error("ANCHOR LOST: Onboarding's onFinish was renamed or removed."); process.exit(1); }
const body = src.slice(at, src.indexOf("}}", src.indexOf("setHelpOpen", at)) + 2);
if (body.length < 400) { console.error(`FAIL-CLOSED: onFinish slice is ${body.length} chars.`); process.exit(1); }
ok(`located onFinish (${body.length} chars)`);

for (const [needle, why] of [
  ["saveProfile(uid,{location:pr.homeArea,disciplines:pr.disciplines,sport_grade:pr.sportGrade||null,trad_grade:pr.tradGrade||null,boulder_grade:pr.boulderGrade||null})",
   "onboarding writes the five fields that have columns, with saveEdit's own mapping"],
  ["if(uid){saveProfile", "the write is gated on a session — saveProfile needs a uid"],
  ["Saved on this device — cloud sync failed, will retry next edit", "a failed sync says so, in saveEdit's words"],
]) {
  if (body.includes(needle)) ok(why); else bad(`${why} — missing \`${needle.slice(0, 60)}…\``);
}
// homeArea is the `location` column; there is no home-area column, and inventing one is not a fix.
if (/homeArea:/.test(body) && !/location:pr\.homeArea/.test(body)) bad("homeArea is written to a column that does not exist");
else ok("homeArea goes to `location`, the column Onboarding seeds that field from");
// SIGNED OUT THERE IS NO WRITE, so the toast must not claim one. check:claims flagged exactly this
// when the write was added, which is the guard working on my own change.
if (/"Profile updated"\+\(uid\?"":" on this device — sign in to keep it"\)/.test(body))
  ok("signed out, the toast says the change is local only");
else bad("the toast claims a save that cannot have happened when signed out");

// ---- SHARE A ROUTE ----------------------------------------------------------------------------
const sh = src.indexOf("onShareRoute={(r,c)=>{");
if (sh < 0) { console.error("ANCHOR LOST: onShareRoute was renamed or removed."); process.exit(1); }
// SLICE BY BALANCING BRACES, NOT BY ANCHORING ON THE FIX'S OWN TEXT. An end anchor of
// `sendMsg(c.id` means the slice only exists once the fix is in — so reverting the defect made
// this probe fail CLOSED ("slice is 0 chars") instead of naming what was wrong. A probe that can
// only see its own fix cannot describe the defect it exists for.
const shBody = (() => {
  let d = 0, q = null;
  for (let i = src.indexOf("{", sh); i < src.length; i++) {
    const c = src[i];
    if (q) { if (c === "\\") i++; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === "`") { q = c; continue; }
    if (c === "{") d++;
    else if (c === "}") { d--; if (!d) return src.slice(sh, i + 1); }
  }
  return "";
})();
if (shBody.length < 150) { console.error(`FAIL-CLOSED: onShareRoute slice is ${shBody.length} chars.`); process.exit(1); }

if (/sendMsg\(c\.id,"Check out this route: "/.test(shBody)) ok("sharing goes through sendMsg, which writes");
else bad("sharing does not call sendMsg");
if (/setMsgs\(/.test(shBody)) bad("it still pushes into local msgs itself — sendMsg already does that, so the message would double");
else ok("it no longer hand-rolls the local push");
// ORDER MATTERS: sendMsg toasts its own "not saved" / "demo profile" message, and a later toast
// would replace it. The share toast must come FIRST.
// Match the CALL, not the word: the comment inside this handler says "sendMsg()", and
// indexOf("sendMsg(") found that instead -- an assertion tripping on its own documentation.
const t = shBody.indexOf('showToast("Shared '), sm = shBody.indexOf('sendMsg(c.id,');
if (t >= 0 && sm > t) ok("the share toast fires before the send, so sendMsg's honest message wins");
else bad("the share toast would overwrite sendMsg's not-saved warning");

console.log(fails ? `\n${fails} FAILURE(S)` : "\nok — onboarding persists, and a shared route actually reaches the other climber");
process.exit(fails ? 1 : 0);
