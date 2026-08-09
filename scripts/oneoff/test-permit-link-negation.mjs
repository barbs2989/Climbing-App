// Both directions: an agency that is DISCLAIMED or merely PERIPHERAL must NOT produce a link,
// an asserted one MUST.
//
// This used to carry its own copy of PERMIT_NEG and _pmSays. It passed for exactly that
// reason — it tested the copy. The app's guard could be deleted outright and this stayed
// green, which is the same "a detector that cannot detect must not look clean" failure the
// column sweep had. It now lifts the real regexes and the real function out of
// RouteDetail.jsx by anchor, and dies with ANCHOR LOST rather than silently testing nothing.
import fs from "fs";

const SRC = fs.readFileSync(new URL("../../RouteDetail.jsx", import.meta.url), "utf8");
function lift(name) {
  const line = SRC.split("\n").find((l) => l.trimStart().startsWith("const " + name + "=/") || l.trimStart().startsWith("function " + name + "("));
  if (!line) { console.error(`ANCHOR LOST: ${name} not found in RouteDetail.jsx — nothing below was actually checked.`); process.exit(1); }
  return line.trim();
}
const src = [lift("PERMIT_NEG"), lift("PERMIT_PERIPHERAL"), lift("_pmSays")].join("\n");
const _pmSays = new Function(src + "\nreturn _pmSays;")();

const CASES = [
  // [text, regex, expected, label]
  ["mt. baker-snoqualmie national forest (snoqualmie ranger district) none required. none — no climbing fee (national forest wilderness, not mount rainier np)", /rainier/g, false, "Red Mountain — Rainier only in a disclaimer"],
  ["mount rainier national park. climbing permit required for travel above 10,000 ft.", /rainier/g, true, "a real Rainier route"],
  ["okanogan-wenatchee nf. enchantment permit area: overnight stays require a quota permit.", /enchantment/g, true, "a real Enchantment route"],
  ["north cascades national park complex. free backcountry permit required.", /north cascades/g, true, "a real North Cascades route"],
  ["okanogan-wenatchee national forest, not north cascades np", /north cascades/g, false, "North Cascades disclaimed"],
  ["not north cascades np. enchantment permit area lottery applies; enchantment quota in force.", /enchantment/g, true, "affirmative mention sharing a string with a disclaimer"],
  ["no rainier permit. rainier climbing permits are required above camp muir.", /rainier/g, true, "second mention is affirmative"],
  ["", /rainier/g, false, "empty haystack"],
  // PERIPHERAL — the live Mt. Baker Ranger District boilerplate on 108 routes.
  ["mt. baker-snoqualmie national forest (mt. baker ranger district) — mount baker wilderness, with some upper routes crossing into north cascades national park", /north cascades/g, false, "Forest Service route that merely crosses into the park"],
  ["olympic national forest (hood canal ranger district) — the brothers wilderness; the summit sits on the boundary with olympic national park.", /olympic national park/g, false, "summit on the boundary with the park"],
  ["okanogan-wenatchee national forest, adjacent to north cascades national park", /north cascades/g, false, "adjacent to the park"],
  // ...but a peripheral mention must not suppress a LATER affirmative one.
  ["mount baker wilderness, with some upper routes crossing into north cascades national park. north cascades national park backcountry permit required for camping.", /north cascades/g, true, "peripheral first, affirmative second"],
  // ...and must not swallow the genuinely Park-Service-managed routes.
  ["national park service — north cascades national park (stephen mather wilderness)", /north cascades/g, true, "NPS is the primary manager"],
  ["national park service — olympic national park (olympic wilderness)", /olympic national park/g, true, "Olympic NP is the primary manager"],
];
let bad = 0;
for (const [hay, re, want, label] of CASES) {
  const got = _pmSays(hay, re);
  const ok = got === want;
  if (!ok) bad++;
  console.log((ok ? "  ok    " : "  FAIL  ") + label + `  (want ${want}, got ${got})`);
}
console.log(`\n${CASES.length} cases, ${bad} failed`);
process.exit(bad ? 1 : 0);
