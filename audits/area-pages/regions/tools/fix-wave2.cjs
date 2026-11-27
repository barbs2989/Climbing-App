// Hand fixes to wave 2 (r007-r012) after review of each agent's unsure-sentence list, 2026-11-26.
const fs = require("fs"), path = require("path");
const D = path.join(__dirname, "..");
const fixes = {
  "batch-r007.json": {
    ca_los_angeles_basin: [[", and Stoney Point is the in-town bouldering and short-route playground.", "."]],
    wa_leavenworth: [["Tumwater Canyon, above the Wenatchee River, holds long trad faces, while most of the rest sits up Icicle Creek,", "Much of the climbing sits up Icicle Creek,"]],
  },
  "batch-r010.json": {
    ca_yosemite_valley: [["is the glacier-shaped heart of", "is the heart of"], [", while the Lower Merced River Canyon adds lower-elevation crags along the river below the valley floor.", ", and the Lower Merced River Canyon adds more."], [" Expect crowds and slick, polished rock on popular lines.", ""]],
    ca_western_sierra: [["on the western slope of the Sierra Nevada, from the foothill bluffs near Millerton and Tollhouse up to high forest domes and down to the Kern River valley.", "on the western slope of the Sierra Nevada."]],
    vt_1_northern_vermont: [["from the Burlington side of the state across the Green Mountains to the cold Northeast Kingdom", "from the Burlington area to the Northeast Kingdom"]],
  },
  "batch-r011.json": { ut_indian_creek: [["Red sandstone cliffs, a hard-wearing layer of Wingate, are split", "Red Wingate sandstone cliffs are split"]] },
  "batch-r012.json": { wy_lander_area: [["Sinks Canyon, at roughly 6,500 feet, shifts from sandstone to limestone to granite within a few miles and can be climbed", "Sinks Canyon, at roughly 6,500 feet, can be climbed"]] },
};
for (const [f, ids] of Object.entries(fixes)) {
  const p = path.join(D, f), b = JSON.parse(fs.readFileSync(p, "utf8"));
  for (const [id, reps] of Object.entries(ids)) for (const [a, c] of reps) {
    if (!b[id].blurb.includes(a)) throw new Error(`${f} ${id}: not found: ${a}`);
    b[id].blurb = b[id].blurb.replace(a, c);
  }
  fs.writeFileSync(p, JSON.stringify(b, null, 1) + "\n");
}
// Nine Mile Hill: neither fetched page names it (both are about Unaweep Canyon) -> skip.
const p7 = path.join(D, "batch-r007.json"), b7 = JSON.parse(fs.readFileSync(p7, "utf8"));
if (b7.co_nine_mile_hill) { delete b7.co_nine_mile_hill; b7._skipped = { ...(b7._skipped || {}), co_nine_mile_hill: "both fetched pages describe Unaweep Canyon; neither names Nine Mile Hill" }; fs.writeFileSync(p7, JSON.stringify(b7, null, 1) + "\n"); }
console.log("fixed");
