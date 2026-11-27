// Hand fixes to wave 1 (r001-r006) after review, 2026-11-26.
const fs = require("fs"), path = require("path");
const D = path.join(__dirname, "..");
const fixes = {
  "batch-r002.json": { co_south_platte: [["Turkey Rocks is known for crack climbing. ", ""]] },
  "batch-r003.json": {
    wa_centralwest: [["The catalog is split fairly evenly between bouldering, sport and trad", "Bouldering, sport and trad come in roughly equal shares"]],
    co_grand_junction_area: [["Bouldering makes up most of the catalog, with", "Most of the climbing here is bouldering, with"]],
    ut_central_wasatch: [["Trad is the biggest discipline in the catalog, followed by", "Trad is the biggest discipline, followed by"]],
    ut_southeast_utah: [["The catalog is dominated by trad, mostly crack climbing,", "Trad dominates, mostly crack climbing,"]],
    ky_red_river_gorge: [["Sport dominates the catalog, with", "Sport dominates, with"], [" Cooler, drier months suit the rock best, as summer is hot and humid.", ""]],
    ca_bishop_area: [["Bouldering is the largest part of the catalog, spread over", "Bouldering is the biggest draw, spread over"], [" The rock on the lowlands is volcanic tuff, so expect textured, positive holds.", ""]],
  },
  "batch-r006.json": { ca_san_francisco_bay_area: [["Bouldering makes up more than half of what is recorded, with", "Bouldering makes up more than half of the climbing, with"]] },
};
for (const [f, ids] of Object.entries(fixes)) {
  const p = path.join(D, f), b = JSON.parse(fs.readFileSync(p, "utf8"));
  for (const [id, reps] of Object.entries(ids)) for (const [a, c] of reps) {
    if (!b[id].blurb.includes(a)) throw new Error(`${f} ${id}: not found: ${a}`);
    b[id].blurb = b[id].blurb.replace(a, c);
  }
  fs.writeFileSync(p, JSON.stringify(b, null, 1) + "\n");
}
console.log("fixed");
