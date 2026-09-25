// Read-only: routes whose OWN approach uses a road closed after the Dec 2025 storm, but whose
// access.closures says nothing about that road.
import { requireServiceKey, selectAll } from "../lib/supabase-env.mjs";
const key = requireServiceKey();
const rows = await selectAll("routes", "id,name,approach,waypoints,access", "id=like.wa_*", { key, pageSize: 1000 });
const short = s => String(s || "").replace(/\s+/g, " ").trim();
const ROADS = [
  ["suiattle", /suiattle|downey creek|sulphur creek|milk creek|fr[- ]?26\b|fs[- ]?26\b/i, /suiattle|fr[- ]?26|fs[- ]?26/i],
  ["whitechuck", /white chuck|rat trap|fr[- ]?23\b|fsr[- ]?23\b/i, /white chuck|fr[- ]?23|fsr[- ]?23/i],
  ["chiwawa", /chiwawa|phelps creek|trinity|little giant|fr[- ]?6200|fr[- ]?6211|spider meadow/i, /chiwawa|6200|atkinson/i],
];
const out = [];
for (const r of rows) {
  const ths = (r.waypoints || []).filter(w => /trailhead/i.test(w.type || ""));
  const own = (r.approach || "") + " " + ths.map(w => w.name + " " + (w.note || "")).join(" ");
  const clo = short((r.access || {}).closures);
  for (const [k, use, said] of ROADS) if (use.test(own) && !said.test(clo)) {
    out.push({ road: k, id: r.id, name: r.name, th: ths.map(w => w.name), closures: clo, approach: short(r.approach).slice(0, 400) });
    console.log(k.padEnd(11), r.id.padEnd(52), "| TH:", ths.map(w => w.name).join("; ").slice(0, 70), "| clo:", clo.slice(0, 70));
  }
}
if (process.argv[2]) (await import("node:fs")).writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
console.log(out.length, "gaps");
