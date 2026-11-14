// Write REVIEWED route ids into research-data/link-ups/<file>.json.
//
//   node scripts/oneoff/link-ups/set-ids.mjs <decisions.json>
//
// decisions.json: { "<file>": { "<lu id>#<leg index>": "<route id>" | null, "<lu id>#also": ["<route id>", ...] } }
// A leg set to null is recorded as "the catalog holds no route for this leg" so resolve.mjs skips it.
// Every leg left without a decision is set to null too, once its file has been reviewed.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const decisions = JSON.parse(fs.readFileSync(process.argv[2], "utf8"));
for (const [file, dec] of Object.entries(decisions)) {
  const p = path.join(ROOT, "research-data/link-ups", file + ".json");
  const list = JSON.parse(fs.readFileSync(p, "utf8"));
  let set = 0;
  for (const lu of list) {
    if (lu.drop) continue;
    lu.legs.forEach((leg, i) => {
      const k = `${lu.id}#${i}`;
      if (k in dec) { leg.route_id = dec[k]; if (dec[k]) set++; }
      else if (leg.route_id === undefined) leg.route_id = null;
    });
    if (dec[`${lu.id}#also`]) lu.also_route_ids = dec[`${lu.id}#also`];
  }
  const unknown = Object.keys(dec).filter((k) => !list.some((lu) => k.startsWith(lu.id + "#")));
  if (unknown.length) throw new Error(`${file}: unknown keys ${unknown.join(", ")}`);
  fs.writeFileSync(p, JSON.stringify(list, null, 1) + "\n");
  console.log(`${file}: ${set} leg(s) given a route id`);
}
