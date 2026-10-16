// WHERE does the red-tape data render? The columns are read (grep proves that), but a route
// page can read a field and scatter it across four tabs, which is a different product from a
// section a climber can look at before a trip.
//
// Static: reads RouteDetail.jsx and reports, for each access/permit key, the nearest preceding
// UPPERCASE heading and the nearest preceding tab gate. Approximate by design — it is a map to
// read, not a verdict.
import fs from "fs";

const s = fs.readFileSync("RouteDetail.jsx", "utf8");
const KEYS = ["land_manager", "landManager", "parking_pass", "passRequired", "group_limit", "closures", "permitZone", "permitUrl", "fees"];

for (const key of KEYS) {
  const re = new RegExp(key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g");
  const seen = new Set();
  let m;
  while ((m = re.exec(s))) {
    const back = s.slice(Math.max(0, m.index - 2000), m.index);
    const heads = [...back.matchAll(/>\s*([A-Z][A-Z0-9 &@'’.-]{3,40})\s*</g)];
    const tabs = [...back.matchAll(/tab\s*===\s*"(\w+)"/g)];
    const label = `${heads.length ? heads[heads.length - 1][1].trim() : "(no heading)"}  [tab: ${tabs.length ? tabs[tabs.length - 1][1] : "?"}]`;
    seen.add(label);
  }
  console.log(`${key.padEnd(14)} ${[...seen].join("   ||   ") || "(no occurrences)"}`);
}
