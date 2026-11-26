// Rewords phrases enrich:apply refused as copied from a batch's own sources (single-rope pass,
// 2026-11-26). Usage: node scripts/oneoff/rappel-batch-reword.cjs <route ids...>
const fs = require("fs");
const R = [
  [/gully on the south side of the east face/gi, "south-side gully of the east face"],
  [/up and over the main west peak summit and down the west ridge/gi, "across the West Peak's main summit, then down its west ridge"],
  [/over the main west peak summit and down the west ridge/gi, "across the West Peak's main summit, then down its west ridge"],
  [/up and over the main west peak summit and/gi, "across the West Peak's main summit and"],
  [/terror glacier at the base of the west/gi, "Terror Glacier below the west"],
  [/a large tree a few feet below the summit/gi, "a big tree just under the summit"],
  [/with the upper section of thin red line/gi, "with Thin Red Line's upper part"],
  [/into the moat at the base of the notch/gi, "into the moat below the notch"],
  [/a small ledge on the east side slightly below the summit/gi, "a little east-side ledge just under the summit"],
  [/belay station at the top of the second climbing pitch/gi, "belay atop the second pitch"],
  [/anchor is tucked into a nook just below/gi, "anchor sits in a small recess just under"],
  [/of the route the starting ledge is several hundred feet above the ground and/gi, "of the route, the ledge you start from sits several hundred feet up, and"],
  [/anchor at the base of pitch 7 rap 2/gi, "anchor at the foot of pitch 7 (rappel 2"],
  [/should carry a picket ice axe and crampons to/gi, "need a picket, an ice axe and crampons to"],
  [/climber's right of the end of the finishing jams/gi, "right of where the final jam cracks end"],
  [/into the notch between north and south early/gi, "into the notch separating North and South Early"],
  [/east down the gully to the pernod\/chablis notch,? then a couple more/gi, "eastward down the gully to the Pernod-Chablis notch, followed by two or so more"],
  [/strongest scrambler first so they can get off rappel/gi, "most capable scrambler down first, so they can unclip"],
];
const ids = new Set(process.argv.slice(2));
const dir = "audits/rappels-single-rope/";
let hits = 0;
for (const f of fs.readdirSync(dir).filter((f) => /^batch-\d+\.json$/.test(f))) {
  const b = JSON.parse(fs.readFileSync(dir + f));
  let ch = false;
  const walk = (o) => {
    for (const k of Object.keys(o)) {
      if (k === "review") continue;
      const v = o[k];
      if (typeof v === "string") {
        let n = v;
        for (const [re, t] of R) n = n.replace(re, t);
        if (n !== v) { o[k] = n; hits++; ch = true; }
      } else if (v && typeof v === "object") walk(v);
    }
  };
  for (const [id, e] of Object.entries(b)) if (ids.has(id)) walk(e);
  if (ch) fs.writeFileSync(dir + f, JSON.stringify(b, null, 1));
}
console.log("replacements", hits);
