// Does a partner card say "1 vouch", or "1 vouches"?
//
// Seen on CI's own ui-screens capture: "27 catches · 74 climbs · 1 vouches". The three stat chips
// carry a fixed plural in a tuple and render `st[1]+" "+st[2]`, so 1 catch, 1 climb and 1 vouch
// all read wrong. The app already singularises in 59 other places, so these were the outlier.
//
// "catches" -> "catch", so the singulars are DECLARED rather than derived: dropping a trailing "s"
// gives "catche". This lifts the tuple AND the render expression out of the source rather than
// retyping them -- a copy would agree with itself whatever the app did, which is the question.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
let bad = 0;
const ok = (m) => console.log("  ok   " + m);
const fail = (m) => { bad++; console.log("  FAIL " + m); };
const dead = (m) => { console.error("\nBROKEN PROBE: " + m); process.exit(2); };

const src = fs.readFileSync(path.join(ROOT, "ClimbMatchCore.jsx"), "utf8");

// 1. the three chips, lifted
const T = /\[\["shield",c\.catchLedger\.totalCatches,"(\w+)","(\w+)"\],\["mountain",c\.routesLogged,"(\w+)","(\w+)"\],\["award",c\.communityVouches,"(\w+)","(\w+)"\]\]/.exec(src);
if (!T) dead("the stat-chip tuple is not in ClimbMatchCore.jsx in the expected shape — ANCHOR LOST");
const chips = [[T[1], T[2]], [T[3], T[4]], [T[5], T[6]]];

// 2. the render expression, lifted
const R = /\{st\[1\]\+" "\+\(([^)]+)\)\}/.exec(src);
if (!R) dead("the stat-chip label expression is not in the expected shape — ANCHOR LOST");
const label = new Function("st", "return st[1]+\" \"+(" + R[1] + ");");

console.log("\n1. a count of one reads as one\n");
for (const [plural, singular] of chips) {
  const one = label([null, 1, plural, singular]);
  if (one === "1 " + singular) ok(`1 ${singular}`);
  else fail(`a single ${singular} renders as "${one}"`);
}

console.log("\n2. ...and every other count still reads as a plural\n");
// Without this, a fix that singularised unconditionally passes section 1 outright.
for (const [plural, singular] of chips) {
  const zero = label([null, 0, plural, singular]);
  const two = label([null, 2, plural, singular]);
  if (zero === "0 " + plural && two === "2 " + plural) ok(`0 and 2 ${plural}`);
  else fail(`plurals broke: "${zero}" / "${two}"`);
}

console.log("\n3. each singular is actually a different word\n");
// A copy-paste that left the plural in both slots would satisfy everything above.
for (const [plural, singular] of chips) {
  if (singular && singular !== plural) ok(`${plural} -> ${singular}`);
  else fail(`"${plural}" declares "${singular}" as its singular — that is the same word`);
}

// Fail closed: the whole thing is vacuous if the tuple stopped carrying three chips.
if (chips.length === 3) ok("three chips parsed");
else fail("expected 3 stat chips, parsed " + chips.length);

console.log(bad ? `\nFAILED — ${bad}` : `\nok — a single catch, climb or vouch reads as one.\n`);
process.exit(bad ? 1 : 0);
