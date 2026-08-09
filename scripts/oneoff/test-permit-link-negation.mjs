// Both directions: a disclaimed agency must NOT produce a link, an asserted one MUST.
const PERMIT_NEG=/\b(?:not|no|outside|other than|isn'?t|aren'?t|rather than|instead of|unlike|excluding|except|nor)\b[^.;]{0,40}$/i;
function _pmSays(hay,re){if(!hay)return false;re.lastIndex=0;var m;while((m=re.exec(hay))!==null){if(!PERMIT_NEG.test(hay.slice(Math.max(0,m.index-60),m.index)))return true;if(m.index===re.lastIndex)re.lastIndex++;}return false;}

const CASES = [
  // [text, regex, expected, label]
  ["mt. baker-snoqualmie national forest (snoqualmie ranger district) none required. none — no climbing fee (national forest wilderness, not mount rainier np)", /rainier/g, false, "Red Mountain — Rainier only in a disclaimer"],
  ["mount rainier national park. climbing permit required for travel above 10,000 ft.", /rainier/g, true, "a real Rainier route"],
  ["okanogan-wenatchee nf. enchantment permit area: overnight stays require a quota permit.", /enchantment/g, true, "a real Enchantment route"],
  ["north cascades national park complex. free backcountry permit required.", /north cascades/g, true, "a real North Cascades route"],
  ["okanogan-wenatchee national forest, not north cascades np", /north cascades/g, false, "North Cascades disclaimed"],
  // the reason it is per-occurrence, not per-string
  ["not north cascades np. enchantment permit area lottery applies; enchantment quota in force.", /enchantment/g, true, "affirmative mention sharing a string with a disclaimer"],
  ["no rainier permit. rainier climbing permits are required above camp muir.", /rainier/g, true, "second mention is affirmative"],
  ["", /rainier/g, false, "empty haystack"],
];
let bad = 0;
for (const [hay, re, want, label] of CASES) {
  const got = _pmSays(hay, re);
  const ok = got === want;
  if (!ok) bad++;
  console.log((ok ? "  ok    " : "  FAIL  ") + label + `  (want ${want}, got ${got})`);
}
// and prove the OLD behaviour was wrong on case 1
console.log("\nold naive test on Red Mountain's text:", /rainier/.test(CASES[0][0]), "<- this is the bug");
process.exit(bad ? 1 : 0);
