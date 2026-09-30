import { shoutedFragments } from "../../lib/shouted-prose.mjs";
const cases = [
  ["THE SINGLE STRONGEST TEST IS THAT YOU NEVER CROSS THE GLACIER.", true],
  ["simul-climbing to a TOWER AT ABOUT 8,200 FT, then ONE RAPPEL off it", true],
  ["it NARROWS as it climbs", true],
  ["NO GO above the notch", true],
  ["From the Rainy Pass PCT trailhead via SR-20 and FR 5100, call NWAC or USFS.", false],
  ["BASE jumpers use this face; carry a SPOT or inReach. NEWS-SEWS notch.", false],
  ["Grade III, 5.9, 7:30 AM - 4:00 PM, US-2 east of WA.", false],
  ["The single strongest test is that you never cross the glacier.", false],
];
let bad = 0;
for (const [s, want] of cases) { const got = shoutedFragments(s).length > 0; if (got !== want) { bad++; console.log("WRONG", want, JSON.stringify(s), shoutedFragments(s)); } }
console.log(bad ? `${bad} wrong` : `all ${cases.length} cases right`);
process.exit(bad ? 1 : 0);
