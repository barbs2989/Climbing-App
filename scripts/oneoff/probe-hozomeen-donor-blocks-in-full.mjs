// Hozomeen has FOUR sibling road blocks and they describe DIFFERENT drives — the Silver-Skagit
// gravel road down from Hope BC to Hozomeen Campground, and SR-20 to Ross Lake Resort plus a water
// taxi to the Lightning Creek end. So "a sibling block exists" is worth nothing here; the two
// target routes start from different places and each needs the block for ITS start.
//
// The earlier listing truncated every field at 240 chars, and the match for the southwest route
// depends on text past that cut. Read them whole before choosing a donor.
import { selectAll } from "../lib/supabase-env.mjs";

const rows = await selectAll("routes", "id,name,road,approach", "area_id=eq.wa_hozomeen_mountain", { pageSize: 50 });
if (!rows.length) { console.error("FAIL — read zero routes on wa_hozomeen_mountain."); process.exit(1); }

for (const r of rows) {
  console.log(`\n${"=".repeat(96)}\n${r.id}  "${r.name}"`);
  if (!r.road) { console.log(`  road: (empty)   <-- a TARGET`); }
  else for (const [k, v] of Object.entries(r.road)) if (typeof v === "string" && v.trim()) console.log(`  ${k}:\n     ${v.trim()}`);
}

console.log(`\n${"=".repeat(96)}\n=== which donor names each target's own start? ===`);
const targets = [
  ["wa_hozomeen_mountain_south_peak_southwest_route", ["Hozomeen Campground", "Hozomeen Lake"]],
  ["wa_hozomeen_mountain_south_peak_southeast_buttress", ["Lightning Creek"]],
];
const leaves = (v, out = []) => {
  if (typeof v === "string") { if (v.trim()) out.push(v); return out; }
  if (Array.isArray(v)) { for (const x of v) leaves(x, out); return out; }
  if (v && typeof v === "object") { for (const x of Object.values(v)) leaves(x, out); return out; }
  return out;
};
for (const [tid, needles] of targets) {
  console.log(`\n${tid}  — its start names: ${needles.map((n) => `"${n}"`).join(", ")}`);
  for (const r of rows) {
    if (r.id === tid || !r.road) continue;
    const s = leaves(r.road).join(" ");
    const hit = needles.filter((n) => s.includes(n));
    console.log(`   ${hit.length ? "MATCH  " : "       "} ${r.id}${hit.length ? `  names ${hit.map((h) => `"${h}"`).join(", ")}` : ""}`);
  }
}
